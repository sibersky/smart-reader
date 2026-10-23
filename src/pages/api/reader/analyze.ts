// src/pages/api/reader/analyze.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '15mb',
    },
  },
};

export interface WordAnnotation {
  token: string;
  lemma: string;
  cefrLevel: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  partOfSpeech: string;
  definition: string;
  definitionEn?: string;
  translationL1: string;
}

export interface AnalyzeResult {
  detectedLanguage: string;
  extractedText: string;
  totalWords: number;
  aboveLevelCount: number;
  percentKnown: number;
  annotations: WordAnnotation[];
}

type ApiResponse =
  | { success: true; data: AnalyzeResult }
  | { success: false; error: string; details?: string };

function sanitizeErrorMessage(err: Error | null): { errorCode: string; userMessage: string } {
  const raw = (err?.message || '').toString();
  if (
    raw.includes('429') ||
    raw.includes('quota') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('rate-limit') ||
    raw.includes('limit: 5')
  ) {
    return {
      errorCode: 'RATE_LIMIT',
      userMessage: 'The language engine is temporarily busy. Please wait 15–20 seconds and try again.',
    };
  }
  if (
    raw.includes('503') ||
    raw.includes('UNAVAILABLE') ||
    raw.includes('high demand')
  ) {
    return {
      errorCode: 'HIGH_DEMAND',
      userMessage: 'The service is experiencing temporary high demand. Please try again in a few moments.',
    };
  }
  return {
    errorCode: 'SERVER_BUSY',
    userMessage: 'Could not complete text analysis at this moment. Please try again.',
  };
}

function safeExtractJSON(raw: string): AnalyzeResult {
  if (!raw || !raw.trim()) {
    throw new Error('AI engine returned an empty text response.');
  }

  try {
    return JSON.parse(raw.trim());
  } catch {
    const stripped = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/g, '')
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('Could not parse structured JSON from AI output: ' + raw.slice(0, 150));
    }
  }
}

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
      imageMimeType = 'image/png',
      targetLanguage = 'auto',
      targetLevel = 'B1',
      l1Language = 'Russian',
    } = req.body;

    if (!text && !imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either text or an uploaded image to analyze.',
      });
    }

    const langInstruction =
      targetLanguage && targetLanguage !== 'auto'
        ? `The target language of the text is ${targetLanguage}.`
        : `Automatically detect the language of the text (e.g. Spanish, English, German, French, etc.).`;

    const promptInstructions = `You are a certified lexicographer and CEFR language educator.
${langInstruction}
The user is a language learner at CEFR level ${targetLevel}.
Native language for translations (L1): ${l1Language}.

Tasks:
1. If an image is provided, perform OCR to extract the original text cleanly in its source language. If text is provided, use that text.
2. Detect language (e.g. "Spanish", "English", "French").
3. Identify all vocabulary, idioms, or expressions that are ABOVE level ${targetLevel} (e.g. for A2, highlight B1, B2, C1, C2; for B1, highlight B2, C1, C2).
4. Annotate unique above-level items (maximum 30 most relevant items):
   - "token": exact string as it appears in the text
   - "lemma": base dictionary form
   - "cefrLevel": 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
   - "partOfSpeech": e.g. "verb", "noun", "adj.", "idiom"
   - "definition": concise 1-sentence definition (under 15 words) in the TARGET LANGUAGE of the text (in Spanish for Spanish text, in English for English text, etc.).
   - "definitionEn": same definition in the target language.
   - "translationL1": natural contextual translation into ${l1Language}.
5. Calculate statistics: totalWords, aboveLevelCount, percentKnown.

Return strict JSON only matching this format:
{
  "detectedLanguage": "English",
  "extractedText": "...",
  "totalWords": 0,
  "aboveLevelCount": 0,
  "percentKnown": 0,
  "annotations": [
    {
      "token": "...",
      "lemma": "...",
      "cefrLevel": "B1",
      "partOfSpeech": "...",
      "definition": "...",
      "definitionEn": "...",
      "translationL1": "..."
    }
  ]
}`;

    const geminiKey = process.env.GEMINI_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;
    const mistralKey = process.env.MISTRAL_API_KEY;

    let parsedResult: AnalyzeResult | null = null;
    let lastError: Error | null = null;

    // 1. Google Gemini via @google/genai (Single fast attempt)
    if (geminiKey) {
      console.log('🤖 Calling Google Gemini (gemini-3.8-flash)...');
      try {
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
          const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
          contentsParts.push({
            inlineData: {
              mimeType: imageMimeType || 'image/png',
              data: cleanBase64,
            },
          });
        }

        if (text) {
          contentsParts.push({
            text: `Source text to read:\n\n${text}`,
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
            temperature: 0.15,
          },
        });

        const raw = response.text;
        if (raw && raw.trim()) {
          parsedResult = safeExtractJSON(raw);
        }
      } catch (e: unknown) {
        const err = e as Error;
        console.warn('Gemini primary attempt error:', err?.message || e);
        lastError = err;
      }
    }

    // 2. Immediate OpenAI Fallback (gpt-4o-mini - fast and reliable)
    if (!parsedResult && openaiKey) {
      console.log('🤖 Falling back to OpenAI (gpt-4o-mini)...');
      try {
        const client = new OpenAI({ apiKey: openaiKey });
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content: 'You are a certified lexicographer and CEFR language educator. Always output valid JSON.',
          },
        ];

        const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
          { type: 'text', text: promptInstructions },
        ];

        if (imageBase64) {
          userContent.push({
            type: 'image_url',
            image_url: {
              url: imageBase64.startsWith('data:')
                ? imageBase64
                : `data:${imageMimeType || 'image/png'};base64,${imageBase64}`,
            },
          });
        }

        if (text) {
          userContent.push({
            type: 'text',
            text: `Source text:\n\n${text}`,
          });
        }

        messages.push({ role: 'user', content: userContent });

        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages,
          response_format: { type: 'json_object' },
          temperature: 0.15,
        });

        const raw = completion.choices[0]?.message?.content?.trim();
        if (raw) {
          parsedResult = safeExtractJSON(raw);
        }
      } catch (e: unknown) {
        const err = e as Error;
        console.error('OpenAI fallback error:', err);
        lastError = err;
      }
    }

    // 3. Immediate Mistral Fallback (text only)
    if (!parsedResult && mistralKey && text) {
      console.log('🤖 Falling back to Mistral AI...');
      try {
        const client = new OpenAI({
          apiKey: mistralKey,
          baseURL: 'https://api.mistral.ai/v1',
        });

        const completion = await client.chat.completions.create({
          model: process.env.MISTRAL_MODEL || 'open-mistral-7b',
          messages: [
            {
              role: 'system',
              content: 'You are an expert multilingual CEFR lexicographer. Output strictly valid JSON.',
            },
            {
              role: 'user',
              content: `${promptInstructions}\n\nSource text:\n${text}`,
            },
          ],
          temperature: 0.15,
        });

        const raw = completion.choices[0]?.message?.content?.trim();
        if (raw) {
          parsedResult = safeExtractJSON(raw);
        }
      } catch (e: unknown) {
        const err = e as Error;
        console.error('Mistral fallback error:', err);
        lastError = err;
      }
    }

    if (!parsedResult) {
      if (lastError) {
        throw lastError;
      }
      throw new Error(
        'AI engine returned an empty response. Please check your API keys or try again in a few moments.'
      );
    }

    // Sanitize and ensure definitions are aligned
    parsedResult.extractedText = parsedResult.extractedText || text || '';
    parsedResult.annotations = Array.isArray(parsedResult.annotations)
      ? parsedResult.annotations.map((ann) => {
          const def = ann.definition || ann.definitionEn || '';
          return {
            ...ann,
            definition: def,
            definitionEn: def,
          };
        })
      : [];
    parsedResult.totalWords =
      parsedResult.totalWords || parsedResult.extractedText.split(/\s+/).filter(Boolean).length || 1;
    parsedResult.aboveLevelCount = parsedResult.annotations.length;
    parsedResult.percentKnown =
      parsedResult.percentKnown ??
      Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((parsedResult.totalWords - parsedResult.aboveLevelCount) / parsedResult.totalWords) * 100
          )
        )
      );
    parsedResult.detectedLanguage = parsedResult.detectedLanguage || targetLanguage || 'Spanish';

    return res.status(200).json({
      success: true,
      data: parsedResult,
    });
  } catch (err: unknown) {
    const error = err as Error;
    console.error('[API /api/reader/analyze] Error:', error?.message || error);
    const { errorCode, userMessage } = sanitizeErrorMessage(error);
    const statusCode = errorCode === 'RATE_LIMIT' ? 429 : 500;
    return res.status(statusCode).json({
      success: false,
      error: userMessage,
      details: userMessage,
    });
  }
}
