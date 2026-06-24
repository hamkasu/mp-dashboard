/**
 * Phase 4: Hansard Review Queue UI
 * Solo reviewer workflow for pending tags
 */

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronUp, Check, X, Edit2, Eye } from 'lucide-react';

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

type SortOption = 'confidence_asc' | 'confidence_desc' | 'date';
type FilterOption = 'all' | 'topic' | 'sentiment';

export function HansardReviewQueue() {
  const [items, setItems] = useState<ReviewQueueItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('confidence_asc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [selectedItem, setSelectedItem] = useState<ReviewQueueItem | null>(null);
  const [expandedSpeechId, setExpandedSpeechId] = useState<string | null>(null);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [reviewedCount, setReviewedCount] = useState(0);
  const [bulkSelectionMode, setBulkSelectionMode] = useState(false);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());

  // Fetch review queue
  useEffect(() => {
    const fetchQueue = async () => {
      try {
        const response = await fetch(`/admin/hansard/review-queue?sortBy=${sortBy}&filterBy=${filterBy}`);
        const data = await response.json();
        setItems(data.items || []);
        setFilteredItems(data.items || []);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching review queue:', error);
        setLoading(false);
      }
    };

    fetchQueue();
  }, [sortBy, filterBy]);

  // Refilter items when sort/filter changes
  useEffect(() => {
    let filtered = items;
    if (filterBy !== 'all') {
      filtered = filtered.filter(item => item.tagType === filterBy);
    }

    filtered.sort((a, b) => {
      if (sortBy === 'confidence_asc') {
        return a.confidence - b.confidence;
      } else if (sortBy === 'confidence_desc') {
        return b.confidence - a.confidence;
      } else if (sortBy === 'date') {
        return new Date(b.sittingDate).getTime() - new Date(a.sittingDate).getTime();
      }
      return 0;
    });

    setFilteredItems(filtered);
  }, [sortBy, filterBy, items]);

  // Approve tag
  const handleApprove = async (tagId: string) => {
    try {
      const response = await fetch(`/admin/hansard/review/${tagId}/approve`, {
        method: 'POST',
      });

      if (response.ok) {
        setItems(items.filter(item => item.tagId !== tagId));
        setReviewedCount(prev => prev + 1);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error approving tag:', error);
    }
  };

  // Reject tag
  const handleReject = async (tagId: string) => {
    try {
      const response = await fetch(`/admin/hansard/review/${tagId}/reject`, {
        method: 'POST',
      });

      if (response.ok) {
        setItems(items.filter(item => item.tagId !== tagId));
        setReviewedCount(prev => prev + 1);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error rejecting tag:', error);
    }
  };

  // Edit tag
  const handleEditTag = async (tagId: string, newValue: string) => {
    try {
      const response = await fetch(`/admin/hansard/review/${tagId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagValue: newValue }),
      });

      if (response.ok) {
        // Update local state
        setItems(
          items.map(item =>
            item.tagId === tagId ? { ...item, tagValue: newValue } : item
          )
        );
        setEditingTagId(null);
        setEditValue('');
      }
    } catch (error) {
      console.error('Error editing tag:', error);
    }
  };

  // Bulk approve similar
  const handleBulkApproveSimilar = async (item: ReviewQueueItem) => {
    const similar = items.filter(
      i =>
        i.mpName === item.mpName &&
        i.sittingDate === item.sittingDate &&
        i.tagType === 'topic'
    );

    const tagIds = similar.map(i => i.tagId);

    try {
      const response = await fetch('/admin/hansard/review/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tagIds }),
      });

      if (response.ok) {
        setItems(items.filter(i => !tagIds.includes(i.tagId)));
        setReviewedCount(prev => prev + similar.length);
        setSelectedItem(null);
      }
    } catch (error) {
      console.error('Error bulk-approving:', error);
    }
  };

  // Expand full speech text
  const handleExpandSpeech = async (speechId: string) => {
    if (expandedSpeechId === speechId) {
      setExpandedSpeechId(null);
      return;
    }

    try {
      const response = await fetch(`/admin/hansard/review/${speechId}/full-text`);
      const data = await response.json();
      setExpandedSpeechId(speechId);
    } catch (error) {
      console.error('Error fetching speech text:', error);
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Loading review queue...</div>;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Hansard Review Queue</h1>
        <p className="text-gray-600">
          Review {filteredItems.length} pending tags
          {reviewedCount > 0 && ` (${reviewedCount} reviewed today)`}
        </p>
      </div>

      {/* Controls */}
      <div className="flex gap-4 mb-6">
        <div className="flex gap-2">
          <label className="text-sm font-medium">Sort by:</label>
          <Select value={sortBy} onValueChange={(val) => setSortBy(val as SortOption)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="confidence_asc">Confidence (Lowest First)</SelectItem>
              <SelectItem value="confidence_desc">Confidence (Highest First)</SelectItem>
              <SelectItem value="date">Date (Newest First)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-2">
          <label className="text-sm font-medium">Filter:</label>
          <Select value={filterBy} onValueChange={(val) => setFilterBy(val as FilterOption)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              <SelectItem value="topic">Topics Only</SelectItem>
              <SelectItem value="sentiment">Sentiment Only</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="ml-auto">
          <p className="text-sm text-gray-500">
            {reviewedCount > 0 && `${reviewedCount} reviewed today`}
          </p>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-3">
        {filteredItems.length === 0 ? (
          <Card className="p-8 text-center text-gray-500">
            <p>✅ No pending tags to review</p>
          </Card>
        ) : (
          filteredItems.map(item => (
            <Card
              key={item.tagId}
              className={`p-4 border-l-4 ${
                item.tagType === 'sentiment'
                  ? 'border-l-red-500 bg-red-50'
                  : 'border-l-blue-500 bg-blue-50'
              }`}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">{item.mpName}</span>
                    <span className="text-xs text-gray-600">{item.constituency}</span>
                  </div>
                  <div className="text-xs text-gray-600">
                    {item.sittingDate} | Session
                  </div>
                </div>

                {/* Badge for tag type */}
                <Badge
                  variant={item.tagType === 'sentiment' ? 'destructive' : 'default'}
                  className={
                    item.tagType === 'sentiment'
                      ? 'bg-red-600'
                      : 'bg-blue-600'
                  }
                >
                  {item.tagType === 'sentiment'
                    ? `${item.tagValue} (${item.targetType || 'none'})`
                    : item.tagValue}
                </Badge>
              </div>

              {/* Evidence quote */}
              <div className="mb-3 p-3 bg-white rounded border border-gray-200">
                <p className="text-sm italic text-gray-700">
                  "{item.evidenceQuote.substring(0, 150)}
                  {item.evidenceQuote.length > 150 ? '...' : ''}"
                </p>
              </div>

              {/* Confidence + flag reason */}
              <div className="mb-3 flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Confidence:</span>
                    <span
                      className={`text-sm font-bold ${
                        item.confidence >= 75
                          ? 'text-green-600'
                          : item.confidence >= 60
                          ? 'text-yellow-600'
                          : 'text-orange-600'
                      }`}
                    >
                      {item.confidence}%
                    </span>
                  </div>
                  {item.reviewFlagReason && (
                    <p className="text-xs text-gray-600 mt-1">
                      ⚠️ {item.reviewFlagReason}
                    </p>
                  )}
                </div>
              </div>

              {/* Full speech expand */}
              <div className="mb-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleExpandSpeech(item.speechId)}
                  className="text-xs text-gray-600"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  {expandedSpeechId === item.speechId
                    ? 'Hide full speech'
                    : 'View full speech'}
                </Button>

                {expandedSpeechId === item.speechId && (
                  <div className="mt-2 p-3 bg-white rounded border border-gray-200 max-h-40 overflow-y-auto">
                    {/* Full text would be fetched and displayed here */}
                    <p className="text-xs text-gray-700">
                      [Full speech text displayed here]
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  variant="default"
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(item.tagId)}
                >
                  <Check className="w-3 h-3 mr-1" />
                  Approve
                </Button>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleReject(item.tagId)}
                >
                  <X className="w-3 h-3 mr-1" />
                  Reject
                </Button>

                {item.tagType === 'topic' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingTagId(item.tagId);
                      setEditValue(item.tagValue);
                    }}
                  >
                    <Edit2 className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                )}

                {item.tagType === 'topic' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkApproveSimilar(item)}
                  >
                    Approve Similar from {item.mpName}
                  </Button>
                )}
              </div>

              {/* Edit mode */}
              {editingTagId === item.tagId && (
                <div className="mt-3 p-3 bg-white rounded border border-gray-300">
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    className="w-full px-2 py-1 border rounded text-sm mb-2"
                  />
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-green-600"
                      onClick={() => handleEditTag(item.tagId, editValue)}
                    >
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingTagId(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
