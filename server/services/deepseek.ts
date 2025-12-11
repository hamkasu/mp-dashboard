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

// API Base URLs
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const TOGETHER_BASE_URL = "https://api.together.xyz/v1";
const CLOUDFLARE_BASE_URL = "https://api.cloudflare.com/client/v4/accounts";

// Model configurations
const AI_MODEL = "google/gemini-2.0-flash-exp:free";
const GROQ_MODEL = "llama-3.3-70b-versatile";
const TOGETHER_MODEL = "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free";
const CLOUDFLARE_MODEL = "@cf/meta/llama-3.1-8b-instruct";

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

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: any): { retryable: boolean; reason: string } {
  const message = error.message || '';
  const status = error.status;
  
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
      max_tokens: 4000,
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

async function callAI(
  systemPrompt: string,
  userPrompt: string,
  useCache: boolean = true
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
    { name: "Together", key: !!TOGETHER_API_KEY, fn: callTogether },
    { name: "Cloudflare", key: !!(CLOUDFLARE_API_KEY && CLOUDFLARE_ACCOUNT_ID), fn: callCloudflare },
  ];

  const availableProviders = providers.filter(p => p.key);

  if (availableProviders.length === 0) {
    throw new Error("No AI provider configured. Set at least one of: GEMINI_API_KEY, OPENROUTER_API_KEY, GROQ_API_KEY, TOGETHER_API_KEY, or CLOUDFLARE_API_KEY");
  }

  // Try each provider in sequence until one succeeds
  for (const provider of availableProviders) {
    try {
      console.log(`[AI] Trying ${provider.name} API`);
      const result = await callWithRetry(async () => provider.fn(systemPrompt, userPrompt));
      
      // Cache successful response
      if (useCache) {
        setCachedResponse(cacheKey, result);
      }
      
      return result;
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

export function isDeepSeekConfigured(): boolean {
  return !!(GEMINI_API_KEYS.length > 0 || OPENROUTER_API_KEY || GROQ_API_KEY || TOGETHER_API_KEY || (CLOUDFLARE_API_KEY && CLOUDFLARE_ACCOUNT_ID));
}

export function isGeminiConfigured(): boolean {
  return GEMINI_API_KEYS.length > 0;
}

export function getConfiguredProviders(): string[] {
  const providers: string[] = [];
  if (GEMINI_API_KEYS.length > 0) providers.push(`Gemini (${GEMINI_API_KEYS.length} keys)`);
  if (OPENROUTER_API_KEY) providers.push("OpenRouter");
  if (GROQ_API_KEY) providers.push("Groq");
  if (TOGETHER_API_KEY) providers.push("Together");
  if (CLOUDFLARE_API_KEY && CLOUDFLARE_ACCOUNT_ID) providers.push("Cloudflare");
  return providers;
}
