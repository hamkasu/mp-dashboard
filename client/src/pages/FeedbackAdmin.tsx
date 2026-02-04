/**
 * Copyright by Calmic Sdn Bhd
 *
 * Feedback Admin Panel
 * View and manage user feedback submissions
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MessageSquare,
  Mail,
  User,
  Clock,
  CheckCircle,
  Eye,
  ExternalLink,
  Filter,
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageMeta } from "@/components/PageMeta";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { UserFeedback } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const FEEDBACK_TYPE_LABELS: Record<string, string> = {
  general: "General Feedback",
  bug: "Bug Report",
  suggestion: "Suggestion",
  question: "Question",
  compliment: "Compliment",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Feedback" },
  { value: "pending", label: "Pending" },
  { value: "reviewed", label: "Reviewed" },
  { value: "resolved", label: "Resolved" },
];

export default function FeedbackAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedFeedback, setSelectedFeedback] = useState<UserFeedback | null>(null);

  // Fetch feedback with optional status filter
  const { data: feedbackList, isLoading } = useQuery({
    queryKey: ["/api/feedback", statusFilter],
    queryFn: async () => {
      const url = statusFilter === "all"
        ? "/api/feedback"
        : `/api/feedback?status=${statusFilter}`;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
  });

  // Update feedback status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/feedback/${id}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/feedback"] });
      toast({
        title: "Status Updated",
        description: "The feedback status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update the feedback status. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (feedbackId: string, newStatus: string) => {
    updateStatusMutation.mutate({ id: feedbackId, status: newStatus });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "reviewed":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "resolved":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "bug":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      case "suggestion":
        return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";
      case "question":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "compliment":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageMeta
        title="Feedback Admin | MyParliament"
        description="View and manage user feedback submissions"
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                <MessageSquare className="h-8 w-8 text-primary" />
                Feedback Management
              </h1>
              <p className="text-muted-foreground">
                View and manage user feedback submissions
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Filter className="h-4 w-4" />
              Total: {feedbackList?.length || 0} items
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>User Feedback</CardTitle>
                  <CardDescription>
                    Review feedback from users and update their status
                  </CardDescription>
                </div>
                <div className="w-48">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : !feedbackList || feedbackList.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No feedback found</p>
                  {statusFilter !== "all" && (
                    <p className="text-sm mt-2">
                      Try changing the status filter to see more results
                    </p>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>From</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {feedbackList.map((feedback: UserFeedback) => (
                        <TableRow key={feedback.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Badge className={getTypeBadgeVariant(feedback.feedbackType)}>
                              {FEEDBACK_TYPE_LABELS[feedback.feedbackType] || feedback.feedbackType}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate font-medium">
                              {feedback.subject || "(No subject)"}
                            </div>
                            <div className="truncate text-sm text-muted-foreground">
                              {feedback.message.substring(0, 60)}
                              {feedback.message.length > 60 ? "..." : ""}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-sm">
                              {feedback.name && (
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {feedback.name}
                                </span>
                              )}
                              {feedback.email && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Mail className="h-3 w-3" />
                                  {feedback.email}
                                </span>
                              )}
                              {!feedback.name && !feedback.email && (
                                <span className="text-muted-foreground">Anonymous</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={feedback.status}
                              onValueChange={(value) => handleStatusChange(feedback.id, value)}
                            >
                              <SelectTrigger className="w-28 h-8">
                                <Badge className={getStatusBadgeVariant(feedback.status)}>
                                  {feedback.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="reviewed">Reviewed</SelectItem>
                                <SelectItem value="resolved">Resolved</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(feedback.createdAt), {
                                addSuffix: true,
                              })}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedFeedback(feedback)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />

      {/* Feedback Detail Dialog */}
      <Dialog
        open={!!selectedFeedback}
        onOpenChange={(open) => {
          if (!open) setSelectedFeedback(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Feedback Details
            </DialogTitle>
            <DialogDescription>
              Submitted {selectedFeedback?.createdAt && formatDistanceToNow(new Date(selectedFeedback.createdAt), { addSuffix: true })}
            </DialogDescription>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Badge className={getTypeBadgeVariant(selectedFeedback.feedbackType)}>
                  {FEEDBACK_TYPE_LABELS[selectedFeedback.feedbackType] || selectedFeedback.feedbackType}
                </Badge>
                <Badge className={getStatusBadgeVariant(selectedFeedback.status)}>
                  {selectedFeedback.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">Name</p>
                  <p>{selectedFeedback.name || "Anonymous"}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">Email</p>
                  <p>{selectedFeedback.email || "Not provided"}</p>
                </div>
              </div>

              <div>
                <p className="font-semibold text-muted-foreground mb-1">Subject</p>
                <p className="font-medium">{selectedFeedback.subject || "(No subject)"}</p>
              </div>

              <div>
                <p className="font-semibold text-muted-foreground mb-1">Message</p>
                <div className="bg-muted p-4 rounded-md whitespace-pre-wrap text-sm">
                  {selectedFeedback.message}
                </div>
              </div>

              {selectedFeedback.pageUrl && (
                <div>
                  <p className="font-semibold text-muted-foreground mb-1">Page URL</p>
                  <a
                    href={selectedFeedback.pageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center gap-1 text-sm"
                  >
                    {selectedFeedback.pageUrl}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              )}

              {selectedFeedback.reviewedBy && (
                <div className="border-t pt-4 mt-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4" />
                    Reviewed by {selectedFeedback.reviewedBy}
                    {selectedFeedback.reviewedAt && (
                      <span>
                        {" "}on {new Date(selectedFeedback.reviewedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  ID: {selectedFeedback.id}
                </p>
                <div className="flex gap-2">
                  {selectedFeedback.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        handleStatusChange(selectedFeedback.id, "reviewed");
                        setSelectedFeedback({ ...selectedFeedback, status: "reviewed" });
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Mark as Reviewed
                    </Button>
                  )}
                  {selectedFeedback.status !== "resolved" && (
                    <Button
                      size="sm"
                      onClick={() => {
                        handleStatusChange(selectedFeedback.id, "resolved");
                        setSelectedFeedback({ ...selectedFeedback, status: "resolved" });
                      }}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Mark as Resolved
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
