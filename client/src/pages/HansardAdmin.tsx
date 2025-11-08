import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Download, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function HansardAdmin() {
  const { toast } = useToast();
  const [downloadStatus, setDownloadStatus] = useState<{
    total?: number;
    successful?: number;
    errors?: number;
    skipped?: number;
  } | null>(null);

  const { data: hansardRecords, isLoading } = useQuery<any[]>({
    queryKey: ["/api/hansard-records"],
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/hansard-records");
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      toast({
        title: "Success",
        description: `Deleted ${data.deletedCount} hansard records`,
      });
      setDownloadStatus(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete hansard records",
        variant: "destructive",
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async (maxRecords: number) => {
      const res = await apiRequest("POST", "/api/hansard-records/download", { maxRecords });
      return await res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/hansard-records"] });
      setDownloadStatus(data);
      toast({
        title: "Download Complete",
        description: `Successfully downloaded ${data.successful} hansard records`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to download hansard records",
        variant: "destructive",
      });
    },
  });

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete all ${hansardRecords?.length || 0} hansard records? This action cannot be undone.`)) {
      deleteMutation.mutate();
    }
  };

  const handleDownload = () => {
    if (confirm("This will download up to 200 hansard records from the 15th Parliament. This may take several minutes. Continue?")) {
      setDownloadStatus(null);
      downloadMutation.mutate(200);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6" data-testid="page-hansard-admin">
      <div>
        <h1 className="text-3xl font-bold">Hansard Administration</h1>
        <p className="text-muted-foreground mt-2">
          Manage parliamentary hansard records for the 15th Parliament
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5" />
              Delete Hansard Records
            </CardTitle>
            <CardDescription>
              Remove all existing hansard records from the database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading records...
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Current records in database: <strong>{hansardRecords?.length || 0}</strong>
                </p>
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    This will permanently delete all hansard records. This action cannot be undone.
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <Button
              onClick={handleDelete}
              disabled={deleteMutation.isPending || isLoading || !hansardRecords || hansardRecords.length === 0}
              variant="destructive"
              className="w-full"
              data-testid="button-delete-all"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete All Records
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Hansard Records
            </CardTitle>
            <CardDescription>
              Download hansard records from parlimen.gov.my (15th Parliament)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                This will download up to 200 hansard records from the Malaysian Parliament website.
              </p>
              <Alert>
                <AlertDescription>
                  Download may take several minutes as it processes PDF files from the parliament website.
                </AlertDescription>
              </Alert>
            </div>
            <Button
              onClick={handleDownload}
              disabled={downloadMutation.isPending}
              className="w-full"
              data-testid="button-download"
            >
              {downloadMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Downloading...
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Download 15th Parliament Hansard
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {downloadStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Download Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total found:</span>
                <strong>{downloadStatus.total || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Successfully downloaded:</span>
                <strong className="text-green-600">{downloadStatus.successful || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Skipped (already exists):</span>
                <strong className="text-blue-600">{downloadStatus.skipped || 0}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Errors:</span>
                <strong className="text-red-600">{downloadStatus.errors || 0}</strong>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
