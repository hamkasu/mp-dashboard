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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MessageSquareText, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLanguage } from "@/i18n/LanguageContext";

interface FeedbackModalProps {
  children?: React.ReactNode;
}

export function FeedbackModal({ children }: FeedbackModalProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    feedbackType: "general",
    subject: "",
    message: "",
    pageUrl: typeof window !== "undefined" ? window.location.href : "",
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/feedback", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('feedback.successTitle'),
        description: t('feedback.successMessage'),
      });
      setOpen(false);
      setFormData({
        name: "",
        email: "",
        feedbackType: "general",
        subject: "",
        message: "",
        pageUrl: typeof window !== "undefined" ? window.location.href : "",
      });
    },
    onError: (error: any) => {
      toast({
        title: t('feedback.errorTitle'),
        description: error.message || t('feedback.errorMessage'),
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      toast({
        title: t('feedback.missingFields'),
        description: t('feedback.fillRequired'),
        variant: "destructive",
      });
      return;
    }
    submitFeedbackMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="gap-2" data-testid="button-feedback">
            <MessageSquareText className="h-4 w-4" />
            {t('feedback.button')}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5" />
            {t('feedback.title')}
          </DialogTitle>
          <DialogDescription>
            {t('feedback.description')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-name">{t('feedback.name')}</Label>
              <Input
                id="feedback-name"
                placeholder={t('feedback.namePlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-feedback-name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-email">{t('feedback.email')}</Label>
              <Input
                id="feedback-email"
                type="email"
                placeholder={t('feedback.emailPlaceholder')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                data-testid="input-feedback-email"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-type">{t('feedback.type')}</Label>
            <Select
              value={formData.feedbackType}
              onValueChange={(value) => setFormData({ ...formData, feedbackType: value })}
            >
              <SelectTrigger id="feedback-type" data-testid="select-feedback-type">
                <SelectValue placeholder={t('feedback.selectType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="general">{t('feedback.types.general')}</SelectItem>
                <SelectItem value="bug">{t('feedback.types.bug')}</SelectItem>
                <SelectItem value="suggestion">{t('feedback.types.suggestion')}</SelectItem>
                <SelectItem value="question">{t('feedback.types.question')}</SelectItem>
                <SelectItem value="compliment">{t('feedback.types.compliment')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-subject">{t('feedback.subject')} *</Label>
            <Input
              id="feedback-subject"
              placeholder={t('feedback.subjectPlaceholder')}
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              required
              data-testid="input-feedback-subject"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="feedback-message">{t('feedback.message')} *</Label>
            <Textarea
              id="feedback-message"
              placeholder={t('feedback.messagePlaceholder')}
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={5}
              required
              data-testid="input-feedback-message"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-feedback-cancel"
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={submitFeedbackMutation.isPending}
              data-testid="button-feedback-submit"
            >
              {submitFeedbackMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {t('feedback.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
