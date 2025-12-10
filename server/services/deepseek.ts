/**
 * AI Service for Hansard Analysis
 * Uses Google Gemini API for document analysis with retry logic
 * Integration: javascript_gemini
 */

import { GoogleGenAI } from "@google/genai";

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const AI_MODEL = "google/gemini-2.0-flash-exp:free";
const GROQ_MODEL = "llama-3.3-70b-versatile"; // Free Groq model

const ai = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

export interface TopicAnalysisResult {
  topic: string;
  relevance: number;
  keywords: string[];
}

export interface SentimentAnalysisResult {
  overallSentiment: string;
  sentimentScore: number;
  confidence: number;
  keyPoints: Array<{ point: string; sentiment: string }>;
}

export interface SpeakerInsight {
  mpId: string;
  mpName: string;
  topicsDiscussed: string[];
  sentiment: string;
  keyArguments: string[];
}

export interface DetailedSummaryResult {
  keyArguments: string[];
  decisions: string[];
  actionItems: string[];
  controversialPoints: string[];
  summary: string;
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      const isRateLimit = error.message?.includes('429') || error.message?.includes('rate limit');
      
      if (isRateLimit && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[AI] Rate limited, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      } else if (!isRateLimit) {
        throw error;
      }
    }
  }
  
  throw lastError;
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  if (!ai) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    config: {
      systemInstruction: systemPrompt,
      responseMimeType: "application/json",
    },
    contents: userPrompt,
  });

  const content = response.text;
  if (!content) {
    throw new Error("No content in Gemini response");
  }

  return JSON.parse(content);
}

async function callOpenRouter(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://myparliament.my",
      "X-Title": "MyParliament Dashboard",
    },
    body: JSON.stringify({
      model: AI_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[OpenRouter] API error:", errorText);
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  return JSON.parse(content);
}

async function callGroq(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  if (!GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY not configured");
  }

  const response = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Groq] API error:", errorText);
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in Groq response");
  }

  return JSON.parse(content);
}

async function callAI(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  // Try providers in order: Gemini -> OpenRouter -> Groq
  const providers = [
    { name: "Gemini", key: GEMINI_API_KEY, fn: callGemini },
    { name: "OpenRouter", key: OPENROUTER_API_KEY, fn: callOpenRouter },
    { name: "Groq", key: GROQ_API_KEY, fn: callGroq },
  ];

  const availableProviders = providers.filter(p => p.key);

  if (availableProviders.length === 0) {
    throw new Error("No AI provider configured. Set GEMINI_API_KEY, OPENROUTER_API_KEY, or GROQ_API_KEY in .env file");
  }

  // Try each provider in sequence until one succeeds
  for (const provider of availableProviders) {
    try {
      console.log(`[AI] Trying ${provider.name} API`);
      return await callWithRetry(async () => provider.fn(systemPrompt, userPrompt));
    } catch (error) {
      console.error(`[AI] ${provider.name} failed:`, error);
      // If this is the last provider, throw the error
      if (provider === availableProviders[availableProviders.length - 1]) {
        throw error;
      }
      // Otherwise, try the next provider
      console.log(`[AI] Falling back to next provider...`);
    }
  }

  throw new Error("All AI providers failed");
}

export async function extractTopics(
  transcript: string,
  speakerNames: string[]
): Promise<TopicAnalysisResult[]> {
  try {
    const systemPrompt = `You are an expert at analyzing Malaysian parliamentary debates (Hansard).
Extract the main topics discussed in this parliamentary session.
For each topic, provide:
1. A clear topic name
2. Relevance score (0-100)
3. Key keywords related to the topic

You must respond with valid JSON matching this structure:
{
  "topics": [
    {"topic": "string", "relevance": number, "keywords": ["string"]}
  ]
}`;

    const userPrompt = `Analyze this parliamentary debate transcript and extract the main topics.

Speakers involved: ${speakerNames.join(', ')}

Transcript:
${transcript.substring(0, 50000)}`;

    const result = await callAI(systemPrompt, userPrompt);
    return result.topics || [];
  } catch (error) {
    console.error("[AI] Error in topic extraction:", error);
    throw new Error(`Failed to extract topics: ${error}`);
  }
}

export async function analyzeSentiment(
  transcript: string
): Promise<SentimentAnalysisResult> {
  try {
    const systemPrompt = `You are an expert at analyzing sentiment in Malaysian parliamentary debates.
Analyze the overall sentiment and key emotional points in this debate.

Provide:
1. Overall sentiment (positive/negative/neutral/mixed)
2. Sentiment score (0-100, where 0 is very negative, 50 is neutral, 100 is very positive)
3. Confidence level (0-100)
4. Key points with their sentiment

You must respond with valid JSON matching this structure:
{
  "overallSentiment": "string",
  "sentimentScore": number,
  "confidence": number,
  "keyPoints": [{"point": "string", "sentiment": "string"}]
}`;

    const userPrompt = `Analyze the sentiment of this parliamentary debate:

${transcript.substring(0, 50000)}`;

    const result = await callAI(systemPrompt, userPrompt);
    return result;
  } catch (error) {
    console.error("[AI] Error in sentiment analysis:", error);
    throw new Error(`Failed to analyze sentiment: ${error}`);
  }
}

export async function analyzeSpeakers(
  transcript: string,
  speakers: Array<{ mpId: string; mpName: string }>
): Promise<SpeakerInsight[]> {
  try {
    const systemPrompt = `You are an expert at analyzing Malaysian parliamentary debates.
Analyze what each speaker discussed, their sentiment, and key arguments.

For each speaker, provide:
1. Topics they discussed
2. Their overall sentiment
3. Their key arguments

You must respond with valid JSON matching this structure:
{
  "speakers": [
    {
      "mpId": "string",
      "mpName": "string",
      "topicsDiscussed": ["string"],
      "sentiment": "string",
      "keyArguments": ["string"]
    }
  ]
}`;

    const speakerList = speakers.map(s => `- ${s.mpName} (ID: ${s.mpId})`).join('\n');
    const userPrompt = `Analyze what each speaker discussed in this parliamentary debate.

Speakers:
${speakerList}

Transcript:
${transcript.substring(0, 50000)}`;

    const result = await callAI(systemPrompt, userPrompt);
    return result.speakers || [];
  } catch (error) {
    console.error("[AI] Error in speaker analysis:", error);
    throw new Error(`Failed to analyze speakers: ${error}`);
  }
}

export async function generateDetailedSummary(
  transcript: string,
  language: "en" | "ms" = "en"
): Promise<DetailedSummaryResult> {
  try {
    const languageInstruction = language === "ms"
      ? "Respond in Bahasa Malaysia (Malay language)"
      : "Respond in English";

    const systemPrompt = `You are an expert at summarizing Malaysian parliamentary debates (Hansard).
${languageInstruction}.

Provide a detailed analysis with:
1. Key arguments made
2. Decisions or votes taken
3. Action items or next steps
4. Controversial or debated points
5. Overall summary

You must respond with valid JSON matching this structure:
{
  "keyArguments": ["string"],
  "decisions": ["string"],
  "actionItems": ["string"],
  "controversialPoints": ["string"],
  "summary": "string"
}`;

    const userPrompt = `Provide a detailed summary of this parliamentary debate:

${transcript.substring(0, 50000)}`;

    const result = await callAI(systemPrompt, userPrompt);
    return result;
  } catch (error) {
    console.error("[AI] Error in detailed summary:", error);
    throw new Error(`Failed to generate detailed summary: ${error}`);
  }
}

export async function answerQuestion(
  question: string,
  context: string
): Promise<{ answer: string; relevanceScore: number }> {
  try {
    const systemPrompt = `You are an expert assistant for Malaysian parliamentary debates (Hansard).
Answer questions based on the provided transcript context.

Provide:
1. A clear, concise answer
2. A relevance score (0-100) indicating how well the context addresses the question

You must respond with valid JSON matching this structure:
{
  "answer": "string",
  "relevanceScore": number
}`;

    const userPrompt = `Question: ${question}

Context from parliamentary debate:
${context.substring(0, 40000)}`;

    const result = await callAI(systemPrompt, userPrompt);
    return result;
  } catch (error) {
    console.error("[AI] Error in Q&A:", error);
    throw new Error(`Failed to answer question: ${error}`);
  }
}

export async function generateTopicSummary(
  topicName: string,
  transcript: string
): Promise<{
  summary: string;
  keyPoints: string[];
  speakers: string[];
  quotes: string[];
}> {
  try {
    const systemPrompt = `You are an expert at analyzing Malaysian parliamentary debates (Hansard).
Analyze what was discussed about a specific topic and provide a focused summary.

You must respond with valid JSON matching this structure:
{
  "summary": "A 2-3 sentence summary of what was discussed about this topic",
  "keyPoints": ["key point 1", "key point 2", "key point 3"],
  "speakers": ["Name of MP 1", "Name of MP 2"],
  "quotes": ["notable quote 1", "notable quote 2"]
}`;

    const userPrompt = `Topic: ${topicName}

Analyze what was discussed about "${topicName}" in this parliamentary debate.
Focus only on content related to this specific topic.

Transcript:
${transcript.substring(0, 50000)}`;

    const result = await callAI(systemPrompt, userPrompt);

    // Validate and sanitize the response
    const sanitized = {
      summary: typeof result.summary === 'string' ? result.summary : '',
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints.filter((p: any) => typeof p === 'string') : [],
      speakers: Array.isArray(result.speakers) ? result.speakers.filter((s: any) => typeof s === 'string') : [],
      quotes: Array.isArray(result.quotes) ? result.quotes.filter((q: any) => typeof q === 'string') : [],
    };

    return sanitized;
  } catch (error) {
    console.error("[AI] Error in topic summary:", error);
    throw new Error(`Failed to generate topic summary: ${error}`);
  }
}

export function isDeepSeekConfigured(): boolean {
  return !!(GEMINI_API_KEY || OPENROUTER_API_KEY || GROQ_API_KEY);
}

export function isGeminiConfigured(): boolean {
  return !!GEMINI_API_KEY;
}
