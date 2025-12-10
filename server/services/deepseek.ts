/**
 * DeepSeek AI Service for Hansard Analysis
 * Uses OpenRouter to access DeepSeek models (FREE credits available!)
 * Get your free API key at: https://openrouter.ai/
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const DEEPSEEK_BASE_URL = "https://openrouter.ai/api/v1";
// Using DeepSeek V3.1 - FREE with 128K context, excellent for document analysis
// Note: Free tier requires data training consent in OpenRouter settings. Add credits at https://openrouter.ai/credits for unlimited access
const DEEPSEEK_MODEL = "deepseek/deepseek-chat-v3.1:free";

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

/**
 * Generic function to call DeepSeek API with structured JSON output
 */
async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string,
  responseSchema: any
): Promise<any> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured. Get free credits at https://openrouter.ai/");
  }

  try {
    const response = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://myparliament.my",
        "X-Title": "MyParliament Dashboard",
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
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
      console.error("[DeepSeek] API error:", errorText);
      throw new Error(`DeepSeek API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in DeepSeek response");
    }

    return JSON.parse(content);
  } catch (error: any) {
    console.error("[DeepSeek] Error:", error.message);
    throw error;
  }
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

    const result = await callDeepSeek(systemPrompt, userPrompt, null);
    return result.topics || [];
  } catch (error) {
    console.error("[DeepSeek] Error in topic extraction:", error);
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

    const result = await callDeepSeek(systemPrompt, userPrompt, null);
    return result;
  } catch (error) {
    console.error("[DeepSeek] Error in sentiment analysis:", error);
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

    const result = await callDeepSeek(systemPrompt, userPrompt, null);
    return result.speakers || [];
  } catch (error) {
    console.error("[DeepSeek] Error in speaker analysis:", error);
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

    const result = await callDeepSeek(systemPrompt, userPrompt, null);
    return result;
  } catch (error) {
    console.error("[DeepSeek] Error in detailed summary:", error);
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

    const result = await callDeepSeek(systemPrompt, userPrompt, null);
    return result;
  } catch (error) {
    console.error("[DeepSeek] Error in Q&A:", error);
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

    const result = await callDeepSeek(systemPrompt, userPrompt, null);
    return result;
  } catch (error) {
    console.error("[DeepSeek] Error in topic summary:", error);
    throw new Error(`Failed to generate topic summary: ${error}`);
  }
}

export function isDeepSeekConfigured(): boolean {
  return !!OPENROUTER_API_KEY;
}
