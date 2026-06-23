/**
 * Phase 4: Hansard Review Queue API Routes
 * Solo reviewer workflow for pending tags (admin only)
 */

import { Express, Request, Response } from 'express';
import { db } from './db';
import {
  hansardTags,
  hansardSpeeches,
  hansardRecords,
  mps,
  REVIEW_STATUS_VALUES,
} from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface ReviewQueueItem {
  tagId: string;
  speechId: string;
  mpName: string;
  constituency: string;
  sittingDate: string;
  tagType: 'topic' | 'sentiment';
  tagValue: string;
  confidence: number;
  evidenceQuote: string;
  reviewFlagReason?: string;
  targetType?: string;
  targetEntity?: string;
}

interface ReviewQueueResponse {
  items: ReviewQueueItem[];
  total: number;
  sortBy: 'confidence_asc' | 'confidence_desc' | 'date';
  filterBy: 'all' | 'topic' | 'sentiment';
}

export function setupHansardReviewRoutes(app: Express) {
  // GET /admin/hansard/review-queue
  // Returns pending_review tags with various sort/filter options
  app.get('/admin/hansard/review-queue', async (req: Request, res: Response) => {
    try {
      // Check admin auth (implement based on your auth middleware)
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const sortBy = (req.query.sortBy as string) || 'confidence_asc';
      const filterBy = (req.query.filterBy as string) || 'all';

      // Get pending_review tags
      let query = db
        .select({
          tag: hansardTags,
          speech: hansardSpeeches,
          record: hansardRecords,
          mp: mps,
        })
        .from(hansardTags)
        .innerJoin(hansardSpeeches, eq(hansardTags.speechId, hansardSpeeches.id))
        .innerJoin(hansardRecords, eq(hansardSpeeches.hansardRecordId, hansardRecords.id))
        .innerJoin(mps, eq(hansardSpeeches.mpId, mps.id))
        .where(eq(hansardTags.reviewStatus, 'pending_review'));

      // Apply filter
      if (filterBy !== 'all') {
        const conditions = and(eq(hansardTags.reviewStatus, 'pending_review'));
        // Filter logic already applied above
      }

      const results = await query;

      // Sort
      results.sort((a, b) => {
        if (sortBy === 'confidence_asc') {
          return a.tag.confidence - b.tag.confidence; // Hardest first
        } else if (sortBy === 'confidence_desc') {
          return b.tag.confidence - a.tag.confidence; // Easiest first
        } else if (sortBy === 'date') {
          return new Date(b.record.sessionDate).getTime() - new Date(a.record.sessionDate).getTime();
        }
        return 0;
      });

      // Format response
      const items: ReviewQueueItem[] = results.map(r => ({
        tagId: r.tag.id,
        speechId: r.speech.id,
        mpName: r.mp.name,
        constituency: r.mp.constituency,
        sittingDate: r.record.sessionDate.toISOString().split('T')[0],
        tagType: r.tag.tagType as 'topic' | 'sentiment',
        tagValue: r.tag.tagValue,
        confidence: r.tag.confidence,
        evidenceQuote: r.tag.evidenceQuote || '',
        reviewFlagReason: r.tag.reviewFlagReason || undefined,
        targetType: r.tag.targetType || undefined,
        targetEntity: r.tag.targetEntity || undefined,
      }));

      res.json({
        items,
        total: items.length,
        sortBy,
        filterBy,
      } as ReviewQueueResponse);
    } catch (error) {
      console.error('Error fetching review queue:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // GET /admin/hansard/review/<speech_id>/full-text
  // Returns full speech text for review context
  app.get('/admin/hansard/review/:speechId/full-text', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const speech = await db.query.hansardSpeeches.findFirst({
        where: eq(hansardSpeeches.id, req.params.speechId),
      });

      if (!speech) {
        return res.status(404).json({ error: 'Speech not found' });
      }

      res.json({ speechText: speech.speechText });
    } catch (error) {
      console.error('Error fetching speech text:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /admin/hansard/review/<tag_id>/approve
  app.post('/admin/hansard/review/:tagId/approve', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const reviewedAt = new Date();

      await db
        .update(hansardTags)
        .set({
          reviewStatus: 'approved',
          reviewedAt,
          reviewedBy: req.session.userId,
        })
        .where(eq(hansardTags.id, req.params.tagId));

      res.json({ success: true, message: 'Tag approved' });
    } catch (error) {
      console.error('Error approving tag:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /admin/hansard/review/<tag_id>/reject
  app.post('/admin/hansard/review/:tagId/reject', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const reviewedAt = new Date();

      await db
        .update(hansardTags)
        .set({
          reviewStatus: 'rejected',
          reviewedAt,
          reviewedBy: req.session.userId,
        })
        .where(eq(hansardTags.id, req.params.tagId));

      res.json({ success: true, message: 'Tag rejected' });
    } catch (error) {
      console.error('Error rejecting tag:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /admin/hansard/review/<tag_id>/edit
  // Accepts new tag_value (topic) or target_entity (sentiment)
  app.post('/admin/hansard/review/:tagId/edit', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { tagValue, targetEntity } = req.body;
      const reviewedAt = new Date();

      const updates: Partial<typeof hansardTags.$inferSelect> = {
        reviewStatus: 'edited',
        reviewedAt,
        reviewedBy: req.session.userId,
      };

      if (tagValue) {
        updates.tagValue = tagValue;
      }

      if (targetEntity !== undefined) {
        updates.targetEntity = targetEntity || null;
      }

      await db.update(hansardTags).set(updates).where(eq(hansardTags.id, req.params.tagId));

      res.json({ success: true, message: 'Tag edited' });
    } catch (error) {
      console.error('Error editing tag:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // POST /admin/hansard/review/bulk-approve
  // Accept explicit list of tag IDs (computed client-side)
  app.post('/admin/hansard/review/bulk-approve', async (req: Request, res: Response) => {
    try {
      if (!req.session?.userId || !req.session?.isAdmin) {
        return res.status(403).json({ error: 'Admin access required' });
      }

      const { tagIds } = req.body;

      if (!Array.isArray(tagIds) || tagIds.length === 0) {
        return res.status(400).json({ error: 'tagIds must be non-empty array' });
      }

      const reviewedAt = new Date();

      for (const tagId of tagIds) {
        await db
          .update(hansardTags)
          .set({
            reviewStatus: 'approved',
            reviewedAt,
            reviewedBy: req.session.userId,
          })
          .where(eq(hansardTags.id, tagId));
      }

      res.json({ success: true, message: `Approved ${tagIds.length} tags` });
    } catch (error) {
      console.error('Error bulk-approving tags:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
