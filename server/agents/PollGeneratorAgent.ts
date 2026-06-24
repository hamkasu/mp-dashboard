/**
 * Poll Generator Agent
 * Autonomously generates weekly poll questions based on current parliamentary topics
 * Copyright by Calmic Sdn Bhd
 */

import { BaseAgent } from "./BaseAgent";
import type { AgentType, AgentExecutionContext, AgentResult, ProgressCallback } from "./types";
import { db } from "../db";
import { hansardRecords, bills, polls, pollOptions } from "../../shared/schema";
import { desc, gte, eq } from "drizzle-orm";
import { storage } from "../storage";

// OpenRouter API configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const DEFAULT_MODEL = "qwen/qwen-2.5-72b-instruct";

interface GeneratedPoll {
  question: string;
  questionMs: string;
  description: string;
  category: string;
  options: Array<{
    optionText: string;
    optionTextMs: string;
  }>;
}

export class PollGeneratorAgent extends BaseAgent {
  readonly type: AgentType = "poll-generator" as AgentType;
  readonly name = "Weekly Poll Generator Agent";
  readonly description = "Autonomously generates weekly poll questions based on current parliamentary topics, bills, and debates";

  protected async run(
    context: AgentExecutionContext,
    onProgress?: ProgressCallback
  ): Promise<AgentResult> {
    const findings: any[] = [];
    let tokensUsed = 0;
    let apiCalls = 0;
    let dataUpdated = false;

    onProgress?.({
      stage: "gathering",
      progress: 10,
      message: "Gathering recent parliamentary context...",
    });

    // Get current week number and year
    const now = new Date();
    const weekNumber = this.getISOWeekNumber(now);
    const year = now.getFullYear();

    // Check if polls already exist for this week
    const existingPolls = await storage.getPollsByWeek(year, weekNumber);
    if (existingPolls.length > 0 && !context.parameters.forceRegenerate) {
      return {
        success: true,
        summary: `Polls already exist for week ${weekNumber} of ${year}. Use forceRegenerate=true to regenerate.`,
        findings: [],
        apiCalls: 0,
        dataUpdated: false,
        data: {
          existingPolls: existingPolls.length,
          weekNumber,
          year,
        },
      };
    }

    // Gather context from recent parliamentary activities
    onProgress?.({
      stage: "analyzing",
      progress: 30,
      message: "Analyzing recent Hansard debates and bills...",
    });

    const recentContext = await this.gatherParliamentaryContext();
    apiCalls++;

    if (!recentContext.hasContent) {
      findings.push(
        this.createFinding(
          "warning",
          "medium",
          "Limited Parliamentary Context",
          "Not enough recent parliamentary data to generate contextual polls. Generating general governance polls instead.",
          {}
        )
      );
    }

    // Generate poll questions using AI
    onProgress?.({
      stage: "generating",
      progress: 50,
      message: "Generating poll questions with AI...",
    });

    const numberOfPolls = context.parameters.numberOfPolls || 1;
    const generatedPolls = await this.generatePollsWithAI(recentContext, numberOfPolls, weekNumber);
    apiCalls++;

    if (generatedPolls.length === 0) {
      return {
        success: false,
        summary: "Failed to generate any poll questions",
        findings: [
          this.createFinding(
            "error",
            "high",
            "Poll Generation Failed",
            "AI was unable to generate poll questions. Check API configuration.",
            {}
          ),
        ],
        apiCalls,
        dataUpdated: false,
      };
    }

    // Create polls in database
    onProgress?.({
      stage: "saving",
      progress: 80,
      message: `Creating ${generatedPolls.length} poll(s) in database...`,
    });

    const createdPolls = [];
    for (const pollData of generatedPolls) {
      try {
        // Calculate start and end dates for the week
        const startsAt = this.getWeekStartDate(year, weekNumber);
        const endsAt = this.getWeekEndDate(year, weekNumber);

        const poll = await storage.createPoll(
          {
            question: pollData.question,
            questionMs: pollData.questionMs,
            description: pollData.description,
            category: pollData.category as any,
            weekNumber,
            year,
            status: "active",
            generatedBy: "ai",
            aiPromptUsed: "Weekly parliamentary context poll generation",
            sourceContext: recentContext.summary,
            startsAt,
            endsAt,
          },
          pollData.options.map((opt, idx) => ({
            pollId: "", // Will be set by storage
            optionText: opt.optionText,
            optionTextMs: opt.optionTextMs,
            displayOrder: idx,
          }))
        );

        createdPolls.push(poll);
        dataUpdated = true;

        findings.push(
          this.createFinding(
            "insight",
            "info",
            `Created Poll: ${pollData.question.substring(0, 50)}...`,
            `Poll with ${pollData.options.length} options created for week ${weekNumber}/${year}`,
            {
              evidence: {
                pollId: poll.id,
                category: pollData.category,
                optionCount: pollData.options.length,
              },
            }
          )
        );
      } catch (error) {
        console.error("Error creating poll:", error);
        findings.push(
          this.createFinding(
            "error",
            "medium",
            "Failed to Create Poll",
            error instanceof Error ? error.message : "Unknown error",
            {}
          )
        );
      }
    }

    onProgress?.({
      stage: "finalizing",
      progress: 95,
      message: "Finalizing poll generation...",
    });

    const summary = `Generated ${createdPolls.length} poll(s) for week ${weekNumber} of ${year}. ${findings.filter((f) => f.type === "error").length} errors encountered.`;

    return {
      success: createdPolls.length > 0,
      summary,
      findings,
      data: {
        pollsCreated: createdPolls.length,
        weekNumber,
        year,
        pollIds: createdPolls.map((p) => p.id),
      },
      tokensUsed,
      apiCalls,
      dataUpdated,
    };
  }

  /**
   * Gather context from recent parliamentary activities
   */
  private async gatherParliamentaryContext(): Promise<{
    hasContent: boolean;
    summary: string;
    topics: string[];
    recentBills: string[];
    debateHighlights: string[];
  }> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get recent Hansard records
    const recentHansards = await db
      .select({
        id: hansardRecords.id,
        sessionNumber: hansardRecords.sessionNumber,
        sessionDate: hansardRecords.sessionDate,
        topics: hansardRecords.topics,
        summary: hansardRecords.summary,
      })
      .from(hansardRecords)
      .where(gte(hansardRecords.sessionDate, thirtyDaysAgo))
      .orderBy(desc(hansardRecords.sessionDate))
      .limit(10);

    // Get recent bills
    const recentBills = await db
      .select({
        id: bills.id,
        title: bills.title,
        status: bills.status,
      })
      .from(bills)
      .orderBy(desc(bills.createdAt))
      .limit(10);

    // Extract topics from Hansard records
    const allTopics: string[] = [];
    const debateHighlights: string[] = [];

    for (const hansard of recentHansards) {
      if (hansard.topics && Array.isArray(hansard.topics)) {
        allTopics.push(...hansard.topics);
      }
      if (hansard.summary) {
        debateHighlights.push(hansard.summary.substring(0, 200));
      }
    }

    // Get unique topics
    const uniqueTopics = [...new Set(allTopics)].slice(0, 10);

    const hasContent = recentHansards.length > 0 || recentBills.length > 0;

    const summary = hasContent
      ? `Based on ${recentHansards.length} recent parliamentary sessions and ${recentBills.length} bills.`
      : "No recent parliamentary data available.";

    return {
      hasContent,
      summary,
      topics: uniqueTopics,
      recentBills: recentBills.map((b) => b.title),
      debateHighlights: debateHighlights.slice(0, 5),
    };
  }

  /**
   * Generate poll questions using AI
   */
  private async generatePollsWithAI(
    context: {
      hasContent: boolean;
      summary: string;
      topics: string[];
      recentBills: string[];
      debateHighlights: string[];
    },
    numberOfPolls: number = 1,
    weekNumber: number = 0
  ): Promise<GeneratedPoll[]> {
    if (!OPENROUTER_API_KEY) {
      console.error("[PollGenerator] OpenRouter API key not configured");
      return this.getFallbackPolls(numberOfPolls, weekNumber);
    }

    const systemPrompt = `You are an expert at creating engaging public opinion polls about Malaysian politics and governance.
You generate poll questions that are:
- Relevant to current parliamentary issues
- Neutral and unbiased
- Clear and easy to understand
- Interesting to Malaysian citizens
- Available in both English and Malay

Always provide 3-5 answer options that cover the spectrum of possible opinions.`;

    let userPrompt: string;

    if (context.hasContent) {
      userPrompt = `Based on recent Malaysian Parliament activities, generate ${numberOfPolls} poll question(s).

Recent Topics Discussed:
${context.topics.length > 0 ? context.topics.join(", ") : "General governance"}

Recent Bills:
${context.recentBills.length > 0 ? context.recentBills.join("\n") : "No recent bills"}

Recent Debate Highlights:
${context.debateHighlights.length > 0 ? context.debateHighlights.join("\n") : "No recent highlights"}

Generate engaging poll questions that Malaysian citizens would be interested in answering.
Respond ONLY with valid JSON in this exact format:
{
  "polls": [
    {
      "question": "English question here?",
      "questionMs": "Malay translation here?",
      "description": "Brief context for the poll",
      "category": "politics|economy|social|education|healthcare|environment|infrastructure|governance|general",
      "options": [
        {"optionText": "Option 1 in English", "optionTextMs": "Option 1 in Malay"},
        {"optionText": "Option 2 in English", "optionTextMs": "Option 2 in Malay"},
        {"optionText": "Option 3 in English", "optionTextMs": "Option 3 in Malay"}
      ]
    }
  ]
}`;
    } else {
      userPrompt = `Generate ${numberOfPolls} general poll question(s) about Malaysian governance and public policy.
Focus on topics like:
- Government transparency and accountability
- Public services quality
- Economic policies
- Education and healthcare
- Environmental policies

Respond ONLY with valid JSON in this exact format:
{
  "polls": [
    {
      "question": "English question here?",
      "questionMs": "Malay translation here?",
      "description": "Brief context for the poll",
      "category": "politics|economy|social|education|healthcare|environment|infrastructure|governance|general",
      "options": [
        {"optionText": "Option 1 in English", "optionTextMs": "Option 1 in Malay"},
        {"optionText": "Option 2 in English", "optionTextMs": "Option 2 in Malay"},
        {"optionText": "Option 3 in English", "optionTextMs": "Option 3 in Malay"}
      ]
    }
  ]
}`;
    }

    try {
      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://myparliament.my",
          "X-Title": "MyParliament Poll Generator",
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        console.error("[PollGenerator] API error:", response.status);
        return this.getFallbackPolls(numberOfPolls, weekNumber);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        console.error("[PollGenerator] No content in response");
        return this.getFallbackPolls(numberOfPolls, weekNumber);
      }

      // Parse JSON response
      let jsonStr = content;
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonStr.trim());

      if (parsed.polls && Array.isArray(parsed.polls)) {
        return parsed.polls.slice(0, numberOfPolls);
      }

      console.error("[PollGenerator] Invalid response format");
      return this.getFallbackPolls(numberOfPolls, weekNumber);
    } catch (error) {
      console.error("[PollGenerator] Error calling AI:", error);
      return this.getFallbackPolls(numberOfPolls, weekNumber);
    }
  }

  /**
   * Get fallback polls when AI is not available
   */
  private getFallbackPolls(count: number, weekNumber: number = 0): GeneratedPoll[] {
    const fallbackPolls: GeneratedPoll[] = [
      {
        question: "How would you rate the government's handling of economic issues?",
        questionMs: "Bagaimana anda menilai pengendalian kerajaan terhadap isu ekonomi?",
        description: "Share your opinion on the government's economic policies and management.",
        category: "economy",
        options: [
          { optionText: "Excellent", optionTextMs: "Cemerlang" },
          { optionText: "Good", optionTextMs: "Baik" },
          { optionText: "Average", optionTextMs: "Sederhana" },
          { optionText: "Poor", optionTextMs: "Lemah" },
          { optionText: "Very Poor", optionTextMs: "Sangat Lemah" },
        ],
      },
      {
        question: "What should be the government's top priority for the next year?",
        questionMs: "Apakah yang sepatutnya menjadi keutamaan kerajaan untuk tahun hadapan?",
        description: "Help us understand what matters most to citizens.",
        category: "governance",
        options: [
          { optionText: "Economy and Jobs", optionTextMs: "Ekonomi dan Pekerjaan" },
          { optionText: "Healthcare", optionTextMs: "Kesihatan" },
          { optionText: "Education", optionTextMs: "Pendidikan" },
          { optionText: "Cost of Living", optionTextMs: "Kos Sara Hidup" },
          { optionText: "Infrastructure", optionTextMs: "Infrastruktur" },
        ],
      },
      {
        question: "How satisfied are you with public transportation in your area?",
        questionMs: "Sejauh mana anda berpuas hati dengan pengangkutan awam di kawasan anda?",
        description: "Share your experience with public transportation services.",
        category: "infrastructure",
        options: [
          { optionText: "Very Satisfied", optionTextMs: "Sangat Berpuas Hati" },
          { optionText: "Satisfied", optionTextMs: "Berpuas Hati" },
          { optionText: "Neutral", optionTextMs: "Neutral" },
          { optionText: "Dissatisfied", optionTextMs: "Tidak Berpuas Hati" },
          { optionText: "Very Dissatisfied", optionTextMs: "Sangat Tidak Berpuas Hati" },
        ],
      },
      {
        question: "How would you rate the quality of public healthcare services in Malaysia?",
        questionMs: "Bagaimana anda menilai kualiti perkhidmatan kesihatan awam di Malaysia?",
        description: "Share your experience with government hospitals and clinics.",
        category: "healthcare",
        options: [
          { optionText: "Excellent", optionTextMs: "Cemerlang" },
          { optionText: "Good", optionTextMs: "Baik" },
          { optionText: "Average", optionTextMs: "Sederhana" },
          { optionText: "Poor", optionTextMs: "Lemah" },
          { optionText: "Very Poor", optionTextMs: "Sangat Lemah" },
        ],
      },
      {
        question: "How concerned are you about the rising cost of living in Malaysia?",
        questionMs: "Sejauh mana anda bimbang tentang peningkatan kos sara hidup di Malaysia?",
        description: "Tell us how the cost of living is affecting you.",
        category: "economy",
        options: [
          { optionText: "Extremely concerned", optionTextMs: "Sangat bimbang" },
          { optionText: "Very concerned", optionTextMs: "Amat bimbang" },
          { optionText: "Somewhat concerned", optionTextMs: "Agak bimbang" },
          { optionText: "Not very concerned", optionTextMs: "Tidak begitu bimbang" },
          { optionText: "Not concerned at all", optionTextMs: "Tidak bimbang langsung" },
        ],
      },
      {
        question: "How would you rate the quality of education in Malaysia's public schools?",
        questionMs: "Bagaimana anda menilai kualiti pendidikan di sekolah awam Malaysia?",
        description: "Share your views on the standard of public school education.",
        category: "education",
        options: [
          { optionText: "Excellent", optionTextMs: "Cemerlang" },
          { optionText: "Good", optionTextMs: "Baik" },
          { optionText: "Average", optionTextMs: "Sederhana" },
          { optionText: "Needs improvement", optionTextMs: "Perlu penambahbaikan" },
          { optionText: "Poor", optionTextMs: "Lemah" },
        ],
      },
      {
        question: "How effective do you think Parliament is in representing citizens' interests?",
        questionMs: "Sejauh mana anda rasa Parlimen berkesan dalam mewakili kepentingan rakyat?",
        description: "Share your view on Parliament's role in representing Malaysians.",
        category: "politics",
        options: [
          { optionText: "Very effective", optionTextMs: "Sangat berkesan" },
          { optionText: "Somewhat effective", optionTextMs: "Agak berkesan" },
          { optionText: "Neutral", optionTextMs: "Neutral" },
          { optionText: "Somewhat ineffective", optionTextMs: "Agak tidak berkesan" },
          { optionText: "Very ineffective", optionTextMs: "Sangat tidak berkesan" },
        ],
      },
      {
        question: "How would you rate government transparency and accountability in Malaysia?",
        questionMs: "Bagaimana anda menilai ketelusan dan akauntabiliti kerajaan di Malaysia?",
        description: "Share your opinion on how open and accountable the government is.",
        category: "governance",
        options: [
          { optionText: "Excellent", optionTextMs: "Cemerlang" },
          { optionText: "Good", optionTextMs: "Baik" },
          { optionText: "Average", optionTextMs: "Sederhana" },
          { optionText: "Poor", optionTextMs: "Lemah" },
          { optionText: "Very Poor", optionTextMs: "Sangat Lemah" },
        ],
      },
      {
        question: "How important is environmental protection to you when evaluating government policies?",
        questionMs: "Sejauh mana perlindungan alam sekitar penting bagi anda dalam menilai dasar kerajaan?",
        description: "Tell us how much environmental issues matter in your assessment of government.",
        category: "environment",
        options: [
          { optionText: "Extremely important", optionTextMs: "Sangat penting" },
          { optionText: "Very important", optionTextMs: "Amat penting" },
          { optionText: "Somewhat important", optionTextMs: "Agak penting" },
          { optionText: "Not very important", optionTextMs: "Tidak begitu penting" },
          { optionText: "Not important at all", optionTextMs: "Tidak penting langsung" },
        ],
      },
      {
        question: "How would you rate the government's efforts to reduce corruption?",
        questionMs: "Bagaimana anda menilai usaha kerajaan untuk mengurangkan rasuah?",
        description: "Share your opinion on anti-corruption measures in Malaysia.",
        category: "governance",
        options: [
          { optionText: "Very effective", optionTextMs: "Sangat berkesan" },
          { optionText: "Somewhat effective", optionTextMs: "Agak berkesan" },
          { optionText: "Neutral", optionTextMs: "Neutral" },
          { optionText: "Somewhat ineffective", optionTextMs: "Agak tidak berkesan" },
          { optionText: "Very ineffective", optionTextMs: "Sangat tidak berkesan" },
        ],
      },
      {
        question: "How satisfied are you with the government's digital services and e-government initiatives?",
        questionMs: "Sejauh mana anda berpuas hati dengan perkhidmatan digital kerajaan dan inisiatif e-kerajaan?",
        description: "Share your experience using government digital platforms and online services.",
        category: "governance",
        options: [
          { optionText: "Very Satisfied", optionTextMs: "Sangat Berpuas Hati" },
          { optionText: "Satisfied", optionTextMs: "Berpuas Hati" },
          { optionText: "Neutral", optionTextMs: "Neutral" },
          { optionText: "Dissatisfied", optionTextMs: "Tidak Berpuas Hati" },
          { optionText: "Very Dissatisfied", optionTextMs: "Sangat Tidak Berpuas Hati" },
        ],
      },
      {
        question: "How confident are you in the government's ability to manage the national budget?",
        questionMs: "Sejauh mana anda yakin dengan keupayaan kerajaan untuk mengurus belanjawan negara?",
        description: "Share your confidence in how Malaysia's public finances are managed.",
        category: "economy",
        options: [
          { optionText: "Very confident", optionTextMs: "Sangat yakin" },
          { optionText: "Confident", optionTextMs: "Yakin" },
          { optionText: "Neutral", optionTextMs: "Neutral" },
          { optionText: "Not confident", optionTextMs: "Tidak yakin" },
          { optionText: "Not confident at all", optionTextMs: "Langsung tidak yakin" },
        ],
      },
      {
        question: "How would you rate Malaysia's efforts to attract foreign investment?",
        questionMs: "Bagaimana anda menilai usaha Malaysia untuk menarik pelaburan asing?",
        description: "Share your view on Malaysia's investment climate and economic attractiveness.",
        category: "economy",
        options: [
          { optionText: "Excellent", optionTextMs: "Cemerlang" },
          { optionText: "Good", optionTextMs: "Baik" },
          { optionText: "Average", optionTextMs: "Sederhana" },
          { optionText: "Poor", optionTextMs: "Lemah" },
          { optionText: "Very Poor", optionTextMs: "Sangat Lemah" },
        ],
      },
    ];

    // Rotate through fallback polls based on week number to ensure variety each week
    const startIndex = weekNumber > 0 ? (weekNumber - 1) % fallbackPolls.length : 0;
    const rotated = [...fallbackPolls.slice(startIndex), ...fallbackPolls.slice(0, startIndex)];
    return rotated.slice(0, count);
  }

  /**
   * Get ISO week number
   */
  private getISOWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  }

  /**
   * Get the start date of a given ISO week
   */
  private getWeekStartDate(year: number, week: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4) {
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    } else {
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    }
    return ISOweekStart;
  }

  /**
   * Get the end date of a given ISO week
   */
  private getWeekEndDate(year: number, week: number): Date {
    const start = this.getWeekStartDate(year, week);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  validateParameters(parameters: Record<string, any>): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    if (parameters.numberOfPolls !== undefined) {
      if (typeof parameters.numberOfPolls !== "number" || parameters.numberOfPolls < 1 || parameters.numberOfPolls > 5) {
        errors.push("numberOfPolls must be a number between 1 and 5");
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
