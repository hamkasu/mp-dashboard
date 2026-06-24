/**
 * Hansard NLP Tagging Service using Anthropic Claude API
 * Tags speeches with topics, sentiment, and entities
 */

import Anthropic from '@anthropic-ai/sdk';
import { HansardTopicVocabulary } from '@shared/schema';

interface TaggingToolInput {
  is_substantive: boolean;
  primary_language: 'bm' | 'en' | 'mixed';
  topics: Array<{
    tag: string;
    is_new_tag: boolean;
    confidence: number;
    evidence_quote: string;
  }>;
  sentiment: {
    tone: 'supportive' | 'critical' | 'neutral_informational' | 'mixed';
    confidence: number;
    target_type: 'government_policy' | 'specific_minister' | 'specific_mp' | 'opposition_general' | 'none';
    target_entity?: string;
    evidence_quote?: string;
  };
  entities_mentioned: Array<{
    name: string;
    type: 'organization' | 'policy_or_bill' | 'place' | 'statistic_cited';
  }>;
  review_flag_reason: string;
}

interface SpeechTaggingResult {
  success: boolean;
  isSubstantive: boolean;
  primaryLanguage: 'bm' | 'en' | 'mixed';
  topics: Array<{
    tag: string;
    isNewTag: boolean;
    confidence: number; // 0-100
    evidenceQuote: string;
  }>;
  sentiment: {
    tone: 'supportive' | 'critical' | 'neutral_informational' | 'mixed';
    confidence: number; // 0-100
    targetType: 'government_policy' | 'specific_minister' | 'specific_mp' | 'opposition_general' | 'none';
    targetEntity?: string;
    evidenceQuote?: string;
  };
  entities: Array<{
    name: string;
    type: 'organization' | 'policy_or_bill' | 'place' | 'statistic_cited';
  }>;
  reviewFlagReason: string;
  error?: string;
}

export class HansardAnthropicTagger {
  private client: Anthropic;
  private controlledVocab: Map<string, HansardTopicVocabulary>;

  constructor(controlledVocab: HansardTopicVocabulary[] = []) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable not set');
    }

    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Build vocab map for quick lookup
    this.controlledVocab = new Map();
    for (const vocab of controlledVocab) {
      this.controlledVocab.set(vocab.tagSlug, vocab);
    }
  }

  async tagSpeech(
    speechText: string,
    mpName: string,
    sittingDate: Date
  ): Promise<SpeechTaggingResult> {
    // Clean speech text: remove structural noise
    const cleanedText = this.cleanHansardNoise(speechText);

    // Build vocab list for the prompt
    const vocabList = Array.from(this.controlledVocab.values())
      .filter(v => v.status === 'active')
      .map(v => `- ${v.tagSlug}: ${v.displayLabel}`)
      .join('\n');

    const systemPrompt = `You are tagging Malaysian parliamentary Hansard transcripts for a civic-data platform.

Speeches frequently code-switch between Bahasa Malaysia and English mid-sentence. This is normal register for Dewan Rakyat/Dewan Negara debate, not an error. Read across both languages as a single unit of meaning -- do not tag based on whichever language segment happens to be longer.

Distinguish substantive content from procedural boilerplate. Phrases like "dengan izin Tuan Yang di-Pertua", "Yang Berhormat Menteri", repeated honorifics, and standard motion-reading language carry no topical or sentiment information -- do not let their volume dilute your read of the actual content.

When assigning topics, prefer the controlled vocabulary list provided. Only set is_new_tag=true when none of the existing tags reasonably fit -- proliferating near-duplicate tags destroys searchability over time.

Confidence should reflect substantive engagement, not mere mention. An MP who references a topic in passing while talking about something else should score low confidence on that tag, even though the topic is mentioned.

Sentiment target_entity must be a real named individual or organization from the text, never inferred or assumed. If the speech criticizes "the government's approach" without naming anyone, target_type is government_policy and target_entity should be left empty.`;

    const userPrompt = `Analyze this Malaysian parliamentary speech and extract structured topic, sentiment, and entity data.

**Speech Context:**
- Speaker: ${mpName}
- Sitting Date: ${sittingDate.toISOString().split('T')[0]}

**Controlled Topic Vocabulary (prefer these):**
${vocabList}

**Speech Text:**
${cleanedText}

Extract structured data using the tool provided.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2000,
        system: systemPrompt,
        tools: [
          {
            name: 'tag_hansard_speech',
            description: 'Extract structured topic, sentiment, and entity data from a single Malaysian parliamentary speech turn.',
            input_schema: {
              type: 'object',
              properties: {
                is_substantive: {
                  type: 'boolean',
                  description: 'False if this turn is purely procedural (e.g. "bill read a first time", point of order with no debate, vote tally announcement) with no actual policy content to tag.',
                },
                primary_language: {
                  type: 'string',
                  enum: ['bm', 'en', 'mixed'],
                  description: 'Dominant language or mix',
                },
                topics: {
                  type: 'array',
                  maxItems: 5,
                  items: {
                    type: 'object',
                    properties: {
                      tag: { type: 'string', description: 'Topic slug or new tag' },
                      is_new_tag: { type: 'boolean' },
                      confidence: { type: 'number', description: '0-100 confidence score' },
                      evidence_quote: { type: 'string', description: 'Exact quote from speech' },
                    },
                    required: ['tag', 'is_new_tag', 'confidence', 'evidence_quote'],
                  },
                },
                sentiment: {
                  type: 'object',
                  properties: {
                    tone: {
                      type: 'string',
                      enum: ['supportive', 'critical', 'neutral_informational', 'mixed'],
                    },
                    confidence: { type: 'number', description: '0-100' },
                    target_type: {
                      type: 'string',
                      enum: ['government_policy', 'specific_minister', 'specific_mp', 'opposition_general', 'none'],
                    },
                    target_entity: { type: 'string', description: 'Named individual/org, only if target_type is not "none"' },
                    evidence_quote: { type: 'string' },
                  },
                  required: ['tone', 'confidence', 'target_type'],
                },
                entities_mentioned: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: {
                        type: 'string',
                        enum: ['organization', 'policy_or_bill', 'place', 'statistic_cited'],
                      },
                    },
                    required: ['name', 'type'],
                  },
                },
                review_flag_reason: {
                  type: 'string',
                  description: 'If any topic or sentiment confidence falls in 0.45-0.74 band, explain why. Empty string otherwise.',
                },
              },
              required: ['is_substantive', 'primary_language', 'topics', 'sentiment', 'entities_mentioned', 'review_flag_reason'],
            },
          },
        ],
        messages: [{ role: 'user', content: userPrompt }],
        tool_choice: { type: 'tool', name: 'tag_hansard_speech' },
      });

      // Extract tool use result
      const toolUse = response.content.find(block => block.type === 'tool_use');
      if (!toolUse || toolUse.type !== 'tool_use') {
        return {
          success: false,
          isSubstantive: false,
          primaryLanguage: 'en',
          topics: [],
          sentiment: {
            tone: 'neutral_informational',
            confidence: 0,
            targetType: 'none',
          },
          entities: [],
          reviewFlagReason: 'Tool response invalid',
          error: 'No tool use in response',
        };
      }

      const input = toolUse.input as TaggingToolInput;

      // Convert confidence from 0-100 scale
      return {
        success: true,
        isSubstantive: input.is_substantive,
        primaryLanguage: input.primary_language,
        topics: input.topics.map(t => ({
          tag: t.tag,
          isNewTag: t.is_new_tag,
          confidence: Math.round(t.confidence),
          evidenceQuote: t.evidence_quote,
        })),
        sentiment: {
          tone: input.sentiment.tone,
          confidence: Math.round(input.sentiment.confidence),
          targetType: input.sentiment.target_type,
          targetEntity: input.sentiment.target_entity,
          evidenceQuote: input.sentiment.evidence_quote,
        },
        entities: input.entities_mentioned,
        reviewFlagReason: input.review_flag_reason,
      };
    } catch (error) {
      console.error('Error tagging speech:', error);
      return {
        success: false,
        isSubstantive: false,
        primaryLanguage: 'en',
        topics: [],
        sentiment: {
          tone: 'neutral_informational',
          confidence: 0,
          targetType: 'none',
        },
        entities: [],
        reviewFlagReason: '',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private cleanHansardNoise(text: string): string {
    // Remove timestamps and page breaks
    let cleaned = text
      .replace(/\[\d{1,2}:\d{2}\s*(?:AM|PM)?\]/g, '') // [10:30 AM] timestamps
      .replace(/\[Dewan\s+Rakyat\s+(?:bersidang|ditangguh)\]/gi, '') // [Dewan Rakyat bersidang]
      .replace(/\[[\w\s]+bersidang\]/gi, '') // [_____ bersidang]
      .replace(/^Page\s+\d+/gm, '') // Page breaks
      .replace(/___+/g, ''); // Underline separators

    // Collapse excessive whitespace
    cleaned = cleaned
      .replace(/\n{3,}/g, '\n\n') // Max 2 newlines
      .replace(/[ \t]+/g, ' '); // Single spaces

    return cleaned.trim();
  }
}
