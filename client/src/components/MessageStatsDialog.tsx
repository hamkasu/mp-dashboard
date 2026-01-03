/**
 * Copyright by Calmic Sdn Bhd
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface MessageStatsDialogProps {
  mpId: string;
  mpName: string;
  stats: {
    total: number;
    byCategory: Record<string, number>;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

const CATEGORY_COLORS: Record<string, string> = {
  flooding_drainage: "bg-blue-500",
  education: "bg-purple-500",
  healthcare: "bg-red-500",
  infrastructure: "bg-gray-500",
  housing: "bg-amber-500",
  employment: "bg-green-500",
  safety_crime: "bg-orange-500",
  environment: "bg-emerald-500",
  transportation: "bg-cyan-500",
  corruption: "bg-rose-500",
  youth_sports: "bg-indigo-500",
  poverty_welfare: "bg-pink-500",
  general: "bg-slate-500",
  other: "bg-neutral-500",
};

export function MessageStatsDialog({
  mpName,
  stats,
  open,
  onOpenChange,
}: MessageStatsDialogProps) {
  // Sort categories by count (descending)
  const sortedCategories = Object.entries(stats.byCategory)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Constituent Concerns for {mpName}</DialogTitle>
          <DialogDescription>
            Anonymized breakdown of {stats.total} message{stats.total !== 1 ? 's' : ''} received from constituents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              This data is anonymized to protect constituent privacy. Personal information and full message contents are never displayed publicly, in compliance with Malaysia's Personal Data Protection Act (PDPA).
            </AlertDescription>
          </Alert>

          <div>
            <h4 className="text-sm font-semibold mb-3">Concerns by Category</h4>
            <div className="space-y-3">
              {sortedCategories.map(([category, count]) => {
                const percentage = ((count / stats.total) * 100).toFixed(1);
                const label = CATEGORY_LABELS[category] || category;
                const color = CATEGORY_COLORS[category] || "bg-slate-500";

                return (
                  <div key={category} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded ${color}`} />
                        <span className="text-sm font-medium">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          {count} {count === 1 ? 'message' : 'messages'}
                        </Badge>
                        <span className="text-sm text-muted-foreground w-12 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                    <Progress value={parseFloat(percentage)} className="h-2" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Only constituents who opted to share their concerns anonymously are included in these statistics. MPs can view full message details through their private dashboard.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
