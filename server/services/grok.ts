/**
 * Grok AI Service for PDF Document Analysis and MP Comparison
 * Integration: OpenRouter with Gemini 2.0 Flash
 */

// API Configuration
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const GEMINI_MODEL = "google/gemini-2.0-flash-exp:free"; // Gemini 2.0 Flash (free tier)

export interface GrokReviewResult {
  review: string; // Markdown-formatted comprehensive review
  generatedAt: Date;
}

export interface GrokComparisonResult {
  comparison: string; // Markdown-formatted comparison analysis
  generatedAt: Date;
}

/**
 * Analyze a PDF document using Grok AI
 * @param pdfText - Extracted text content from the PDF
 * @param documentType - Type of document (e.g., "Dewan Rakyat Proceedings", "Bill", etc.)
 * @param filename - Original filename for context
 * @returns Comprehensive review and analysis
 */
export async function analyzeDocumentWithGrok(
  pdfText: string,
  documentType: string = "Parliamentary Document",
  filename: string = "document.pdf"
): Promise<GrokReviewResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured. Please set the OPENROUTER_API_KEY environment variable.");
  }

  try {
    // Limit text to avoid token limits (Grok supports up to 128K tokens)
    // Using ~100K chars as a safe limit (~25K tokens)
    const truncatedText = pdfText.substring(0, 100000);

    const systemPrompt = `You are an expert analyst for Malaysian parliamentary documents, including Hansard proceedings, bills, parliamentary answers, and other legislative documents.

When analyzing documents, provide:
1. **Document Overview**: Type, date, key participants, session information
2. **Structural Analysis**: How the document is organized, main sections
3. **Key Content**: Main topics, debates, decisions, votes, announcements
4. **Notable Elements**:
   - Important legislation discussed or passed
   - Significant policy announcements
   - Controversial points or heated debates
   - Questions and answers
   - Ceremonial elements
5. **Themes and Implications**: Underlying political themes, policy direction, potential impacts
6. **Observations**: Quality of debate, attendance, procedural notes

Format your response in clear, well-structured Markdown with headers, bullet points, and emphasis where appropriate. Be comprehensive but concise. Focus on substantive content that matters to citizens and researchers.`;

    const userPrompt = `Please provide a comprehensive review and analysis of this ${documentType}.

**Filename**: ${filename}

**Document Content**:
${truncatedText}${pdfText.length > 100000 ? '\n\n[Document truncated for analysis]' : ''}

Provide a detailed, insightful analysis following the structure outlined in your instructions.`;

    console.log(`[Grok] Analyzing ${documentType} (${pdfText.length} chars, ${truncatedText.length} sent)`);

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mp-dashboard.com", // Optional, for rankings
        "X-Title": "MP Dashboard", // Optional, for rankings
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Grok] API error:", response.status, errorText);

      // Provide more helpful error messages
      if (response.status === 401) {
        throw new Error("Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY configuration.");
      } else if (response.status === 429) {
        throw new Error("OpenRouter API rate limit exceeded. Please try again later.");
      } else if (response.status === 500) {
        throw new Error("OpenRouter API server error. Please try again later.");
      }

      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const review = data.choices?.[0]?.message?.content;

    if (!review) {
      throw new Error("No content in Grok response");
    }

    console.log(`[Grok] Successfully generated review (${review.length} chars)`);

    return {
      review,
      generatedAt: new Date(),
    };
  } catch (error: any) {
    console.error("[Grok] Error analyzing document:", error);
    throw new Error(`Failed to analyze document: ${error.message}`);
  }
}

/**
 * Compare two Members of Parliament using Grok AI
 * @param mp1Card - First MP's report card data
 * @param mp2Card - Second MP's report card data
 * @returns Comprehensive comparison analysis
 */
export async function compareMPs(mp1Card: any, mp2Card: any): Promise<GrokComparisonResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY not configured. Please set the OPENROUTER_API_KEY environment variable.");
  }

  try {
    const systemPrompt = `You are an expert political analyst specializing in Malaysian parliamentary affairs and Member of Parliament (MP) performance evaluation.

When comparing two MPs, provide:
1. **Performance Overview**: Overall grade and score comparison with context
2. **Attendance & Participation**: Detailed comparison of attendance rates, speeches, questions asked, and bills raised
3. **Conduct & Behavior**: Analysis of parliamentary conduct scores and any noted issues
4. **Constituency Impact**: Comparison of their impact on their respective constituencies
5. **Strengths & Weaknesses**: What each MP excels at and where they need improvement
6. **Key Differences**: Highlight the most significant differences between the two
7. **Overall Assessment**: Who performs better in which areas and why

Be objective, fair, and data-driven. Focus on factual performance metrics while providing meaningful context and insights.`;

    const mp1Summary = `
**${mp1Card.mp.name}** (${mp1Card.mp.party})
- Constituency: ${mp1Card.mp.constituency}, ${mp1Card.mp.state}
- Overall Grade: ${mp1Card.grade}
- Overall Score: ${mp1Card.overallScore}/100
- Attendance: ${mp1Card.attendancePercentage}% (Score: ${mp1Card.attendanceScore})
- Participation Score: ${mp1Card.participationScore}
- Conduct Score: ${mp1Card.conductScore}
- Constituency Impact Score: ${mp1Card.constituencyImpactScore}
- Total Speeches: ${mp1Card.totalSpeeches}
- Questions Asked: ${mp1Card.questionsAsked}
- Bills Raised: ${mp1Card.billsRaised || 0}
- Inappropriate Language Count: ${mp1Card.inappropriateLanguageCount || 0}
${mp1Card.mp.title ? `- Title/Role: ${mp1Card.mp.title}` : ''}
`;

    const mp2Summary = `
**${mp2Card.mp.name}** (${mp2Card.mp.party})
- Constituency: ${mp2Card.mp.constituency}, ${mp2Card.mp.state}
- Overall Grade: ${mp2Card.grade}
- Overall Score: ${mp2Card.overallScore}/100
- Attendance: ${mp2Card.attendancePercentage}% (Score: ${mp2Card.attendanceScore})
- Participation Score: ${mp2Card.participationScore}
- Conduct Score: ${mp2Card.conductScore}
- Constituency Impact Score: ${mp2Card.constituencyImpactScore}
- Total Speeches: ${mp2Card.totalSpeeches}
- Questions Asked: ${mp2Card.questionsAsked}
- Bills Raised: ${mp2Card.billsRaised || 0}
- Inappropriate Language Count: ${mp2Card.inappropriateLanguageCount || 0}
${mp2Card.mp.title ? `- Title/Role: ${mp2Card.mp.title}` : ''}
`;

    const userPrompt = `Please provide a comprehensive comparison of these two Malaysian Members of Parliament:

**MP 1:**
${mp1Summary}

**MP 2:**
${mp2Summary}

**Scoring Methodology:**
- Overall Score is calculated from: Attendance (25%), Participation (25%), Conduct (25%), Constituency Impact (25%)
- Grades: A (90-100), B (80-89), C (70-79), D (60-69), F (<60)

Provide a detailed, insightful comparison following the structure outlined in your instructions.`;

    console.log(`[Grok] Comparing ${mp1Card.mp.name} vs ${mp2Card.mp.name}`);

    const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://mp-dashboard.com", // Optional, for rankings
        "X-Title": "MP Dashboard", // Optional, for rankings
      },
      body: JSON.stringify({
        model: GEMINI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.4,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Grok] API error:", response.status, errorText);

      if (response.status === 401) {
        throw new Error("Invalid OpenRouter API key. Please check your OPENROUTER_API_KEY configuration.");
      } else if (response.status === 429) {
        throw new Error("OpenRouter API rate limit exceeded. Please try again later.");
      } else if (response.status === 500) {
        throw new Error("OpenRouter API server error. Please try again later.");
      }

      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const comparison = data.choices?.[0]?.message?.content;

    if (!comparison) {
      throw new Error("No content in response");
    }

    console.log(`[Grok] Successfully generated comparison (${comparison.length} chars)`);

    return {
      comparison,
      generatedAt: new Date(),
    };
  } catch (error: any) {
    console.error("[Grok] Error comparing MPs:", error);
    throw new Error(`Failed to compare MPs: ${error.message}`);
  }
}

/**
 * Check if OpenRouter API is properly configured
 */
export function isGrokConfigured(): boolean {
  return !!OPENROUTER_API_KEY;
}

/**
 * Get configuration status for debugging
 */
export function getGrokStatus(): { configured: boolean; model: string } {
  return {
    configured: isGrokConfigured(),
    model: GEMINI_MODEL,
  };
}
