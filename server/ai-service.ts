/**
 * Copyright by Calmic Sdn Bhd
 * AI Service for Hansard Analysis using OpenRouter (Qwen)
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

// Default to Qwen 2.5 72B - good balance of quality and cost
const DEFAULT_MODEL = "qwen/qwen-2.5-72b-instruct";

export function isAIConfigured(): boolean {
  return !!OPENROUTER_API_KEY;
}

interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Send a prompt to the AI model via OpenRouter
 */
async function callAI(prompt: string, systemPrompt?: string, model: string = DEFAULT_MODEL): Promise<AIResponse> {
  if (!OPENROUTER_API_KEY) {
    return { success: false, error: "OpenRouter API key not configured" };
  }

  try {
    const messages: Array<{ role: string; content: string }> = [];

    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://myparliament.my",
        "X-Title": "MyParliament Dashboard"
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 2000,
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[AI] OpenRouter error:", errorText);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return { success: false, error: "No content in AI response" };
    }

    return { success: true, content };
  } catch (error: any) {
    console.error("[AI] Error calling OpenRouter:", error.message);
    return { success: false, error: error.message };
  }
}

export interface HansardAnalysisResult {
  summary: string;
  keyTopics: string[];
  sentiment: string;
  highlights: string[];
  controversialMoments?: string[];
}

/**
 * Analyze a Hansard transcript and generate insights
 */
export async function analyzeHansardTranscript(
  sessionNumber: string,
  sessionDate: string,
  transcript: string
): Promise<{ success: boolean; analysis?: HansardAnalysisResult; error?: string }> {

  // Truncate transcript if too long (Qwen has 32K context)
  const maxChars = 25000;
  const truncatedTranscript = transcript.length > maxChars
    ? transcript.substring(0, maxChars) + "\n\n[Transcript truncated due to length...]"
    : transcript;

  const systemPrompt = `You are an expert analyst of Malaysian Parliament proceedings (Hansard).
You analyze parliamentary transcripts and provide insightful summaries in both English and Malay context.
Focus on: key debates, important decisions, controversial moments, and notable MP contributions.
Always be objective and factual.`;

  const prompt = `Analyze this Malaysian Parliament Hansard transcript from session ${sessionNumber} (${sessionDate}).

TRANSCRIPT:
${truncatedTranscript}

Provide your analysis in the following JSON format (respond ONLY with valid JSON):
{
  "summary": "A 2-3 sentence summary of the session in English",
  "keyTopics": ["topic1", "topic2", "topic3"],
  "sentiment": "overall tone: constructive/contentious/routine/mixed",
  "highlights": ["key moment 1", "key moment 2"],
  "controversialMoments": ["any heated exchanges or controversial statements"]
}`;

  const result = await callAI(prompt, systemPrompt);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  try {
    // Extract JSON from response (handle markdown code blocks)
    let jsonStr = result.content!;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const analysis = JSON.parse(jsonStr.trim()) as HansardAnalysisResult;
    return { success: true, analysis };
  } catch (parseError) {
    console.error("[AI] Failed to parse analysis JSON:", parseError);
    // Return raw content as summary if JSON parsing fails
    return {
      success: true,
      analysis: {
        summary: result.content!.substring(0, 500),
        keyTopics: [],
        sentiment: "unknown",
        highlights: [],
      }
    };
  }
}

/**
 * Generate a simple summary for a Hansard session
 */
export async function generateHansardSummary(
  sessionNumber: string,
  speakerCount: number,
  attendanceRate: number,
  transcript?: string
): Promise<{ success: boolean; summary?: string; error?: string }> {

  const prompt = transcript
    ? `Summarize this Malaysian Parliament session ${sessionNumber} in 1-2 sentences.
       ${speakerCount} MPs spoke with ${attendanceRate.toFixed(1)}% attendance.

       Key excerpt: ${transcript.substring(0, 3000)}

       Provide a brief, factual summary.`
    : `Parliamentary session ${sessionNumber} with ${speakerCount} constituencies speaking (${attendanceRate.toFixed(1)}% participation rate).`;

  if (!transcript) {
    // No transcript, return basic summary
    return {
      success: true,
      summary: `Parliamentary session ${sessionNumber} with ${speakerCount} constituencies speaking out of attendees (${attendanceRate.toFixed(1)}% participation rate).`
    };
  }

  const result = await callAI(prompt);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  return { success: true, summary: result.content };
}
