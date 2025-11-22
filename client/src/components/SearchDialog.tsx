/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Search, User } from "lucide-react";
import { useLocation } from "wouter";
import type { Mp } from "@shared/schema";

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SearchDialog({ open, onOpenChange }: SearchDialogProps) {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: mps = [] } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
  });

  const filteredMps = useMemo(() => {
    if (!searchQuery.trim()) {
      return mps.slice(0, 10);
    }

    const query = searchQuery.toLowerCase();
    return mps
      .filter((mp) => {
        return (
          mp.name.toLowerCase().includes(query) ||
          mp.constituency.toLowerCase().includes(query) ||
          mp.party.toLowerCase().includes(query) ||
          (mp.state ?? "").toLowerCase().includes(query) ||
          (mp.parliamentCode ?? "").toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [mps, searchQuery]);

  const handleSelectMp = (mpId: string) => {
    setLocation(`/mp/${mpId}`);
    onOpenChange(false);
    setSearchQuery("");
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(true);
      }
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0" data-testid="dialog-search">
        <VisuallyHidden>
          <DialogTitle>Search MPs</DialogTitle>
        </VisuallyHidden>
        <div className="flex items-center border-b px-4 py-3">
          <Search className="h-5 w-5 text-muted-foreground mr-3" />
          <Input
            type="search"
            placeholder="Search MPs by name, party, or constituency..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
            autoFocus
            data-testid="input-search-dialog"
          />
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground ml-2">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        <div className="max-h-[400px] overflow-y-auto p-2">
          {filteredMps.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground" data-testid="text-no-results">
              {searchQuery ? "No MPs found" : "Start typing to search..."}
            </div>
          ) : (
            <div className="space-y-1">
              {filteredMps.map((mp) => {
                const attendanceRate = mp.totalParliamentDays > 0
                  ? ((mp.daysAttended / mp.totalParliamentDays) * 100).toFixed(1)
                  : "0.0";

                return (
                  <button
                    key={mp.id}
                    onClick={() => handleSelectMp(mp.id)}
                    className="w-full flex items-center gap-3 p-3 rounded-md hover-elevate active-elevate-2 text-left"
                    data-testid={`search-result-${mp.id}`}
                  >
                    <Avatar className="h-12 w-12 border-2">
                      <AvatarImage src={mp.photoUrl || undefined} alt={mp.name} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold truncate" data-testid={`text-mp-name-${mp.id}`}>
                          {mp.name}
                        </p>
                        {mp.isMinister && mp.ministerialPosition && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {mp.ministerialPosition}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                        <Badge variant="outline" className="text-xs" data-testid={`badge-party-${mp.id}`}>
                          {mp.party}
                        </Badge>
                        <span className="truncate" data-testid={`text-constituency-${mp.id}`}>
                          {mp.constituency}
                        </span>
                        <span className="text-xs">•</span>
                        <span className="text-xs">{attendanceRate}% attendance</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {searchQuery && filteredMps.length > 0 && (
          <div className="border-t px-4 py-2 text-xs text-muted-foreground">
            Showing {filteredMps.length} of {mps.filter((mp) => {
              const query = searchQuery.toLowerCase();
              return (
                mp.name.toLowerCase().includes(query) ||
                mp.constituency.toLowerCase().includes(query) ||
                mp.party.toLowerCase().includes(query) ||
                (mp.state ?? "").toLowerCase().includes(query) ||
                (mp.parliamentCode ?? "").toLowerCase().includes(query)
              );
            }).length} results
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
