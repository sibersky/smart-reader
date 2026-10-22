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
  definition: string; // Definition in the TARGET language (e.g. Spanish for Spanish text, English for English text)
  definitionEn?: string; // backwards compatibility alias
  translationL1: string; // Translation in student's native language (e.g. Russian)
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
The user is a language learner currently at CEFR level ${targetLevel}.
The user's native language for translations (L1) is ${l1Language}.

===========================
PEDAGOGICAL CEFR CALIBRATION RULES (CRITICAL):
===========================
1. Be sensitive and thorough. Do NOT underestimate vocabulary difficulty.
2. In official CEFR guidelines (including Plan Curricular del Instituto Cervantes - PCIC for Spanish, Cambridge for English, Goethe for German):
   - A1/A2 is STRICTLY limited to elementary survival vocabulary (e.g. basic pronouns, numbers, concrete physical objects, elementary verbs like ir, comer, ver, hablar, tener, ser, estar, querer, hacer).
   - B1 (Threshold) includes intermediate cognitive, communicative, reporting, opinion, and subjunctive verbs and abstract nouns.
     * Examples in Spanish: "sugerir", "admitir", "advertir", "afirmar", "asegurar", "rechazar", "exigir", "convencer", "reconocer", "desarrollar", "establecer", "conseguir", "proponer", "plantear", "comprobar", "impedir", "evitar", "suponer", "pretender", "lograr", "apreciar", "destacar", "complejo".
     * Therefore, for an A2 student, words like "sugerir" (B1) and "admitir" (B1/B2) ARE ABOVE LEVEL and MUST BE HIGHLIGHTED!
   - B2 (Vantage) includes nuanced discourse connectors, formal terms, idioms, abstract concepts:
     * Examples: "desempeñar", "abarcar", "prescindir", "suscitar", "constatar", "imprescindible", "paulatino", "a raíz de".
   - C1/C2 (Proficient) includes literary, specialized, and advanced vocabulary:
     * Examples: "senectud", "amparar", "soslayar", "vislumbrar", "fidedigno", "desmoronar".
3. HIGHLIGHTING RULE:
   - Identify and annotate ALL words, idioms, or expressions that are ABOVE the user's level (${targetLevel}).
   - If user is A1: highlight A2, B1, B2, C1, C2.
   - If user is A2: highlight B1, B2, C1, C2 (Make sure words like "sugerir", "admitir", "desarrollar" are flagged as B1/B2).
   - If user is B1: highlight B2, C1, C2.
   - If user is B2: highlight C1, C2.
   - If user is C1: highlight C2 and rare idioms.

===========================
LANGUAGE OF DEFINITION & TRANSLATION (CRITICAL):
===========================
1. "definition": MUST BE WRITTEN IN THE TARGET LANGUAGE OF THE TEXT!
   - If the text is Spanish, the definition MUST be in clear, accessible SPANISH (e.g., for "sugerir": "Proponer o recomendar una idea a alguien para que la considere."). NEVER write definitions in English for Spanish texts!
   - If the text is English, the definition MUST be in English.
   - If the text is German, the definition MUST be in German.
   - If the text is French, the definition MUST be in French.
2. "translationL1": MUST be written in the student's native language (${l1Language}, e.g. Russian: for "sugerir" -> "предлагать, советовать").

===========================
OUTPUT SCHEMA (STRICT JSON ONLY):
===========================
{
  "detectedLanguage": "Spanish",
  "extractedText": "exact full text of the article or excerpt",
  "totalWords": 0,
  "aboveLevelCount": 0,
  "percentKnown": 0,
  "annotations": [
    {
      "token": "sugerir",
      "lemma": "sugerir",
      "cefrLevel": "B1",
      "partOfSpeech": "verbo",
      "definition": "Proponer o aconsejar una idea o plan para que alguien lo considere.",
      "definitionEn": "Proponer o aconsejar una idea o plan para que alguien lo considere.",
      "translationL1": "предлагать, советовать"
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

      // Try gemini models with retry
      const models = ['gemini-3.8-flash', 'gemini-flash-latest'];
      for (const m of models) {
        if (parsedResult) break;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            console.log(`[Gemini] model=${m} attempt=${attempt}`);
            const response = await ai.models.generateContent({
              model: m,
              contents: { parts: contentsParts } as unknown as string,
              config: {
                responseMimeType: 'application/json',
                temperature: 0.15,
              },
            });

            const raw = response.text;
            if (raw && raw.trim()) {
              parsedResult = safeExtractJSON(raw);
              break;
            }
          } catch (e: unknown) {
            const err = e as Error;
            console.warn(`[Gemini ${m} attempt ${attempt}/3] error:`, err?.message || e);
            lastError = err;
            if (attempt < 3) {
              await new Promise((r) => setTimeout(r, 1200));
            }
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

    // Sanitize and ensure definition and definitionEn are always synchronized
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
    console.error('[API /api/reader/analyze] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to analyze text',
      details: error?.message || 'An unexpected error occurred during linguistic analysis.',
    });
  }
}
