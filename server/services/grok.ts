/**
 * Grok AI Service for PDF Document Analysis
 * Integration: xai_grok
 */

// API Configuration
const GROK_API_KEY = process.env.GROK_API_KEY;
const GROK_BASE_URL = "https://api.x.ai/v1";
const GROK_MODEL = "grok-beta"; // Grok's latest model

export interface GrokReviewResult {
  review: string; // Markdown-formatted comprehensive review
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
  if (!GROK_API_KEY) {
    throw new Error("GROK_API_KEY not configured. Please set the GROK_API_KEY environment variable.");
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

    const response = await fetch(`${GROK_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROK_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROK_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.3,
        max_tokens: 4000,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Grok] API error:", response.status, errorText);

      // Provide more helpful error messages
      if (response.status === 401) {
        throw new Error("Invalid Grok API key. Please check your GROK_API_KEY configuration.");
      } else if (response.status === 429) {
        throw new Error("Grok API rate limit exceeded. Please try again later.");
      } else if (response.status === 500) {
        throw new Error("Grok API server error. Please try again later.");
      }

      throw new Error(`Grok API error: ${response.status} - ${errorText}`);
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
    throw new Error(`Failed to analyze document with Grok: ${error.message}`);
  }
}

/**
 * Check if Grok API is properly configured
 */
export function isGrokConfigured(): boolean {
  return !!GROK_API_KEY;
}

/**
 * Get Grok configuration status for debugging
 */
export function getGrokStatus(): { configured: boolean; model: string } {
  return {
    configured: isGrokConfigured(),
    model: GROK_MODEL,
  };
}
