/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Send, Loader2, Mail, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ContactMPDialogProps {
  mpId: string;
  mpName: string;
  mpEmail?: string | null;
  mpConstituency: string;
  children?: React.ReactNode;
}

export function ContactMPDialog({ mpId, mpName, mpEmail, mpConstituency, children }: ContactMPDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    senderName: "",
    senderEmail: "",
    subject: "",
    message: "",
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", `/api/mps/${mpId}/contact`, {
        ...data,
        mpName,
        mpEmail,
        mpConstituency,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Message Sent",
        description: `Your message has been sent to ${mpName}'s office.`,
      });
      setOpen(false);
      setFormData({ senderName: "", senderEmail: "", subject: "", message: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send",
        description: error.message || "Could not send your message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.senderName || !formData.senderEmail || !formData.subject || !formData.message) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields.",
        variant: "destructive",
      });
      return;
    }
    sendMessageMutation.mutate(formData);
  };

  const handleDirectEmail = () => {
    if (mpEmail) {
      const subject = encodeURIComponent(formData.subject || `Message from Constituent`);
      const body = encodeURIComponent(formData.message || "");
      window.open(`mailto:${mpEmail}?subject=${subject}&body=${body}`, "_blank");
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="default" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Send Message
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Contact {mpName}
          </DialogTitle>
          <DialogDescription>
            Send a message to your Member of Parliament for {mpConstituency}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="senderName">Your Name *</Label>
              <Input
                id="senderName"
                placeholder="Enter your name"
                value={formData.senderName}
                onChange={(e) => setFormData({ ...formData, senderName: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="senderEmail">Your Email *</Label>
              <Input
                id="senderEmail"
                type="email"
                placeholder="your@email.com"
                value={formData.senderEmail}
                onChange={(e) => setFormData({ ...formData, senderEmail: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              placeholder="What is your message about?"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message *</Label>
            <Textarea
              id="message"
              placeholder="Write your message to the MP..."
              rows={5}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              required
            />
          </div>

          <Alert>
            <AlertDescription className="text-sm">
              Your message will be logged and forwarded to the MP's office. Please be respectful and constructive in your communication.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button
              type="submit"
              disabled={sendMessageMutation.isPending}
              className="flex-1"
            >
              {sendMessageMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Message
                </>
              )}
            </Button>

            {mpEmail && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDirectEmail}
                className="flex-1"
              >
                <Mail className="mr-2 h-4 w-4" />
                Open in Email App
                <ExternalLink className="ml-2 h-3 w-3" />
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
