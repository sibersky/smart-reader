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
  definitionEn: string;
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

// Helper to safely extract and parse JSON from LLM output
function safeExtractJSON(raw: string): AnalyzeResult {
  if (!raw || !raw.trim()) {
    throw new Error('AI engine returned an empty text response.');
  }

  // 1. Direct parse attempt
  try {
    return JSON.parse(raw.trim());
  } catch {
    // 2. Remove markdown code blocks
    const stripped = raw
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```\s*$/g, '')
      .trim();
    try {
      return JSON.parse(stripped);
    } catch {
      // 3. Extract JSON object via regex matching outermost braces
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
      targetLanguage = 'auto', // "Spanish", "English", "auto", "German", etc.
      targetLevel = 'B1',
      l1Language = 'Russian',
    } = req.body;

    if (!text && !imageBase64) {
      return res.status(400).json({
        success: false,
        error: 'Please provide either text or an uploaded image to analyze.',
      });
    }

    const languageInstruction =
      targetLanguage && targetLanguage !== 'auto'
        ? `The target language of the text is ${targetLanguage}.`
        : `Automatically detect the language of the text (e.g. Spanish, English, German, French, etc.).`;

    const promptInstructions = `You are an expert multilingual lexicographer and CEFR language educator.
${languageInstruction}
The user is a language learner at CEFR level ${targetLevel}.
The user's native language for translations and explanations (L1) is ${l1Language}.

Tasks:
1. If an image is provided, perform high-precision OCR to extract the original text cleanly in its original source language, preserving paragraph breaks. If text is provided, use that text.
2. Detect and state the language of the text (e.g. "Spanish", "English", "German", "French").
3. Analyze all vocabulary in the text according to standard CEFR scale for that language (A1, A2, B1, B2, C1, C2).
4. Identify all words, idioms, or expressions that are ABOVE the student's mastery level (${targetLevel}):
   - If user is A1: highlight A2, B1, B2, C1, C2
   - If user is A2: highlight B1, B2, C1, C2
   - If user is B1: highlight B2, C1, C2 (borderline B2, advanced C1/C2)
   - If user is B2: highlight C1, C2
   - If user is C1: highlight C2 and rare idiomatic expressions
5. For each above-level word or expression:
   - "token": exact string as it appears in the text (e.g. "senectud")
   - "lemma": dictionary base form (e.g. "senectud")
   - "cefrLevel": assigned CEFR level ('A1', 'A2', 'B1', 'B2', 'C1', 'C2')
   - "partOfSpeech": e.g. "verb", "noun", "adj.", "idiom"
   - "definitionEn": concise, crystal-clear definition (in simple English or simple target language matching this exact context)
   - "translationL1": natural, accurate contextual translation into ${l1Language} (e.g. Russian)
6. Statistics:
   - "totalWords": total word count of the extracted text
   - "aboveLevelCount": count of identified above-level items
   - "percentKnown": approximate percentage of known words (Math.round(((totalWords - aboveLevelCount) / totalWords) * 100))

Return ONLY a valid JSON object matching this schema:
{
  "detectedLanguage": "Spanish",
  "extractedText": "...",
  "totalWords": 0,
  "aboveLevelCount": 0,
  "percentKnown": 0,
  "annotations": [
    {
      "token": "...",
      "lemma": "...",
      "cefrLevel": "B2",
      "partOfSpeech": "...",
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

    // 1. Google Gemini via @google/genai (Primary Engine)
    if (geminiKey) {
      console.log('🤖 Attempting analysis with Google Gemini (gemini-3.8-flash)...');
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

      // Retry loop for temporary 503 high demand or network hiccups
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: { parts: contentsParts } as unknown as string,
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          const raw = response.text;
          if (raw && raw.trim()) {
            parsedResult = safeExtractJSON(raw);
            break;
          }
        } catch (e: unknown) {
          const err = e as Error;
          console.warn(`[Gemini attempt ${attempt}/3] error:`, err?.message || e);
          lastError = err;
          if (attempt < 3) {
            // Wait 1.2s before retry
            await new Promise((r) => setTimeout(r, 1200));
          }
        }
      }
    }

    // 2. OpenAI Fallback (gpt-4o-mini)
    if (!parsedResult && openaiKey) {
      console.log('🤖 Falling back to OpenAI (gpt-4o-mini)...');
      try {
        const client = new OpenAI({ apiKey: openaiKey });
        const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          {
            role: 'system',
            content:
              'You are an expert multilingual lexicographer and CEFR language educator. Always respond in valid JSON.',
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
          temperature: 0.2,
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

    // 3. Mistral Fallback (text only)
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
          temperature: 0.2,
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

    // Sanitize results
    parsedResult.extractedText = parsedResult.extractedText || text || '';
    parsedResult.annotations = Array.isArray(parsedResult.annotations)
      ? parsedResult.annotations
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
    console.error('[API /api/reader/analyze] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze text',
      details: error?.message || 'An unexpected error occurred during linguistic analysis.',
    });
  }
}
