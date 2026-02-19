/**
 * Copyright by Calmic Sdn Bhd
 * AI Service for Hansard Analysis — delegates to multi-provider system
 */

import { callAI as callMultiProviderAI, isDeepSeekConfigured } from "./services/deepseek";

export function isAIConfigured(): boolean {
  return isDeepSeekConfigured();
}

interface AIResponse {
  success: boolean;
  content?: string;
  error?: string;
}

/**
 * Send a prompt to AI using the multi-provider fallback chain
 */
async function callAI(prompt: string, systemPrompt?: string): Promise<AIResponse> {
  if (!isAIConfigured()) {
    return { success: false, error: "No AI provider configured" };
  }

  try {
    const result = await callMultiProviderAI(
      systemPrompt || "You are a helpful assistant. Respond with valid JSON only.",
      prompt
    );

    // The multi-provider callAI returns parsed JSON; stringify for legacy interface
    const content = typeof result === "string" ? result : JSON.stringify(result);
    return { success: true, content };
  } catch (error: any) {
    console.error("[AI Legacy] All providers failed:", error.message);
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

  // Truncate transcript if too long
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

export interface SpeakerAnalysisResult {
  topicsDiscussed: string[];
  keyArguments: string[];
  stance?: string;
}

/**
 * Analyze a specific speaker's contributions and extract topics/arguments
 */
export async function analyzeSpeakerContributions(
  speakerName: string,
  speeches: string[]
): Promise<{ success: boolean; analysis?: SpeakerAnalysisResult; error?: string }> {

  if (!isAIConfigured()) {
    return { success: false, error: "AI not configured" };
  }

  if (!speeches || speeches.length === 0) {
    return {
      success: true,
      analysis: {
        topicsDiscussed: [],
        keyArguments: [],
      }
    };
  }

  // Combine speeches (limit to avoid token overflow)
  const combinedSpeeches = speeches.join("\n\n").substring(0, 8000);

  const prompt = `Analyze these speeches by ${speakerName} in Malaysian Parliament.

SPEECHES:
${combinedSpeeches}

Extract the following in JSON format (respond ONLY with valid JSON):
{
  "topicsDiscussed": ["topic1", "topic2", "topic3"],
  "keyArguments": ["main point 1", "main point 2"],
  "stance": "brief description of their position/stance"
}

Keep topics concise (2-4 words each). List 2-5 topics and 1-3 key arguments. Key arguments should be full sentences summarizing the speaker's main points.`;

  const result = await callAI(prompt);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  try {
    let jsonStr = result.content!;
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1];
    }

    const analysis = JSON.parse(jsonStr.trim()) as SpeakerAnalysisResult;
    return { success: true, analysis };
  } catch {
    return {
      success: true,
      analysis: {
        topicsDiscussed: [],
        keyArguments: [],
      }
    };
  }
}

/**
 * Batch analyze multiple speakers (with rate limiting)
 */
export async function batchAnalyzeSpeakers(
  speakers: Array<{ name: string; speeches: string[] }>
): Promise<Map<string, SpeakerAnalysisResult>> {
  const results = new Map<string, SpeakerAnalysisResult>();

  for (const speaker of speakers) {
    const result = await analyzeSpeakerContributions(speaker.name, speaker.speeches);
    if (result.success && result.analysis) {
      results.set(speaker.name, result.analysis);
    }
    // Rate limiting - wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
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
