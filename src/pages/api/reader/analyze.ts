// src/pages/api/reader/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '12mb',
    },
  },
};

export interface WordAnnotation {
  token: string;
  lemma: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  partOfSpeech: string;
  definitionEn: string;
  translationL1: string;
}

export interface AnalyzeResult {
  extractedText: string;
  totalWords: number;
  aboveLevelCount: number;
  percentKnown: number;
  annotations: WordAnnotation[];
}

type ApiResponse =
  | { success: true; data: AnalyzeResult }
  | { success: false; error: string; details?: string };

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ApiResponse>
) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const {
      text,
      imageBase64,
      imageMimeType,
      targetLevel = 'B1',
      l1Language = 'Russian',
    } = req.body;

    if (!text && !imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either text or an uploaded image to analyze.',
      });
    }

    const promptInstructions = `You are an expert lexicographer and CEFR language educator.
The user is learning English.
Their current mastery level is CEFR ${targetLevel}.
Their native language (L1) is ${l1Language}.

Tasks:
1. If an image is provided, perform high-precision OCR to extract the English text cleanly, keeping paragraph breaks intact. If text is provided, use that text.
2. Analyze all vocabulary in the text.
3. Identify all words, idioms, or phrasal verbs that are ABOVE the user's level (i.e. if user is ${targetLevel}, identify items at higher levels: e.g. for B1 identify B2, C1, and C2; for B2 identify C1 and C2; for A2 identify B1, B2, C1, C2; for C1 identify C2 and rare idioms).
4. For each identified above-level word/phrase:
   - "token": exact string as it appears in the text
   - "lemma": dictionary base form
   - "cefrLevel": assigned CEFR level ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
   - "partOfSpeech": e.g. "verb", "noun", "adj.", "idiom", "phrasal verb"
   - "definitionEn": concise, crystal-clear definition in simple English matching this exact context
   - "translationL1": natural, accurate contextual translation into ${l1Language}
5. Calculate statistics:
   - "totalWords": total number of words in the text
   - "aboveLevelCount": count of identified above-level words
   - "percentKnown": approximate percentage of known words ((totalWords - aboveLevelCount) / totalWords * 100) rounded to integer.

Return ONLY a valid JSON object matching this schema:
{
  "extractedText": "string",
  "totalWords": 0,
  "aboveLevelCount": 0,
  "percentKnown": 0,
  "annotations": [
    {
      "token": "string",
      "lemma": "string",
      "cefrLevel": "B2",
      "partOfSpeech": "string",
      "definitionEn": "string",
      "translationL1": "string"
    }
  ]
}`;

    // 1. Google Gemini via @google/genai
    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const mistralKey = process.env.MISTRAL_API_KEY;

    let jsonRaw: string | undefined;

    if (geminiKey) {
      console.log('🤖 Analyzing text/image with Google Gemini 3.8 Flash...');
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const contentsParts: Array<Record<string, unknown>> = [];

      if (imageBase64) {
        // Strip data:image/...;base64, prefix if present
        const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
        contentsParts.push({
          inlineData: {
            mimeType: imageMimeType || 'image/jpeg',
            data: cleanBase64,
          },
        });
      }

      if (text) {
        contentsParts.push({
          text: `Text to analyze:\n\n${text}`,
        });
      }

      contentsParts.push({
        text: promptInstructions,
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: { parts: contentsParts } as unknown as string,
        config: {
          responseMimeType: 'application/json',
          temperature: 0.2,
        },
      });

      jsonRaw = response.text;
    }
    // 2. OpenAI Fallback
    else if (openaiKey) {
      console.log('🤖 Analyzing text/image with OpenAI gpt-4o-mini...');
      const client = new OpenAI({ apiKey: openaiKey });

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: 'You are an expert language education and CEFR analysis API. Always respond in valid JSON.',
        },
      ];

      const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [{ type: 'text', text: promptInstructions }];

      if (imageBase64) {
        userContent.push({
          type: 'image_url',
          image_url: {
            url: imageBase64.startsWith('data:')
              ? imageBase64
              : `data:${imageMimeType || 'image/jpeg'};base64,${imageBase64}`,
          },
        });
      }

      if (text) {
        userContent.push({
          type: 'text',
          text: `Text to analyze:\n\n${text}`,
        });
      }

      messages.push({ role: 'user', content: userContent });

      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.2,
      });

      jsonRaw = completion.choices[0]?.message?.content?.trim();
    }
    // 3. Mistral Fallback (text only)
    else if (mistralKey) {
      console.log('🤖 Analyzing text with Mistral AI...');
      if (!text && imageBase64) {
        throw new Error(
          'Image OCR requires GEMINI_API_KEY or OPENAI_API_KEY. Please paste text directly or configure GEMINI_API_KEY in Vercel.'
        );
      }

      const client = new OpenAI({
        apiKey: mistralKey,
        baseURL: 'https://api.mistral.ai/v1',
      });

      const completion = await client.chat.completions.create({
        model: process.env.MISTRAL_MODEL || 'open-mistral-7b',
        messages: [
          { role: 'system', content: 'You are an expert CEFR lexicographer. Output strictly valid JSON.' },
          { role: 'user', content: `${promptInstructions}\n\nText:\n${text}` },
        ],
        temperature: 0.2,
      });

      jsonRaw = completion.choices[0]?.message?.content?.trim();
    } else {
      throw new Error(
        'No AI API key found. Please set GEMINI_API_KEY or OPENAI_API_KEY in your Vercel project environment variables.'
      );
    }

    if (!jsonRaw) {
      throw new Error('AI engine returned an empty response.');
    }

    // Clean up code block ticks if any
    const cleanJson = jsonRaw
      .replace(/^```json/i, '')
      .replace(/^```/i, '')
      .replace(/```$/, '')
      .trim();

    const parsed: AnalyzeResult = JSON.parse(cleanJson);

    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[API /api/reader/analyze] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze text',
      details: error?.message || 'An unexpected error occurred during linguistic analysis.',
    });
  }
}
