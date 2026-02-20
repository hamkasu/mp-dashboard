/**
 * AI Service for Hansard Analysis
 * Uses multiple AI providers with fallback, caching, and key rotation
 * Integration: javascript_gemini
 */

import { GoogleGenAI } from "@google/genai";
import crypto from "crypto";

// API Keys - Support multiple Gemini keys for rotation (comma-separated)
const GEMINI_API_KEYS = (process.env.GEMINI_API_KEY || "").split(",").map(k => k.trim()).filter(Boolean);
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;
const CLOUDFLARE_API_KEY = process.env.CLOUDFLARE_API_KEY;
const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const CEREBRAS_API_KEY = process.env.CEREBRAS_API_KEY;
const SAMBANOVA_API_KEY = process.env.SAMBANOVA_API_KEY;

// API Base URLs
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const TOGETHER_BASE_URL = "https://api.together.xyz/v1";
const CLOUDFLARE_BASE_URL = "https://api.cloudflare.com/client/v4/accounts";
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const CEREBRAS_BASE_URL = "https://api.cerebras.ai/v1";
const SAMBANOVA_BASE_URL = "https://api.sambanova.ai/v1";

// Model configurations
const AI_MODEL = "google/gemini-2.0-flash-lite:free";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const TOGETHER_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
const CLOUDFLARE_MODEL = "@cf/meta/llama-3.1-8b-instruct";
const ANTHROPIC_MODEL = "claude-3-5-sonnet-20240620";
const CEREBRAS_MODEL = "llama-3.3-70b";
const SAMBANOVA_MODEL = "Meta-Llama-3.1-8B-Instant";

// Gemini key rotation state
let currentGeminiKeyIndex = 0;
const geminiInstances: GoogleGenAI[] = GEMINI_API_KEYS.map(key => new GoogleGenAI({ apiKey: key }));

// AI Response Cache with LRU eviction
interface CacheEntry {
  response: any;
  createdAt: number;
  lastAccessed: number;
  ttl: number;
}

const aiCache = new Map<string, CacheEntry>();
const DEFAULT_CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours
const MAX_CACHE_SIZE = 1000;

function generateCacheKey(systemPrompt: string, userPrompt: string): string {
  const hash = crypto.createHash("sha256");
  hash.update(systemPrompt + "||" + userPrompt);
  return hash.digest("hex");
}

function getCachedResponse(cacheKey: string): any | null {
  const entry = aiCache.get(cacheKey);
  if (!entry) return null;
  
  if (Date.now() - entry.createdAt > entry.ttl) {
    aiCache.delete(cacheKey);
    return null;
  }
  
  // Update last accessed time for LRU
  entry.lastAccessed = Date.now();
  
  console.log(`[AI Cache] Hit for key ${cacheKey.substring(0, 8)}...`);
  return entry.response;
}

function setCachedResponse(cacheKey: string, response: any, ttl: number = DEFAULT_CACHE_TTL): void {
  // Evict least recently used entry if cache is full
  if (aiCache.size >= MAX_CACHE_SIZE) {
    let lruKey: string | null = null;
    let lruTime = Infinity;
    
    const entries = Array.from(aiCache.entries());
    for (let i = 0; i < entries.length; i++) {
      const [key, entry] = entries[i];
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }
    
    if (lruKey) {
      aiCache.delete(lruKey);
      console.log(`[AI Cache] Evicted LRU entry ${lruKey.substring(0, 8)}...`);
    }
  }
  
  const now = Date.now();
  aiCache.set(cacheKey, {
    response,
    createdAt: now,
    lastAccessed: now,
    ttl,
  });
  console.log(`[AI Cache] Stored response for key ${cacheKey.substring(0, 8)}...`);
}

export function clearAICache(): void {
  aiCache.clear();
  console.log("[AI Cache] Cleared all cached responses");
}

export function getAICacheStats(): { size: number; maxSize: number } {
  return { size: aiCache.size, maxSize: MAX_CACHE_SIZE };
}

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

export interface ThematicSection {
  title: string;
  overview: string;
  keyPoints: Array<{
    heading: string;
    detail: string;
  }>;
}

export interface ComprehensiveAnalysisResult {
  introduction: string;
  sections: ThematicSection[];
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: any): { retryable: boolean; reason: string } {
  const message = error.message || '';
  const status = error.status;

  // Auth/billing errors should never be retried — skip to next provider immediately
  if (status === 401 || status === 402 || status === 403 ||
      message.includes('401') || message.includes('402') || message.includes('403') ||
      message.includes('credits exhausted') || message.includes('unauthorized') ||
      message.includes('forbidden')) {
    return { retryable: false, reason: 'auth/billing error' };
  }

  if (status === 429 || message.includes('429') || message.includes('rate limit')) {
    return { retryable: true, reason: 'rate limited' };
  }
  if (status === 503 || message.includes('503') || message.includes('overloaded') || message.includes('UNAVAILABLE')) {
    return { retryable: true, reason: 'overloaded' };
  }
  if (status === 502 || message.includes('502')) {
    return { retryable: true, reason: 'bad gateway' };
  }
  if (status === 504 || message.includes('504') || message.includes('timeout')) {
    return { retryable: true, reason: 'timeout' };
  }

  return { retryable: false, reason: '' };
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
      const { retryable, reason } = isRetryableError(error);
      
      if (retryable && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt);
        console.log(`[AI] ${reason}, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await sleep(delay);
      } else if (!retryable) {
        throw error;
      }
    }
  }
  
  throw lastError;
}

async function callGeminiWithKeyRotation(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  if (geminiInstances.length === 0) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const keysToTry = geminiInstances.length;
  let lastError: Error | null = null;

  for (let keyAttempt = 0; keyAttempt < keysToTry; keyAttempt++) {
    const keyIndex = currentGeminiKeyIndex;
    const ai = geminiInstances[keyIndex];
    console.log(`[AI] Using Gemini key ${keyIndex + 1}/${geminiInstances.length}`);
    currentGeminiKeyIndex = (currentGeminiKeyIndex + 1) % geminiInstances.length;

    try {
      const model = ai.getGenerativeModel({ 
        model: "gemini-2.0-flash-lite",
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 8000,
        }
      });

      const fullPrompt = `${systemPrompt}\n\n${userPrompt}`;
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      const content = response.text();

      if (!content) {
        throw new Error("No content in Gemini response");
      }

      return JSON.parse(content);
    } catch (error: any) {
      lastError = error;
      const { retryable, reason } = isRetryableError(error);
      
      if (retryable && keyAttempt < keysToTry - 1) {
        console.log(`[AI] Gemini key ${keyIndex + 1} ${reason}, trying next key...`);
        await sleep(500); // Brief delay before trying next key
        continue;
      }
      
      // If not retryable or no more keys to try, throw the error
      throw error;
    }
  }

  throw lastError || new Error("All Gemini keys failed");
}

async function callGemini(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  return callGeminiWithKeyRotation(systemPrompt, userPrompt);
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
      model: "google/gemini-2.0-flash-lite-001",
      messages: [
        { role: "system", content: systemPrompt + "\n\nYou must respond with valid JSON only." },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[OpenRouter] API error:", errorText);
    if (response.status === 402) {
      throw new Error("OpenRouter API credits exhausted. Please top up your OpenRouter account or configure an alternative AI provider.");
    }
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenRouter response");
  }

  // Handle potential markdown wrapping
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (e) {
      console.error("[OpenRouter] JSON parse error after match:", e);
    }
  }

  try {
    return JSON.parse(content);
  } catch (e) {
    console.error("[OpenRouter] Final JSON parse error:", e);
    throw new Error("Failed to parse AI response as JSON");
  }
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
      max_tokens: 8000,
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

async function callTogether(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  if (!TOGETHER_API_KEY) {
    throw new Error("TOGETHER_API_KEY not configured");
  }

  const response = await fetch(`${TOGETHER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOGETHER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TOGETHER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Together] API error:", errorText);
    throw new Error(`Together API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in Together response");
  }

  return JSON.parse(content);
}

async function callCloudflare(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  if (!CLOUDFLARE_API_KEY || !CLOUDFLARE_ACCOUNT_ID) {
    throw new Error("CLOUDFLARE_API_KEY or CLOUDFLARE_ACCOUNT_ID not configured");
  }

  const response = await fetch(
    `${CLOUDFLARE_BASE_URL}/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${CLOUDFLARE_MODEL}`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CLOUDFLARE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt + "\n\nYou must respond with valid JSON only." },
          { role: "user", content: userPrompt }
        ],
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Cloudflare] API error:", errorText);
    throw new Error(`Cloudflare API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.result?.response;

  if (!content) {
    throw new Error("No content in Cloudflare response");
  }

  // Cloudflare doesn't support JSON mode, so we need to extract JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("No valid JSON found in Cloudflare response");
  }

  return JSON.parse(jsonMatch[0]);
}

async function callCerebras(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  if (!CEREBRAS_API_KEY) {
    throw new Error("CEREBRAS_API_KEY not configured");
  }

  const response = await fetch(`${CEREBRAS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CEREBRAS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: CEREBRAS_MODEL,
      messages: [
        { role: "system", content: systemPrompt + "\n\nYou must respond with valid JSON only." },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: "json_object" }
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Cerebras] API error:", errorText);
    throw new Error(`Cerebras API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in Cerebras response");
  }

  return JSON.parse(content);
}

async function callSambaNova(
  systemPrompt: string,
  userPrompt: string
): Promise<any> {
  if (!SAMBANOVA_API_KEY) {
    throw new Error("SAMBANOVA_API_KEY not configured");
  }

  const response = await fetch(`${SAMBANOVA_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${SAMBANOVA_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: SAMBANOVA_MODEL,
      messages: [
        { role: "system", content: systemPrompt + "\n\nYou must respond with valid JSON only." },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.3,
      max_tokens: 8000,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[SambaNova] API error:", errorText);
    throw new Error(`SambaNova API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in SambaNova response");
  }

  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (e) {
      console.error("[SambaNova] JSON parse error after match:", e);
    }
  }

  return JSON.parse(content);
}

async function callAnthropic(
  systemPrompt: string,
  userPrompt: string,
  maxTokens: number = 8000
): Promise<any> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const response = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: [
        { role: "user", content: userPrompt }
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("[Anthropic] API error:", errorText);
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("No content in Anthropic response");
  }

  // Claude may wrap JSON in markdown code blocks, extract it
  const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || content.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch {
      // If JSON parsing fails, try to parse the whole content
      return JSON.parse(content);
    }
  }

  return JSON.parse(content);
}

export function isAnthropicConfigured(): boolean {
  return !!ANTHROPIC_API_KEY;
}

export async function callAI(
  systemPrompt: string,
  userPrompt: string,
  useCache: boolean = true,
  excludeProviders: string[] = []
): Promise<any> {
  // Check cache first
  const cacheKey = generateCacheKey(systemPrompt, userPrompt);
  if (useCache) {
    const cachedResponse = getCachedResponse(cacheKey);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // Provider configuration with priority order
  const providers = [
    { name: "Gemini", key: GEMINI_API_KEYS.length > 0, fn: callGemini },
    { name: "OpenRouter", key: !!OPENROUTER_API_KEY, fn: callOpenRouter },
    { name: "Groq", key: !!GROQ_API_KEY, fn: callGroq },
    { name: "Cerebras", key: !!CEREBRAS_API_KEY, fn: callCerebras },
    { name: "Together", key: !!TOGETHER_API_KEY, fn: callTogether },
    { name: "SambaNova", key: !!SAMBANOVA_API_KEY, fn: callSambaNova },
    { name: "Cloudflare", key: !!(CLOUDFLARE_API_KEY && CLOUDFLARE_ACCOUNT_ID), fn: callCloudflare },
  ];

  const availableProviders = providers.filter(p => p.key && !excludeProviders.includes(p.name));

  if (availableProviders.length === 0) {
    throw new Error("No AI provider configured. Set at least one of: GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, CEREBRAS_API_KEY, TOGETHER_API_KEY, SAMBANOVA_API_KEY, or CLOUDFLARE_API_KEY");
  }

  // Try each provider in sequence until one succeeds
  const providerErrors: string[] = [];
  for (const provider of availableProviders) {
    try {
      console.log(`[AI] Trying ${provider.name} API`);
      const result = await callWithRetry(async () => provider.fn(systemPrompt, userPrompt));

      // Cache successful response
      if (useCache) {
        setCachedResponse(cacheKey, result);
      }

      return result;
    } catch (error: any) {
      const errorMsg = error.message || String(error);
      providerErrors.push(`${provider.name}: ${errorMsg}`);
      console.error(`[AI] ${provider.name} failed:`, errorMsg);
      // Continue to next provider
      if (provider !== availableProviders[availableProviders.length - 1]) {
        console.log(`[AI] Falling back to next provider...`);
      }
    }
  }

  throw new Error(`All AI providers failed: ${providerErrors.join("; ")}`);
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
${transcript.substring(0, 20000)}`;

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

${transcript.substring(0, 20000)}`;

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
${transcript.substring(0, 20000)}`;

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

${transcript.substring(0, 20000)}`;

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
${transcript.substring(0, 20000)}`;

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

export interface BillImpactResult {
  summary: string;
  impactType: string;
  keyPoints: string[];
  affectedGroups: string[];
}

export async function analyzeBillImpact(
  billTitle: string,
  billNumber: string | null,
  status: string
): Promise<BillImpactResult> {
  try {
    const systemPrompt = `You are an expert at analyzing Malaysian parliamentary bills and legislation.
Analyze bills and explain their impact on Malaysian citizens in a clear, accessible way.

Provide:
1. A brief summary (2-3 sentences) explaining what this bill means for ordinary Malaysians
2. The overall impact type: "positive", "negative", "mixed", or "neutral"
3. 3-5 key points about how this bill affects citizens
4. Which groups of Malaysians are most affected (e.g., workers, businesses, consumers, students, etc.)

You must respond with valid JSON matching this structure:
{
  "summary": "string",
  "impactType": "string",
  "keyPoints": ["string"],
  "affectedGroups": ["string"]
}`;

    const userPrompt = `Analyze this Malaysian Parliament bill:

Bill Number: ${billNumber || "Unknown"}
Title: ${billTitle}
Status: ${status}

Provide a comprehensive impact analysis for Malaysian citizens.`;

    const result = await callAI(systemPrompt, userPrompt);
    
    // Validate and sanitize the response
    const sanitized: BillImpactResult = {
      summary: typeof result.summary === 'string' ? result.summary : 'Unable to generate summary',
      impactType: typeof result.impactType === 'string' ? result.impactType : 'neutral',
      keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints.filter((p: any) => typeof p === 'string') : [],
      affectedGroups: Array.isArray(result.affectedGroups) ? result.affectedGroups.filter((g: any) => typeof g === 'string') : [],
    };

    return sanitized;
  } catch (error) {
    console.error("[AI] Error in bill impact analysis:", error);
    throw new Error(`Failed to analyze bill impact: ${error}`);
  }
}

export async function generateComprehensiveAnalysis(
  transcript: string,
  sessionDate: string,
  language: "en" | "ms" = "en"
): Promise<ComprehensiveAnalysisResult> {
  try {
    const languageInstruction = language === "ms"
      ? "Respond in Bahasa Malaysia (Malay language)"
      : "Respond in English";

    const systemPrompt = `You are an expert parliamentary analyst and researcher specializing in Malaysian Dewan Rakyat (Parliament) debates and legislative proceedings.
${languageInstruction}.

Your task is to provide an extremely comprehensive, detailed, and thorough analysis of the parliamentary transcript. This should be a professional-quality analysis suitable for researchers, journalists, policy analysts, and citizens who want deep understanding of the proceedings.

Your analysis MUST include:

1. INTRODUCTION: Set the context with session details (date, parliament term, session number if mentioned)

2. DOCUMENT STRUCTURE OVERVIEW: Identify the main sections of the session (e.g., Oral Questions, Motions, Debates)

3. DETAILED THEMATIC SECTIONS (6-10 sections): For each major topic/theme discussed:
   - Descriptive title
   - Comprehensive overview (3-5 sentences) explaining the context and significance
   - 4-8 detailed key points, each with:
     * Clear heading
     * Detailed explanation including:
       - Specific monetary figures (RM amounts, budgets, allocations)
       - Statistics, percentages, and numerical data
       - Names of ministers, MPs, and their constituencies
       - Specific policies, bills, acts, or government programs mentioned
       - Targets, goals, and timelines stated
       - Ministerial commitments and responses
       - Quotes or key statements where impactful

4. Extract specific details such as:
   - Investment amounts and budget allocations
   - Technology and infrastructure improvements
   - Policy changes and reforms discussed
   - Concerns raised by MPs
   - Government responses and commitments
   - Statistical data cited in debates

You must respond with valid JSON matching this structure:
{
  "introduction": "Based on the Hansard of the Malaysian Dewan Rakyat session dated [DATE], the following is a comprehensive analysis of the key discussions and highlights:",
  "sections": [
    {
      "title": "Theme Title (e.g., Emergency Preparedness and Natural Disasters)",
      "overview": "A comprehensive 3-5 sentence overview explaining the context, significance, and main points of discussion regarding this theme.",
      "keyPoints": [
        {
          "heading": "Point heading (e.g., Infrastructure Investment)",
          "detail": "Detailed explanation with specific facts, figures, names, policies, and context. Include monetary values, statistics, ministerial responses, and specific commitments made."
        }
      ]
    }
  ]
}

Be thorough, specific, and include as much factual detail from the transcript as possible. Avoid generic statements - always cite specific data, names, and figures from the debate.`;

    const userPrompt = `Analyze this Malaysian parliamentary debate session from ${sessionDate} in comprehensive detail:

${transcript.substring(0, 100000)}

Provide an extremely detailed and thorough thematic analysis. Extract ALL specific details including:
- All monetary figures and budget amounts mentioned
- All statistics and percentages cited
- Names of MPs, ministers, and their portfolios/constituencies
- Specific policies, bills, and government programs
- Targets, timelines, and commitments made
- Key quotes and statements
- Technical details about systems, technologies, or processes discussed

This analysis should be comprehensive enough for a researcher or journalist to understand exactly what was discussed without reading the original transcript.`;

    // Try best providers first (Claude > Groq), fall back to all providers on failure
    let result;
    const preferredAttempts: Array<{ name: string; key: boolean; fn: () => Promise<any> }> = [
      { name: "Claude", key: !!ANTHROPIC_API_KEY, fn: () => callAnthropic(systemPrompt, userPrompt, 16000) },
      { name: "Groq", key: !!GROQ_API_KEY, fn: () => callGroq(systemPrompt, userPrompt) },
    ];

    let succeeded = false;
    for (const attempt of preferredAttempts) {
      if (!attempt.key) continue;
      try {
        console.log(`[AI Comprehensive] Trying ${attempt.name} for detailed analysis`);
        result = await callWithRetry(attempt.fn);
        succeeded = true;
        break;
      } catch (error: any) {
        console.error(`[AI Comprehensive] ${attempt.name} failed:`, error.message);
      }
    }

    if (!succeeded) {
      console.log("[AI Comprehensive] Falling back to default AI provider chain");
      result = await callAI(systemPrompt, userPrompt);
    }

    // Validate and sanitize the response
    const sanitized: ComprehensiveAnalysisResult = {
      introduction: typeof result.introduction === 'string'
        ? result.introduction
        : `Based on the Hansard of the Malaysian Dewan Rakyat session dated ${sessionDate}, the following is an analysis of the key discussions and highlights:`,
      sections: Array.isArray(result.sections)
        ? result.sections.map((section: any) => ({
            title: typeof section.title === 'string' ? section.title : 'Untitled Section',
            overview: typeof section.overview === 'string' ? section.overview : '',
            keyPoints: Array.isArray(section.keyPoints)
              ? section.keyPoints.map((kp: any) => ({
                  heading: typeof kp.heading === 'string' ? kp.heading : '',
                  detail: typeof kp.detail === 'string' ? kp.detail : '',
                })).filter((kp: any) => kp.heading && kp.detail)
              : [],
          })).filter((s: any) => s.title && (s.overview || s.keyPoints.length > 0))
        : [],
    };

    return sanitized;
  } catch (error) {
    console.error("[AI] Error in comprehensive analysis:", error);
    throw new Error(`Failed to generate comprehensive analysis: ${error}`);
  }
}

export interface QAAnalysisQuestion {
  no: number;
  questioner: string;
  ministerTargeted: string;
  topic: string;
  summary: string;
}

export interface QAAnalysisResult {
  sessionInfo: string;
  questions: QAAnalysisQuestion[];
  totalQuestions: number;
}

export type QASectionType = "menteri" | "lisan";

/**
 * Extract Q&A (Pertanyaan/Soalan) sections from a Hansard transcript.
 * Searches for known section headers and extracts the relevant text
 * instead of blindly sending the first N characters.
 */
function extractQASections(transcript: string, sectionType: QASectionType): string {
  const sectionKeywords: Record<QASectionType, string[]> = {
    menteri: [
      "WAKTU PERTANYAAN-PERTANYAAN MENTERI",
      "WAKTU PERTANYAAN MENTERI",
      "PERTANYAAN-PERTANYAAN MENTERI",
    ],
    lisan: [
      "PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN",
      "PERTANYAAN BAGI JAWAB LISAN",
      "JAWAB LISAN",
    ],
  };

  // The end boundary: the other section or common subsequent sections
  // Note: avoid "USUL"/"USUL-USUL" — they appear frequently in Malay body text
  // (e.g. "usul-usul pokok yang dibangkitkan") and cause premature section cutoff
  const endKeywords: Record<QASectionType, string[]> = {
    menteri: [
      "PERTANYAAN-PERTANYAAN BAGI JAWAB LISAN",
      "PERTANYAAN BAGI JAWAB LISAN",
      "RANG UNDANG-UNDANG",
      "ATURAN URUSAN MESYUARAT",
    ],
    lisan: [
      "RANG UNDANG-UNDANG",
      "ATURAN URUSAN MESYUARAT",
      "PERTANYAAN-PERTANYAAN BAGI JAWAB BERTULIS",
    ],
  };

  const keywords = sectionKeywords[sectionType];
  const upperTranscript = transcript.toUpperCase();

  // Helper: find the second occurrence of a keyword if available.
  // The first occurrence is often in the KANDUNGAN (table of contents),
  // while the second is the actual section header in the body.
  function findSectionIndex(haystack: string, needle: string): number {
    const first = haystack.indexOf(needle);
    if (first === -1) return -1;
    const second = haystack.indexOf(needle, first + needle.length);
    return second !== -1 ? second : first;
  }

  // Find the target section start (prefer second occurrence to skip TOC)
  let sectionStart = -1;
  let matchedKeyword = "";
  for (const keyword of keywords) {
    const idx = findSectionIndex(upperTranscript, keyword);
    if (idx !== -1 && (sectionStart === -1 || idx < sectionStart)) {
      sectionStart = idx;
      matchedKeyword = keyword;
    }
  }

  if (sectionStart === -1) {
    // Fallback: try generic keywords
    const fallbackKeywords = ["PERTANYAAN", "SOALAN"];
    for (const keyword of fallbackKeywords) {
      const idx = findSectionIndex(upperTranscript, keyword);
      if (idx !== -1 && (sectionStart === -1 || idx < sectionStart)) {
        sectionStart = idx;
        matchedKeyword = keyword;
      }
    }
  }

  if (sectionStart === -1) {
    console.log(`[AI Q&A] No ${sectionType} section headers found, sending full transcript`);
    return transcript.substring(0, 80000);
  }

  // Find end boundary
  let sectionEnd = sectionStart + 80000;
  for (const endKw of endKeywords[sectionType]) {
    const endIdx = upperTranscript.indexOf(endKw, sectionStart + matchedKeyword.length + 100);
    if (endIdx !== -1 && endIdx < sectionEnd) {
      sectionEnd = endIdx;
    }
  }

  let extractedLength = sectionEnd - sectionStart;

  // Safety check: if the extracted section is too small (< 500 chars),
  // we likely matched a TOC entry rather than the actual section.
  // Try scanning forward from the current position to find the real section.
  if (extractedLength < 500) {
    console.log(`[AI Q&A] Extracted section too small (${extractedLength} chars) - likely TOC match, scanning forward...`);
    const nextStart = upperTranscript.indexOf(matchedKeyword, sectionStart + matchedKeyword.length);
    if (nextStart !== -1) {
      sectionStart = nextStart;
      sectionEnd = sectionStart + 80000;
      for (const endKw of endKeywords[sectionType]) {
        const endIdx = upperTranscript.indexOf(endKw, sectionStart + matchedKeyword.length + 100);
        if (endIdx !== -1 && endIdx < sectionEnd) {
          sectionEnd = endIdx;
        }
      }
      extractedLength = sectionEnd - sectionStart;
      console.log(`[AI Q&A] Re-scanned: found "${matchedKeyword}" at ${sectionStart}, end at ${sectionEnd} (${extractedLength} chars)`);
    }
  }

  console.log(`[AI Q&A] Found "${matchedKeyword}" at ${sectionStart}, end at ${sectionEnd} (${extractedLength} chars)`);

  const extracted = transcript.substring(sectionStart, sectionEnd);
  const header = transcript.substring(0, 2000);

  return header + "\n\n---\n\n" + extracted;
}

export async function analyzeQASections(
  transcript: string,
  sessionNumber: string,
  sectionType: QASectionType = "menteri"
): Promise<QAAnalysisResult> {
  try {
    const qaText = extractQASections(transcript, sectionType);

    const sectionLabel = sectionType === "menteri"
      ? "Waktu Pertanyaan-Pertanyaan Menteri (Minister's Question Time)"
      : "Pertanyaan-Pertanyaan Bagi Jawab Lisan (Oral Questions)";

    const systemPrompt = `You are an expert in analyzing official Malaysian Hansard PDFs from the Dewan Rakyat. Your task is to analyze the transcript and summarize ONLY the "${sectionLabel}" section.

For each question found in this section, extract:
- Question number (e.g., 1, 2)
- Questioner name and constituency (e.g., "Dato' Rosol bin Wahid [Hulu Terengganu]")
- Minister targeted (e.g., "Minister of Domestic Trade and Cost of Living")
- Topic (short summary from the question text)
- Summary of the main response and any supplementaries (concise, 100-200 words)

Handle variations: Modern PDFs (2026) have structured lists; older ones may be less formatted.
Handle Malay text (UTF-8 encoding); no translation needed.
If no questions section is found, return an empty questions array.

You must respond with valid JSON matching this structure:
{
  "sessionInfo": "Brief description of the session",
  "questions": [
    {
      "no": 1,
      "questioner": "Name [Constituency]",
      "ministerTargeted": "Minister of ...",
      "topic": "Short topic description",
      "summary": "Concise summary of question and response (100-200 words)"
    }
  ],
  "totalQuestions": 0
}`;

    const userPrompt = `Analyze the following Hansard transcript from session ${sessionNumber} and extract all parliamentary questions from the "${sectionLabel}" section:

${qaText}`;

    // Q&A analysis sends large transcripts (up to 80k chars) — prefer providers
    // with large context windows, but fall back to all providers if preferred ones fail
    let result;
    try {
      result = await callAI(systemPrompt, userPrompt, false, ["Groq", "Cloudflare"]);
    } catch (preferredError) {
      console.log("[AI Q&A] Preferred providers failed, trying all available providers...");
      result = await callAI(systemPrompt, userPrompt, false);
    }

    const sanitized: QAAnalysisResult = {
      sessionInfo: typeof result.sessionInfo === "string" ? result.sessionInfo : `Session ${sessionNumber}`,
      questions: Array.isArray(result.questions)
        ? result.questions.map((q: any, idx: number) => ({
            no: typeof q.no === "number" ? q.no : idx + 1,
            questioner: typeof q.questioner === "string" ? q.questioner : "Unknown",
            ministerTargeted: typeof q.ministerTargeted === "string" ? q.ministerTargeted : "Unknown",
            topic: typeof q.topic === "string" ? q.topic : "Unknown",
            summary: typeof q.summary === "string" ? q.summary : "",
          }))
        : [],
      totalQuestions: typeof result.totalQuestions === "number" ? result.totalQuestions : (result.questions?.length || 0),
    };

    return sanitized;
  } catch (error) {
    console.error("[AI] Error in Q&A analysis:", error);
    throw new Error(`Failed to analyze Q&A sections: ${error}`);
  }
}

export function isDeepSeekConfigured(): boolean {
  return !!(GEMINI_API_KEYS.length > 0 || OPENROUTER_API_KEY || GROQ_API_KEY || CEREBRAS_API_KEY || TOGETHER_API_KEY || SAMBANOVA_API_KEY || (CLOUDFLARE_API_KEY && CLOUDFLARE_ACCOUNT_ID));
}

export function isGeminiConfigured(): boolean {
  return GEMINI_API_KEYS.length > 0;
}

export function getConfiguredProviders(): string[] {
  const providers: string[] = [];
  if (ANTHROPIC_API_KEY) providers.push("Claude (Anthropic)");
  if (GEMINI_API_KEYS.length > 0) providers.push(`Gemini (${GEMINI_API_KEYS.length} keys)`);
  if (OPENROUTER_API_KEY) providers.push("OpenRouter");
  if (GROQ_API_KEY) providers.push("Groq");
  if (CEREBRAS_API_KEY) providers.push("Cerebras");
  if (TOGETHER_API_KEY) providers.push("Together");
  if (SAMBANOVA_API_KEY) providers.push("SambaNova");
  if (CLOUDFLARE_API_KEY && CLOUDFLARE_ACCOUNT_ID) providers.push("Cloudflare");
  return providers;
}
