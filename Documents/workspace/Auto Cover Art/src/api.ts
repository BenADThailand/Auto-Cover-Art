const getApiKey = () => import.meta.env.VITE_GEMINI_KEY as string;

/**
 * Enhance an image using Gemini gemini-3.1-flash-image-preview (Nano Banana).
 * Sends the image as inline base64 with a text prompt and returns the enhanced base64 image.
 */
export async function enhanceImage(
  base64Image: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GEMINI_KEY is not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        parts: [
          { text: prompt || 'Enhance this photo: make it more vivid and professional' },
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ],
      },
    ],
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE'],
    },
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini image API error: ${res.status} — ${err}`);
  }

  const json = await res.json();
  const parts = json.candidates?.[0]?.content?.parts;
  if (!parts) throw new Error('No response parts from Gemini');

  // Find the image part in the response
  const imagePart = parts.find(
    (p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData
  );
  if (!imagePart?.inlineData?.data) {
    throw new Error('No image returned from Gemini');
  }

  return imagePart.inlineData.data;
}

/**
 * Generate a keyword from report content using Gemini gemini-2.0-flash.
 */
export async function generateKeyword(
  reportContent: string,
  existingKeywords: string[],
  userPrompt: string = ''
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GEMINI_KEY is not set');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const existing =
    existingKeywords.length > 0
      ? `Already used keywords: ${existingKeywords.join(', ')}. Do NOT repeat these.`
      : '';

  const body = {
    contents: [
      {
        parts: [
          {
            text: `From the following report content, extract ONE short keyword or phrase (2-6 Chinese characters) that would work well as cover art text for a real estate marketing image. ${userPrompt ? `Focus on: ${userPrompt}. ` : ''}${existing}

Report content:
${reportContent}

Reply with ONLY the keyword, nothing else.`,
          },
        ],
      },
    ],
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini keyword API error: ${res.status} — ${err}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No keyword returned from Gemini');
  return text.trim();
}

import type { GenerateAllResult } from './types';

const GEMINI_TEXT_URL = (apiKey: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

async function callGeminiText(prompt: string): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GEMINI_KEY is not set');
  const res = await fetch(GEMINI_TEXT_URL(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} — ${err}`);
  }
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No text returned from Gemini');
  return text.trim();
}

export async function generateSubjectLine(
  reportContent: string,
  userPrompt?: string,
  charLimit: number = 50
): Promise<string> {
  return callGeminiText(
    `From the following report content, generate ONE compelling subject line for a social media post about this real estate property. ${userPrompt ? `Focus on: ${userPrompt}. ` : ''}Keep it under ${charLimit} characters, in Chinese.\n\nReport content:\n${reportContent}\n\nReply with ONLY the subject line, nothing else.`
  );
}

export async function generateContentBody(
  reportContent: string,
  userPrompt?: string
): Promise<string> {
  return callGeminiText(
    `From the following report content, write a short engaging social media post body (2-3 sentences) about this real estate property. ${userPrompt ? `Focus on: ${userPrompt}. ` : ''}Write in Chinese.\n\nReport content:\n${reportContent}\n\nReply with ONLY the post body, nothing else.`
  );
}

export async function generateHashtags(
  reportContent: string,
  userPrompt?: string,
  maxCount: number = 8
): Promise<string> {
  return callGeminiText(
    `From the following report content, generate up to ${maxCount} relevant hashtags for a social media post about this real estate property. ${userPrompt ? `Focus on: ${userPrompt}. ` : ''}Use Chinese hashtags. Separate with spaces.\n\nReport content:\n${reportContent}\n\nReply with ONLY the hashtags separated by spaces, nothing else.`
  );
}

export async function generateAllContent(
  reportContent: string,
  layers: { id: number; aiPrompt: string }[],
  contentPrompt: string = '',
  options?: { subjectLineLimit?: number; hashtagCount?: number }
): Promise<GenerateAllResult> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GEMINI_KEY is not set');

  const layerDesc = layers
    .map((l) => {
      const focus = l.aiPrompt || contentPrompt || 'general';
      return `  - Layer ${l.id} (focus: ${focus})`;
    })
    .join('\n');

  const directionLine = contentPrompt
    ? `\nOverall direction/tone: ${contentPrompt}\n`
    : '';

  const prompt = `From the following report content about a real estate property, generate ALL of the following in one response as JSON:
${directionLine}
1. "subjectLine": A compelling subject line for a social media post (under ${options?.subjectLineLimit ?? 50} chars, Chinese)
2. "contentBody": A short engaging post body (2-3 sentences, Chinese)
3. "hashtags": up to ${options?.hashtagCount ?? 8} relevant hashtags separated by spaces (Chinese)
4. "keywords": An array of objects with "layerId" (number) and "text" (2-6 Chinese characters keyword for cover art)

Layers that need keywords:
${layerDesc}

Each keyword should be unique and different from the others.

Report content:
${reportContent}

Reply with ONLY valid JSON matching this schema:
{
  "subjectLine": "string",
  "contentBody": "string",
  "hashtags": "string",
  "keywords": [{"layerId": number, "text": "string"}]
}`;

  const res = await fetch(GEMINI_TEXT_URL(apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API error: ${res.status} — ${err}`);
  }

  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from Gemini');
  return JSON.parse(text) as GenerateAllResult;
}
