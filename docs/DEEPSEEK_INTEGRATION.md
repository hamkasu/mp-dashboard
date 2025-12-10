# DeepSeek AI Integration for Hansard Analysis

This document explains how to set up and use DeepSeek AI for analyzing Malaysian parliamentary debates (Hansard records).

## Overview

The MP Dashboard now supports **DeepSeek AI** as the primary AI provider for Hansard analysis, with automatic fallback to Google Gemini AI if DeepSeek is not configured.

### Why DeepSeek?

- **Cost-effective**: DeepSeek offers competitive pricing for AI services
- **High-quality outputs**: DeepSeek's models are capable of generating structured JSON responses
- **Malaysian context**: Works well with bilingual (English/Malay) parliamentary content
- **Structured data**: Excellent at producing JSON outputs for topics, sentiment, and summaries

## Features Powered by DeepSeek

When DeepSeek is configured, it will handle:

1. **Topic Extraction** - Identifies main topics discussed in parliamentary debates with relevance scores
2. **Sentiment Analysis** - Analyzes overall sentiment and key emotional points
3. **Speaker Insights** - Analyzes individual MP contributions and arguments
4. **Detailed Summaries** - Generates bilingual summaries (English/Malay) with key points
5. **Q&A System** - Answers questions about specific Hansard sessions

## Setup Instructions

### 1. Get DeepSeek API Key

1. Visit [https://platform.deepseek.com/](https://platform.deepseek.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Generate a new API key
5. Copy the API key (it will only be shown once)

### 2. Configure Environment Variables

Add your DeepSeek API key to your `.env` file:

```bash
# DeepSeek API (primary AI provider for Hansard analysis)
DEEPSEEK_API_KEY=sk-your-deepseek-api-key-here

# Optional: Keep Gemini as fallback
GEMINI_API_KEY=your-gemini-api-key-here
```

### 3. Restart the Server

After adding the API key, restart your application server:

```bash
npm run dev
```

## How It Works

### Automatic Provider Selection

The system automatically selects the AI provider based on availability:

1. **DeepSeek (Primary)**: If `DEEPSEEK_API_KEY` is configured, DeepSeek will be used
2. **Gemini (Fallback)**: If DeepSeek is not configured, the system falls back to Google Gemini

You can check which provider is being used by looking at the server logs:

```
🤖 Using DeepSeek for summary generation
```

### API Endpoints

All existing Hansard analysis endpoints work seamlessly with DeepSeek:

- `POST /api/analyze/topics/:hansardId` - Extract topics
- `POST /api/analyze/sentiment/:hansardId` - Analyze sentiment
- `POST /api/analyze/speakers/:hansardId` - Analyze speakers
- `POST /api/analyze/detailed-summary/:hansardId` - Generate detailed summary
- `POST /api/hansard/:hansardId/qa` - Ask questions about a Hansard session

## Usage Examples

### Analyzing a Hansard Record

1. Navigate to the Hansard page
2. Click on a specific parliamentary session
3. Click the "AI Insights" button
4. The system will use DeepSeek to analyze:
   - Topics discussed
   - Overall sentiment
   - Speaker contributions
   - Detailed summaries in both English and Malay

### Bulk Summary Generation (Admin)

Admins can bulk-generate summaries for all Hansard records:

```bash
POST /api/admin/generate-all-summaries
{
  "language": "en",  // or "ms" for Malay
  "limit": 10        // number of records to process
}
```

## Model Details

### DeepSeek Model Used

- **Model**: `deepseek-chat`
- **Temperature**: 0.3 (for consistent, factual outputs)
- **Max Tokens**: 4000
- **Response Format**: JSON objects for structured data

### Prompt Engineering

DeepSeek uses carefully crafted prompts for Malaysian parliamentary context:

- **Topic Extraction**: Identifies topics with relevance scores (0-100) and keywords
- **Sentiment Analysis**: Provides sentiment classification and confidence scores
- **Bilingual Support**: Generates summaries in both English and Bahasa Malaysia
- **Structured Output**: All responses are validated JSON objects

## Data Structure

### Topic Analysis Result

```json
{
  "topics": [
    {
      "topic": "National Service Training Program (PLKN)",
      "relevance": 95,
      "keywords": ["PLKN 3", "Rejimen Askar Wataniah", "Infrastruktur"]
    }
  ]
}
```

### Sentiment Analysis Result

```json
{
  "overallSentiment": "mixed",
  "sentimentScore": 55,
  "confidence": 85,
  "keyPoints": [
    {
      "point": "Debate over session management procedures",
      "sentiment": "contentious"
    }
  ]
}
```

### Speaker Insights

```json
{
  "speakers": [
    {
      "mpId": "123",
      "mpName": "YB Dato' Sri Ahmad",
      "topicsDiscussed": ["PLKN", "Budget Allocation"],
      "sentiment": "supportive",
      "keyArguments": ["Increased funding needed for PLKN infrastructure"]
    }
  ]
}
```

## Troubleshooting

### DeepSeek Not Working

If DeepSeek is not working, check the following:

1. **Verify API Key**: Ensure `DEEPSEEK_API_KEY` is set correctly in `.env`
2. **Check Server Logs**: Look for error messages in the console
3. **API Quota**: Verify you haven't exceeded your API quota
4. **Network Issues**: Ensure your server can reach `api.deepseek.com`

### Fallback to Gemini

If you see "Using Gemini" in the logs, it means:
- DeepSeek API key is not configured, OR
- There was an error with DeepSeek, and the system fell back to Gemini

### Common Errors

**Error: "DEEPSEEK_API_KEY not configured"**
- Solution: Add `DEEPSEEK_API_KEY=your-key-here` to your `.env` file

**Error: "DeepSeek API error: 401"**
- Solution: Check that your API key is valid and has not expired

**Error: "DeepSeek API error: 429"**
- Solution: You've hit rate limits. Wait a few moments or upgrade your DeepSeek plan

## Cost Optimization

DeepSeek is generally more cost-effective than other AI providers. To optimize costs:

1. **Use Caching**: The system caches analysis results to avoid duplicate requests
2. **Batch Processing**: Use the bulk summary generation endpoint for multiple records
3. **Transcript Truncation**: Transcripts are automatically truncated to 50,000 characters
4. **Rate Limiting**: Built-in delays prevent excessive API calls

## Comparison: DeepSeek vs Gemini

| Feature | DeepSeek | Gemini |
|---------|----------|--------|
| Cost | Lower | Higher |
| Speed | Fast | Very Fast |
| JSON Output | Excellent | Excellent |
| Malaysian Context | Very Good | Very Good |
| Bilingual Support | Excellent | Excellent |
| Max Context | 32K tokens | 50K tokens |

## Security & Privacy

- API keys are stored securely in environment variables
- DeepSeek API is called from the server-side only
- No parliamentary data is stored by DeepSeek (only processing)
- All analysis results are cached in your own database

## Support

If you encounter issues with DeepSeek integration:

1. Check the server logs for detailed error messages
2. Verify your API key and quota at [https://platform.deepseek.com/](https://platform.deepseek.com/)
3. Review this documentation for common troubleshooting steps
4. The system will automatically fall back to Gemini if needed

## Future Enhancements

Planned improvements for DeepSeek integration:

- [ ] Admin dashboard to select AI provider
- [ ] Real-time provider status monitoring
- [ ] Cost tracking and analytics
- [ ] A/B testing between providers
- [ ] Custom model selection per analysis type
