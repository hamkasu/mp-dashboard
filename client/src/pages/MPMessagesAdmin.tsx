/**
 * Copyright by Calmic Sdn Bhd
 *
 * MP Messages Admin Panel
 * Manage and view constituent messages
 */

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
} from "@/components/ui/dialog";
import {
  MessageSquare,
  Mail,
  Phone,
  Clock,
  CheckCircle,
  Reply,
  Archive
} from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { PageMeta } from "@/components/PageMeta";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { MpContactMessage } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const CATEGORY_LABELS: Record<string, string> = {
  general: "General Inquiry",
  flooding_drainage: "Flooding & Drainage",
  education: "Education",
  healthcare: "Healthcare",
  infrastructure: "Infrastructure",
  housing: "Housing",
  employment: "Employment",
  safety_crime: "Safety & Crime",
  environment: "Environment",
  transportation: "Transportation",
  corruption: "Corruption",
  youth_sports: "Youth & Sports",
  poverty_welfare: "Poverty & Welfare",
  other: "Other",
};

export default function MPMessagesAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedMpId, setSelectedMpId] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<MpContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");

  // Fetch all MPs for dropdown
  const { data: mps } = useQuery({
    queryKey: ["/api/mps"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/mps");
      return await res.json();
    },
  });

  // Fetch messages for selected MP
  const { data: messages, isLoading } = useQuery({
    queryKey: [`/api/mps/${selectedMpId}/messages`, statusFilter],
    queryFn: async () => {
      if (!selectedMpId) return [];
      const url = statusFilter === "all"
        ? `/api/mps/${selectedMpId}/messages`
        : `/api/mps/${selectedMpId}/messages?status=${statusFilter}`;
      const res = await apiRequest("GET", url);
      return await res.json();
    },
    enabled: !!selectedMpId,
  });

  // Update message status mutation
  const updateMessageMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/messages/${id}`, updates);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/mps/${selectedMpId}/messages`] });
      toast({
        title: "Message Updated",
        description: "The message status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update Failed",
        description: "Could not update the message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleMarkAsRead = (messageId: string) => {
    updateMessageMutation.mutate({
      id: messageId,
      updates: { status: "read", readAt: new Date().toISOString() },
    });
  };

  const handleResolve = (messageId: string) => {
    updateMessageMutation.mutate({
      id: messageId,
      updates: { status: "resolved" },
    });
  };

  const handleReply = () => {
    if (!selectedMessage || !replyText.trim()) return;

    updateMessageMutation.mutate(
      {
        id: selectedMessage.id,
        updates: {
          status: "replied",
          replyMessage: replyText,
          repliedAt: new Date().toISOString(),
        },
      },
      {
        onSuccess: () => {
          setSelectedMessage(null);
          setReplyText("");
        },
      }
    );
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "read":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "replied":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "resolved":
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
      case "spam":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageMeta
        title="MP Messages Admin | MyParliament"
        description="Manage constituent messages to Members of Parliament"
      />
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MP Messages Admin</h1>
            <p className="text-muted-foreground">
              View and manage messages from constituents
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select MP</label>
              <Select value={selectedMpId} onValueChange={setSelectedMpId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an MP" />
                </SelectTrigger>
                <SelectContent>
                  {mps?.map((mp: any) => (
                    <SelectItem key={mp.id} value={mp.id}>
                      {mp.name} ({mp.constituency})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Filter by Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Messages</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="read">Read</SelectItem>
                  <SelectItem value="replied">Replied</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedMpId ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Please select an MP to view their messages
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : !messages || messages.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No messages found
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {messages.map((message: MpContactMessage) => (
                <Card key={message.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-lg">{message.subject}</CardTitle>
                        <CardDescription className="flex items-center gap-4 text-sm">
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {message.senderName} ({message.senderEmail})
                          </span>
                          {message.senderPhone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {message.senderPhone}
                            </span>
                          )}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge className={getStatusBadgeVariant(message.status)}>
                          {message.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {CATEGORY_LABELS[message.category] || message.category}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <p className="text-sm whitespace-pre-wrap">{message.message}</p>

                      {message.replyMessage && (
                        <div className="bg-muted p-4 rounded-md">
                          <p className="text-xs font-semibold mb-1 text-muted-foreground">
                            Reply:
                          </p>
                          <p className="text-sm">{message.replyMessage}</p>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(message.createdAt), {
                            addSuffix: true,
                          })}
                        </div>

                        <div className="flex gap-2">
                          {message.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkAsRead(message.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Mark as Read
                            </Button>
                          )}
                          {message.status !== "replied" && message.status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setSelectedMessage(message)}
                            >
                              <Reply className="h-4 w-4 mr-1" />
                              Reply
                            </Button>
                          )}
                          {message.status !== "resolved" && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => handleResolve(message.id)}
                            >
                              <Archive className="h-4 w-4 mr-1" />
                              Resolve
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Reply Dialog */}
      <Dialog
        open={!!selectedMessage}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedMessage(null);
            setReplyText("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to Message</DialogTitle>
            <DialogDescription>
              Send a reply to {selectedMessage?.senderName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <p className="text-sm font-semibold mb-2">Original Message:</p>
              <p className="text-sm text-muted-foreground">
                {selectedMessage?.message}
              </p>
            </div>
            <Textarea
              placeholder="Type your reply here..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              rows={6}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedMessage(null);
                setReplyText("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleReply} disabled={!replyText.trim()}>
              <Reply className="h-4 w-4 mr-2" />
              Send Reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
