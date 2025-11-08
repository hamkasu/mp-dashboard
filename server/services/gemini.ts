import { GoogleGenerativeAI } from "@google/generative-ai";

if (!process.env.GEMINI_API_KEY) {
  console.warn("GEMINI_API_KEY is not set. AI summarization will not work.");
}

const genAI = process.env.GEMINI_API_KEY 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export interface SummarizeOptions {
  maxLength?: number;
  language?: string;
}

export async function summarizeHansardTranscript(
  transcript: string,
  options: SummarizeOptions = {}
): Promise<string> {
  if (!genAI) {
    throw new Error("Gemini API key is not configured. Please set GEMINI_API_KEY environment variable.");
  }

  const { maxLength = 500, language = "English" } = options;

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `You are an expert parliamentary analyst. Summarize the following Malaysian Parliament (Dewan Rakyat) Hansard transcript into ${language}.

Instructions:
- Provide a clear, concise summary of the key discussions, decisions, and debates
- Highlight important motions, votes, and outcomes
- Identify notable statements from MPs
- Keep the summary under ${maxLength} words
- Maintain political neutrality
- If the transcript is in Malay, translate and summarize into ${language}

Hansard Transcript:
${transcript}

Summary:`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    const summary = response.text();
    
    return summary.trim();
  } catch (error) {
    console.error("Error generating summary with Gemini:", error);
    throw new Error("Failed to generate summary. Please try again later.");
  }
}
