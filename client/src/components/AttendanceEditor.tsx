/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Check, X, Users, UserCheck, UserX, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import type { Mp, HansardRecord } from "@shared/schema";
import { useLanguage } from "@/i18n/LanguageContext";

interface AttendanceEditorProps {
  hansardRecord: HansardRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AttendanceEditor({ hansardRecord, open, onOpenChange }: AttendanceEditorProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [attendedMpIds, setAttendedMpIds] = useState<string[]>(hansardRecord.attendedMpIds || []);
  const [absentMpIds, setAbsentMpIds] = useState<string[]>(hansardRecord.absentMpIds || []);
  const [activeTab, setActiveTab] = useState<"all" | "attended" | "absent">("all");

  // Reset state when hansard record changes
  useEffect(() => {
    setAttendedMpIds(hansardRecord.attendedMpIds || []);
    setAbsentMpIds(hansardRecord.absentMpIds || []);
  }, [hansardRecord.id, hansardRecord.attendedMpIds, hansardRecord.absentMpIds]);

  // Fetch all MPs
  const { data: mps, isLoading: mpsLoading } = useQuery<Mp[]>({
    queryKey: ["/api/mps"],
    enabled: open,
  });

  // Update attendance mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/hansard-records/${hansardRecord.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          attendedMpIds,
          absentMpIds,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update attendance");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      queryClient.invalidateQueries({ queryKey: [`/api/hansard-records/${hansardRecord.id}/constituency-attendance`] });
      toast({
        title: t('common.save'),
        description: "Attendance records updated successfully",
      });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Filter MPs based on search and tab
  const filteredMps = useMemo(() => {
    if (!mps) return [];

    let filtered = mps;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (mp) =>
          mp.name.toLowerCase().includes(query) ||
          mp.constituency.toLowerCase().includes(query) ||
          mp.party.toLowerCase().includes(query) ||
          mp.state.toLowerCase().includes(query)
      );
    }

    // Filter by tab
    if (activeTab === "attended") {
      filtered = filtered.filter((mp) => attendedMpIds.includes(mp.id));
    } else if (activeTab === "absent") {
      filtered = filtered.filter((mp) => absentMpIds.includes(mp.id));
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [mps, searchQuery, activeTab, attendedMpIds, absentMpIds]);

  // Get MP status
  const getMpStatus = (mpId: string): "attended" | "absent" | "unknown" => {
    if (attendedMpIds.includes(mpId)) return "attended";
    if (absentMpIds.includes(mpId)) return "absent";
    return "unknown";
  };

  // Toggle MP attendance
  const toggleAttendance = (mpId: string, status: "attended" | "absent" | "unknown") => {
    const newAttendedIds = [...attendedMpIds];
    const newAbsentIds = [...absentMpIds];

    // Remove from both lists first
    const attendedIndex = newAttendedIds.indexOf(mpId);
    const absentIndex = newAbsentIds.indexOf(mpId);
    if (attendedIndex > -1) newAttendedIds.splice(attendedIndex, 1);
    if (absentIndex > -1) newAbsentIds.splice(absentIndex, 1);

    // Add to appropriate list
    if (status === "attended") {
      newAttendedIds.push(mpId);
    } else if (status === "absent") {
      newAbsentIds.push(mpId);
    }

    setAttendedMpIds(newAttendedIds);
    setAbsentMpIds(newAbsentIds);
  };

  // Bulk actions
  const markAllAsAttended = () => {
    if (!mps) return;
    const allMpIds = mps.map((mp) => mp.id);
    setAttendedMpIds(allMpIds);
    setAbsentMpIds([]);
  };

  const markAllAsAbsent = () => {
    if (!mps) return;
    const allMpIds = mps.map((mp) => mp.id);
    setAbsentMpIds(allMpIds);
    setAttendedMpIds([]);
  };

  const clearAll = () => {
    setAttendedMpIds([]);
    setAbsentMpIds([]);
  };

  const stats = {
    total: mps?.length || 0,
    attended: attendedMpIds.length,
    absent: absentMpIds.length,
    unknown: (mps?.length || 0) - attendedMpIds.length - absentMpIds.length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Edit Attendance - {hansardRecord.sessionNumber}
          </DialogTitle>
          <DialogDescription>
            Mark MPs as attended or absent for this Hansard session
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total MPs</div>
            </div>
            <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.attended}</div>
              <div className="text-xs text-muted-foreground">Attended</div>
            </div>
            <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.absent}</div>
              <div className="text-xs text-muted-foreground">Absent</div>
            </div>
            <div className="text-center p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{stats.unknown}</div>
              <div className="text-xs text-muted-foreground">Unknown</div>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={markAllAsAttended}>
              <UserCheck className="w-4 h-4 mr-2" />
              Mark All Attended
            </Button>
            <Button size="sm" variant="outline" onClick={markAllAsAbsent}>
              <UserX className="w-4 h-4 mr-2" />
              Mark All Absent
            </Button>
            <Button size="sm" variant="outline" onClick={clearAll}>
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search MPs by name, constituency, party, or state..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="attended">
                Attended ({stats.attended})
              </TabsTrigger>
              <TabsTrigger value="absent">
                Absent ({stats.absent})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              <ScrollArea className="h-[400px] pr-4">
                {mpsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredMps.map((mp) => {
                      const status = getMpStatus(mp.id);
                      return (
                        <div
                          key={mp.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium">{mp.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {mp.constituency} • {mp.party} • {mp.state}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant={status === "attended" ? "default" : "outline"}
                              onClick={() => toggleAttendance(mp.id, status === "attended" ? "unknown" : "attended")}
                              className="min-w-[100px]"
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Attended
                            </Button>
                            <Button
                              size="sm"
                              variant={status === "absent" ? "destructive" : "outline"}
                              onClick={() => toggleAttendance(mp.id, status === "absent" ? "unknown" : "absent")}
                              className="min-w-[100px]"
                            >
                              <X className="w-4 h-4 mr-1" />
                              Absent
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                    {filteredMps.length === 0 && (
                      <div className="text-center py-8 text-muted-foreground">
                        No MPs found
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateMutation.mutate()}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
