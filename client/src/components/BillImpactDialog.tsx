/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Sparkles,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  Building2,
  Briefcase,
  GraduationCap,
  Heart,
  Home,
  Scale,
  Shield,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/i18n/LanguageContext";
import type { Bill, BillImpact } from "@shared/schema";

interface BillImpactDialogProps {
  bill: Bill & { hasPdf?: boolean };
  trigger: React.ReactNode;
}

const groupIcons: Record<string, typeof Users> = {
  "workers": Briefcase,
  "businesses": Building2,
  "consumers": Users,
  "students": GraduationCap,
  "healthcare": Heart,
  "homeowners": Home,
  "legal": Scale,
  "security": Shield,
  "default": Users,
};

export function BillImpactDialog({ bill, trigger }: BillImpactDialogProps) {
  const { toast } = useToast();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  const { data: impact, isLoading: impactLoading } = useQuery<BillImpact | null>({
    queryKey: ["/api/bills", bill.id, "impact"],
    queryFn: async () => {
      const response = await fetch(`/api/bills/${bill.id}/impact`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch impact");
      }
      return response.json();
    },
    enabled: open,
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/bills/${bill.id}/generate-impact`);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || "Failed to generate impact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bills", bill.id, "impact"] });
      toast({
        title: "Impact Analysis Generated",
        description: "AI has analyzed the potential impact of this bill on Malaysians.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate impact analysis. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getImpactColor = (type: string | null | undefined) => {
    switch (type) {
      case "positive":
        return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "negative":
        return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      case "mixed":
        return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      default:
        return "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20";
    }
  };

  const getImpactIcon = (type: string | null | undefined) => {
    switch (type) {
      case "positive":
        return <TrendingUp className="w-4 h-4" />;
      case "negative":
        return <TrendingDown className="w-4 h-4" />;
      case "mixed":
        return <Minus className="w-4 h-4" />;
      default:
        return <Minus className="w-4 h-4" />;
    }
  };

  const getGroupIcon = (group: string) => {
    const key = group.toLowerCase();
    for (const [iconKey, Icon] of Object.entries(groupIcons)) {
      if (key.includes(iconKey)) {
        return Icon;
      }
    }
    return groupIcons.default;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            Impact on Malaysians
          </DialogTitle>
          <DialogDescription>
            AI-powered analysis of how this bill affects Malaysian citizens
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">{bill.billNumber || "Bill"}</CardTitle>
                <CardDescription className="line-clamp-2">{bill.title}</CardDescription>
              </CardHeader>
            </Card>

            {impactLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : impact ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        Overall Impact
                      </CardTitle>
                      <Badge variant="outline" className={getImpactColor(impact.impactType)}>
                        {getImpactIcon(impact.impactType)}
                        <span className="ml-1 capitalize">{impact.impactType || "Neutral"}</span>
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{impact.summary}</p>
                  </CardContent>
                </Card>

                {impact.keyPoints && impact.keyPoints.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Key Points
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {impact.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start gap-2 text-sm">
                            <span className="text-muted-foreground mt-0.5">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}

                {impact.affectedGroups && impact.affectedGroups.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Affected Groups
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {impact.affectedGroups.map((group, index) => {
                          const GroupIcon = getGroupIcon(group);
                          return (
                            <Badge key={index} variant="secondary" className="flex items-center gap-1">
                              <GroupIcon className="w-3 h-3" />
                              {group}
                            </Badge>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="text-xs text-muted-foreground text-center pt-2">
                  Generated by AI on {new Date(impact.generatedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                  <h3 className="font-semibold text-lg mb-2">No Impact Analysis Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Generate an AI-powered analysis to understand how this bill affects Malaysians.
                  </p>
                  <Button
                    onClick={() => generateMutation.mutate()}
                    disabled={generateMutation.isPending}
                    data-testid={`button-generate-impact-${bill.id}`}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Impact Analysis
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {impact && (
              <div className="flex justify-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => generateMutation.mutate()}
                  disabled={generateMutation.isPending}
                  data-testid={`button-regenerate-impact-${bill.id}`}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Regenerate Analysis
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
