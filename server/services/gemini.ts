import { GoogleGenAI } from "@google/genai";

// DON'T DELETE THIS COMMENT
// Follow these instructions when using this blueprint:
// - Note that the newest Gemini model series is "gemini-2.5-flash" or gemini-2.5-pro"
//   - do not change this unless explicitly requested by the user

// This API key is from Gemini Developer API Key, not vertex AI API Key
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

Respond with JSON in this format:
{
  "topics": [
    {"topic": "string", "relevance": number, "keywords": ["string"]}
  ]
}`;

    const prompt = `Analyze this parliamentary debate transcript and extract the main topics.

Speakers involved: ${speakerNames.join(', ')}

Transcript:
${transcript.substring(0, 50000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            topics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  relevance: { type: "number" },
                  keywords: { type: "array", items: { type: "string" } },
                },
                required: ["topic", "relevance", "keywords"],
              },
            },
          },
          required: ["topics"],
        },
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const rawJson = response.response?.text();
    if (!rawJson) {
      console.error("Empty response from Gemini API for topic extraction");
      return [];
    }

    try {
      const data = JSON.parse(rawJson);
      return data.topics || [];
    } catch (parseError) {
      console.error("Failed to parse topic extraction JSON:", parseError, "Raw:", rawJson);
      return [];
    }
  } catch (error) {
    console.error("Error in topic extraction:", error);
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

Respond with JSON in this format:
{
  "overallSentiment": "string",
  "sentimentScore": number,
  "confidence": number,
  "keyPoints": [{"point": "string", "sentiment": "string"}]
}`;

    const prompt = `Analyze the sentiment of this parliamentary debate:

${transcript.substring(0, 50000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            overallSentiment: { type: "string" },
            sentimentScore: { type: "number" },
            confidence: { type: "number" },
            keyPoints: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  point: { type: "string" },
                  sentiment: { type: "string" },
                },
                required: ["point", "sentiment"],
              },
            },
          },
          required: ["overallSentiment", "sentimentScore", "confidence", "keyPoints"],
        },
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const rawJson = response.response?.text();
    if (!rawJson) {
      throw new Error("Empty response from Gemini API for sentiment analysis");
    }

    try {
      return JSON.parse(rawJson);
    } catch (parseError) {
      console.error("Failed to parse sentiment analysis JSON:", parseError, "Raw:", rawJson);
      throw new Error(`Failed to parse sentiment analysis response: ${parseError}`);
    }
  } catch (error) {
    console.error("Error in sentiment analysis:", error);
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

Respond with JSON in this format:
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
    const prompt = `Analyze what each speaker discussed in this parliamentary debate.

Speakers:
${speakerList}

Transcript:
${transcript.substring(0, 50000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            speakers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  mpId: { type: "string" },
                  mpName: { type: "string" },
                  topicsDiscussed: { type: "array", items: { type: "string" } },
                  sentiment: { type: "string" },
                  keyArguments: { type: "array", items: { type: "string" } },
                },
                required: ["mpId", "mpName", "topicsDiscussed", "sentiment", "keyArguments"],
              },
            },
          },
          required: ["speakers"],
        },
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const rawJson = response.response?.text();
    if (!rawJson) {
      console.error("Empty response from Gemini API for speaker analysis");
      return [];
    }

    try {
      const data = JSON.parse(rawJson);
      return data.speakers || [];
    } catch (parseError) {
      console.error("Failed to parse speaker analysis JSON:", parseError, "Raw:", rawJson);
      return [];
    }
  } catch (error) {
    console.error("Error in speaker analysis:", error);
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

Respond with JSON in this format:
{
  "keyArguments": ["string"],
  "decisions": ["string"],
  "actionItems": ["string"],
  "controversialPoints": ["string"],
  "summary": "string"
}`;

    const prompt = `Provide a detailed summary of this parliamentary debate:

${transcript.substring(0, 50000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            keyArguments: { type: "array", items: { type: "string" } },
            decisions: { type: "array", items: { type: "string" } },
            actionItems: { type: "array", items: { type: "string" } },
            controversialPoints: { type: "array", items: { type: "string" } },
            summary: { type: "string" },
          },
          required: ["keyArguments", "decisions", "actionItems", "controversialPoints", "summary"],
        },
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const rawJson = response.response?.text();
    if (!rawJson) {
      throw new Error("Empty response from Gemini API for detailed summary");
    }

    try {
      return JSON.parse(rawJson);
    } catch (parseError) {
      console.error("Failed to parse detailed summary JSON:", parseError, "Raw:", rawJson);
      throw new Error(`Failed to parse detailed summary response: ${parseError}`);
    }
  } catch (error) {
    console.error("Error in detailed summary:", error);
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

Respond with JSON in this format:
{
  "answer": "string",
  "relevanceScore": number
}`;

    const prompt = `Question: ${question}

Context from parliamentary debate:
${context.substring(0, 40000)}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            answer: { type: "string" },
            relevanceScore: { type: "number" },
          },
          required: ["answer", "relevanceScore"],
        },
      },
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const rawJson = response.response?.text();
    if (!rawJson) {
      throw new Error("Empty response from Gemini API for Q&A");
    }

    try {
      return JSON.parse(rawJson);
    } catch (parseError) {
      console.error("Failed to parse Q&A JSON:", parseError, "Raw:", rawJson);
      throw new Error(`Failed to parse Q&A response: ${parseError}`);
    }
  } catch (error) {
    console.error("Error in Q&A:", error);
    throw new Error(`Failed to answer question: ${error}`);
  }
}
