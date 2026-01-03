/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { MessageStatsDialog } from "./MessageStatsDialog";

interface MPMessageStatsProps {
  mpId: string;
  mpName: string;
  onClick?: (e: React.MouseEvent) => void;
}

export function MPMessageStats({ mpId, mpName, onClick }: MPMessageStatsProps) {
  const [showDialog, setShowDialog] = useState(false);

  const { data: stats } = useQuery({
    queryKey: [`/api/mps/${mpId}/message-stats`],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/mps/${mpId}/message-stats`);
      return await res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  if (!stats || stats.total === 0) {
    return null;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onClick) {
      onClick(e);
    } else {
      setShowDialog(true);
    }
  };

  return (
    <>
      <Badge
        variant="outline"
        className="h-6 cursor-pointer hover:bg-accent transition-colors"
        onClick={handleClick}
        title={`View constituent concerns for ${mpName}`}
      >
        <MessageSquare className="h-3 w-3 mr-1" />
        {stats.total} {stats.total === 1 ? 'message' : 'messages'}
      </Badge>

      {showDialog && (
        <MessageStatsDialog
          mpId={mpId}
          mpName={mpName}
          stats={stats}
          open={showDialog}
          onOpenChange={setShowDialog}
        />
      )}
    </>
  );
}
