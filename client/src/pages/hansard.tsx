import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Calendar, Download, Sparkles, CheckCircle, Users, UserX, MapPin, Trash2, BarChart3 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { HansardRecord } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ConstituencyAttendance } from "@/components/ConstituencyAttendance";
import { HansardAnalysisDialog } from "@/components/HansardAnalysisDialog";

export default function HansardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const { toast } = useToast();

  const queryUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (searchQuery) params.set("query", searchQuery);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const queryString = params.toString();
    return queryString ? `/api/hansard-records/search?${queryString}` : "/api/hansard-records/search";
  }, [searchQuery, startDate, endDate]);

  const { data: filteredRecords, isLoading, isError } = useQuery<HansardRecord[]>({
    queryKey: [queryUrl],
  });

  const summarizeMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      
      const response = await fetch(`/api/hansard-records/${recordId}/summarize`, {
        method: "POST",
        body: JSON.stringify({ maxLength: 500, language: "en" }),
        headers,
        credentials: "include"
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate summary");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/hansard-records/search')
      });
      toast({
        title: "Summary Generated",
        description: "The Hansard record has been successfully summarized."
      });
    },
    onError: (error) => {
      toast({
        title: "Summarization Failed",
        description: error.message || "Failed to generate summary. Please try again.",
        variant: "destructive"
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (recordId: string) => {
      const headers: Record<string, string> = {};
      
      const response = await fetch(`/api/hansard-records/${recordId}`, {
        method: 'DELETE',
        headers,
        credentials: 'include'
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete record");
      }
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => 
          typeof query.queryKey[0] === 'string' && 
          query.queryKey[0].startsWith('/api/hansard-records')
      });
      toast({
        title: "Record Deleted",
        description: "The Hansard record has been successfully deleted."
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete record. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center h-full">
          <div className="text-muted-foreground">Loading Hansard records...</div>
        </div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Header />
        <div className="container mx-auto p-6">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-destructive">Failed to load Hansard records. Please try again.</p>
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Penyata Rasmi (Hansard)</h1>
        <p className="text-muted-foreground mt-2">
          Browse parliamentary transcripts from the 15th Parliament
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Hansard
          </CardTitle>
          <CardDescription>Search by topic, keyword, or filter by date</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <Input
                data-testid="input-hansard-search"
                placeholder="Search transcripts, topics, or session number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Input
                data-testid="input-start-date"
                type="date"
                placeholder="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
              />
              <Input
                data-testid="input-end-date"
                type="date"
                placeholder="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
              />
            </div>
            <Button
              data-testid="button-clear-filters"
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {filteredRecords?.length || 0} Records Found
          </h2>
        </div>

        {filteredRecords && filteredRecords.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <h3 className="font-semibold text-lg mb-2">No Hansard Records Available</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || startDate || endDate 
                  ? "No records found matching your search criteria. Try adjusting your filters."
                  : "The Hansard database is empty. Download records from the Malaysian Parliament website to get started."}
              </p>
              {!searchQuery && !startDate && !endDate && (
                <div className="mt-6 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Visit the Admin page to download parliamentary transcripts from the 15th Parliament
                  </p>
                  <Button asChild data-testid="button-go-to-admin">
                    <Link href="/hansard-admin">
                      <Download className="w-4 h-4 mr-2" />
                      Go to Hansard Admin
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {filteredRecords?.map((record) => (
          <Card key={record.id} data-testid={`card-hansard-${record.id}`} className="hover-elevate">
            <CardHeader>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {record.sessionNumber}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-2">
                    <Calendar className="w-4 h-4" />
                    {format(new Date(record.sessionDate), "MMMM dd, yyyy")}
                    <span className="mx-2">•</span>
                    {record.sitting}
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button
                    data-testid={`button-download-${record.id}`}
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={`/api/hansard-records/${record.id}/pdf`} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </a>
                  </Button>
                  <HansardAnalysisDialog
                    hansardRecord={record}
                    trigger={
                      <Button
                        data-testid={`button-analysis-${record.id}`}
                        variant="outline"
                        size="sm"
                      >
                        <BarChart3 className="w-4 h-4 mr-2" />
                        Analysis
                      </Button>
                    }
                  />

                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          data-testid={`button-delete-${record.id}`}
                          variant="outline"
                          size="sm"
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Hansard Record</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete the Hansard record "{record.sessionNumber}"? 
                            This action cannot be undone and will permanently remove the record and all associated data.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel 
                            data-testid="button-cancel-delete"
                            disabled={deleteMutation.isPending}
                          >
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            data-testid="button-confirm-delete"
                            onClick={() => deleteMutation.mutate(record.id)}
                            disabled={deleteMutation.isPending}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {record.topics && record.topics.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {record.topics.map((topic, idx) => (
                    <Badge key={idx} variant="secondary" data-testid={`badge-topic-${idx}`}>
                      {topic}
                    </Badge>
                  ))}
                </div>
              )}

              {(record.constituenciesPresent !== null && record.constituenciesPresent !== undefined) || 
               (record.attendedMpIds?.length > 0 || record.absentMpIds?.length > 0) ? (
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap gap-4 text-sm">
                    {(record.constituenciesPresent !== null && record.constituenciesPresent !== undefined) ? (
                      <>
                        <div className="flex items-center gap-2" data-testid="attendance-present">
                          <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                          <span className="font-medium">{record.constituenciesPresent}</span>
                          <span className="text-muted-foreground">Constituencies Present</span>
                        </div>
                        {record.constituenciesAbsent !== null && record.constituenciesAbsent !== undefined && record.constituenciesAbsent > 0 && (
                          <div className="flex items-center gap-2" data-testid="attendance-absent">
                            <UserX className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <span className="font-medium">{record.constituenciesAbsent}</span>
                            <span className="text-muted-foreground">Absent</span>
                          </div>
                        )}
                        {record.constituenciesAbsentRule91 !== null && record.constituenciesAbsentRule91 !== undefined && record.constituenciesAbsentRule91 > 0 && (
                          <div className="flex items-center gap-2" data-testid="attendance-absent-rule91">
                            <UserX className="w-4 h-4 text-red-600 dark:text-red-400" />
                            <span className="font-medium">{record.constituenciesAbsentRule91}</span>
                            <span className="text-muted-foreground">Absent (SO 91)</span>
                          </div>
                        )}
                        {record.constituenciesPresent > 0 && (
                          <Badge variant="secondary" data-testid="attendance-rate">
                            {((record.constituenciesPresent / 222) * 100).toFixed(1)}% Attendance
                          </Badge>
                        )}
                      </>
                    ) : (
                      <>
                        {record.attendedMpIds && record.attendedMpIds.length > 0 && (
                          <div className="flex items-center gap-2" data-testid="attendance-present">
                            <Users className="w-4 h-4 text-green-600 dark:text-green-400" />
                            <span className="font-medium">{record.attendedMpIds.length}</span>
                            <span className="text-muted-foreground">MPs Present</span>
                          </div>
                        )}
                        {record.absentMpIds && record.absentMpIds.length > 0 && (
                          <div className="flex items-center gap-2" data-testid="attendance-absent">
                            <UserX className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                            <span className="font-medium">{record.absentMpIds.length}</span>
                            <span className="text-muted-foreground">MPs Absent</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <Dialog open={openDialogId === record.id} onOpenChange={(open) => setOpenDialogId(open ? record.id : null)}>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid={`button-constituency-${record.id}`}
                      >
                        <MapPin className="w-4 h-4 mr-2" />
                        View by Constituency
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
                      <DialogHeader>
                        <DialogTitle>Constituency Attendance</DialogTitle>
                        <DialogDescription>
                          {record.sessionNumber} - {format(new Date(record.sessionDate), "MMMM dd, yyyy")}
                        </DialogDescription>
                      </DialogHeader>
                      <ConstituencyAttendance 
                        hansardRecordId={record.id} 
                        enabled={openDialogId === record.id}
                      />
                    </DialogContent>
                  </Dialog>
                </div>
              ) : null}
              
              {record.summary ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">AI Summary</span>
                  </div>
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4">
                      <p className="text-sm">{record.summary}</p>
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {record.transcript.substring(0, 300)}...
                  </p>
                  <Button
                    data-testid={`button-summarize-${record.id}`}
                    variant="outline"
                    size="sm"
                    onClick={() => summarizeMutation.mutate(record.id)}
                    disabled={summarizeMutation.isPending}
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    {summarizeMutation.isPending ? "Generating Summary..." : "Summarize with AI"}
                  </Button>
                </>
              )}
              
              {record.speakers && record.speakers.length > 0 && (
                <div className="text-sm">
                  <span className="font-medium">Speakers: </span>
                  {record.speakers.slice(0, 3).map((speaker, idx) => (
                    <span key={idx}>
                      {speaker.mpName}
                      {idx < Math.min(record.speakers.length, 3) - 1 && ", "}
                    </span>
                  ))}
                  {record.speakers.length > 3 && ` +${record.speakers.length - 3} more`}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
    </>
  );
}
