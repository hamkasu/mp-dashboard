/**
 * Copyright by Calmic Sdn Bhd
 *
 * MYMP Import Admin Page
 * Import MP biography data from MYMP.org.my (volunteer-run MP directory)
 *
 * Ethical Guidelines:
 * - Data must be manually collected (not scraped) to respect MYMP terms
 * - Always credit MYMP as the source
 * - Link back to original profiles
 * - No commercial resale of data
 */

import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Loader2,
  Upload,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ExternalLink,
  User,
  Download,
  RefreshCw,
  Info,
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MympStatus {
  id: string;
  name: string;
  constituency: string;
  parliamentCode: string;
  hasMympData: boolean;
  mympSlug: string | null;
  mympUrl: string | null;
  lastUpdated: string | null;
}

interface ImportResults {
  message: string;
  results: {
    success: string[];
    failed: { identifier: string; error: string }[];
    skipped: string[];
  };
  summary: {
    total: number;
    success: number;
    failed: number;
    skipped: number;
  };
}

export default function MYMPImportAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [jsonInput, setJsonInput] = useState("");
  const [overwrite, setOverwrite] = useState(false);
  const [importResults, setImportResults] = useState<ImportResults | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check admin authentication
  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/auth-status"],
    retry: false,
  });

  // Fetch MYMP status for all MPs
  const { data: mympStatus, isLoading: statusLoading, refetch: refetchStatus } = useQuery<{
    status: MympStatus[];
    summary: { total: number; withMympData: number; withoutMympData: number };
  }>({
    queryKey: ["/api/admin/mymp-status"],
    enabled: authStatus?.isAdmin,
  });

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (data: { mps: any[]; overwrite: boolean }) => {
      const response = await apiRequest("POST", "/api/admin/import-mymp-data", data);
      return response as ImportResults;
    },
    onSuccess: (data) => {
      setImportResults(data);
      toast({
        title: "Import Complete",
        description: `${data.summary.success} MPs updated, ${data.summary.failed} failed, ${data.summary.skipped} skipped`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mymp-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import MYMP data",
        variant: "destructive",
      });
    },
  });

  // Redirect if not admin
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authStatus?.isAdmin) {
    setLocation("/admin/login?redirect=/mymp-import-admin");
    return null;
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setJsonInput(content);
        setParseError(null);
      };
      reader.readAsText(file);
    }
  };

  const validateAndParseJson = (): any[] | null => {
    try {
      const parsed = JSON.parse(jsonInput);
      // Handle both direct array and { mps: [...] } format
      const mpsArray = Array.isArray(parsed) ? parsed : parsed.mps;
      if (!Array.isArray(mpsArray)) {
        setParseError("JSON must be an array of MPs or an object with an 'mps' array");
        return null;
      }
      setParseError(null);
      return mpsArray;
    } catch (e) {
      setParseError(`Invalid JSON: ${e instanceof Error ? e.message : "Parse error"}`);
      return null;
    }
  };

  const handleImport = () => {
    const mpsArray = validateAndParseJson();
    if (mpsArray) {
      importMutation.mutate({ mps: mpsArray, overwrite });
    }
  };

  const downloadSampleJson = () => {
    const sampleData = {
      mps: [
        {
          parliamentCode: "P001",
          name: "Example MP Name",
          constituency: "Example Constituency",
          mympSlug: "example-mp-slug",
          mympUrl: "https://mymp.org.my/p/example-mp-slug?locale=en",
          bioSummary: "Brief biography summary here...",
          birthDate: "1970-01-15",
          hometown: "Kuala Lumpur",
          education: ["Bachelor's Degree, University Name", "High School Name"],
          politicalHistory: [
            { party: "PartyName", startYear: 2010, notes: "Current member" }
          ],
          nonPoliticalAffiliations: ["Organization Name"],
          careerHistory: ["Previous job title at Company"],
          wikipediaUrl: "https://en.wikipedia.org/wiki/Example_MP"
        }
      ]
    };
    const blob = new Blob([JSON.stringify(sampleData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mymp-import-template.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="MYMP Import Admin | Malaysian Parliament Dashboard"
        description="Import MP biography data from MYMP.org.my"
      />
      <Header />

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MYMP Data Import</h1>
            <p className="text-muted-foreground mt-1">
              Import MP biography data from MYMP.org.my (volunteer project)
            </p>
          </div>
          <a
            href="https://mymp.org.my"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" className="gap-2">
              <ExternalLink className="h-4 w-4" />
              Visit MYMP.org.my
            </Button>
          </a>
        </div>

        {/* Ethical Guidelines Alert */}
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Ethical Data Import Guidelines</AlertTitle>
          <AlertDescription className="mt-2">
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Do NOT scrape MYMP automatically - respect their terms of service</li>
              <li>Manually collect data from MYMP profile pages for accuracy</li>
              <li>Always credit MYMP as the source (automatically added to display)</li>
              <li>Update periodically, not in real-time</li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Status Summary */}
        {mympStatus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total MPs</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{mympStatus.summary.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">With MYMP Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-green-600">{mympStatus.summary.withMympData}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Missing MYMP Data</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-orange-600">{mympStatus.summary.withoutMympData}</p>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Import Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import MYMP Data
              </CardTitle>
              <CardDescription>
                Upload a JSON file or paste JSON data to import MP biographies
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* File Upload */}
              <div className="space-y-2">
                <Label>Upload JSON File</Label>
                <div className="flex gap-2">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={downloadSampleJson}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Template
                  </Button>
                </div>
              </div>

              <div className="text-center text-muted-foreground text-sm">— or —</div>

              {/* JSON Input */}
              <div className="space-y-2">
                <Label>Paste JSON Data</Label>
                <Textarea
                  placeholder={`{\n  "mps": [\n    {\n      "parliamentCode": "P001",\n      "bioSummary": "...",\n      ...\n    }\n  ]\n}`}
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setParseError(null);
                  }}
                  className="font-mono text-sm min-h-[200px]"
                />
              </div>

              {parseError && (
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertDescription>{parseError}</AlertDescription>
                </Alert>
              )}

              {/* Options */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overwrite"
                  checked={overwrite}
                  onCheckedChange={(checked) => setOverwrite(checked === true)}
                />
                <Label htmlFor="overwrite" className="text-sm font-normal">
                  Overwrite existing MYMP data (if unchecked, MPs with existing data will be skipped)
                </Label>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleImport}
                disabled={!jsonInput || importMutation.isPending}
                className="w-full gap-2"
              >
                {importMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <FileJson className="h-4 w-4" />
                    Import MYMP Data
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Results Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5" />
                Import Results
              </CardTitle>
              <CardDescription>
                Results from the last import operation
              </CardDescription>
            </CardHeader>
            <CardContent>
              {importResults ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">{importResults.summary.success}</p>
                      <p className="text-sm text-muted-foreground">Success</p>
                    </div>
                    <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                      <p className="text-2xl font-bold text-red-600">{importResults.summary.failed}</p>
                      <p className="text-sm text-muted-foreground">Failed</p>
                    </div>
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">{importResults.summary.skipped}</p>
                      <p className="text-sm text-muted-foreground">Skipped</p>
                    </div>
                  </div>

                  {importResults.results.success.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-green-600 mb-2">Successfully Updated:</p>
                      <div className="flex flex-wrap gap-1">
                        {importResults.results.success.slice(0, 10).map((name, i) => (
                          <Badge key={i} variant="outline" className="text-green-600 border-green-300">
                            {name}
                          </Badge>
                        ))}
                        {importResults.results.success.length > 10 && (
                          <Badge variant="outline">+{importResults.results.success.length - 10} more</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  {importResults.results.failed.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-red-600 mb-2">Failed:</p>
                      <div className="space-y-1">
                        {importResults.results.failed.slice(0, 5).map((item, i) => (
                          <p key={i} className="text-sm text-red-600">
                            {item.identifier}: {item.error}
                          </p>
                        ))}
                        {importResults.results.failed.length > 5 && (
                          <p className="text-sm text-muted-foreground">
                            +{importResults.results.failed.length - 5} more failures
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {importResults.results.skipped.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-yellow-600 mb-2">Skipped (already has data):</p>
                      <div className="flex flex-wrap gap-1">
                        {importResults.results.skipped.slice(0, 5).map((name, i) => (
                          <Badge key={i} variant="outline" className="text-yellow-600 border-yellow-300">
                            {name}
                          </Badge>
                        ))}
                        {importResults.results.skipped.length > 5 && (
                          <Badge variant="outline">+{importResults.results.skipped.length - 5} more</Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileJson className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No import results yet</p>
                  <p className="text-sm">Import data to see results here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* MP Status Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  MP MYMP Data Status
                </CardTitle>
                <CardDescription>
                  Overview of which MPs have biography data from MYMP
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchStatus()}
                disabled={statusLoading}
                className="gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${statusLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {statusLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : mympStatus ? (
              <div className="border rounded-lg overflow-auto max-h-[400px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Constituency</TableHead>
                      <TableHead>Parliament Code</TableHead>
                      <TableHead>MYMP Data</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead>MYMP Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mympStatus.status.map((mp) => (
                      <TableRow key={mp.id}>
                        <TableCell className="font-medium">{mp.name}</TableCell>
                        <TableCell>{mp.constituency}</TableCell>
                        <TableCell className="font-mono text-sm">{mp.parliamentCode}</TableCell>
                        <TableCell>
                          {mp.hasMympData ? (
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Yes
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-orange-600 border-orange-300">
                              <XCircle className="h-3 w-3 mr-1" />
                              No
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {mp.lastUpdated
                            ? new Date(mp.lastUpdated).toLocaleDateString()
                            : "—"}
                        </TableCell>
                        <TableCell>
                          {mp.mympUrl ? (
                            <a
                              href={mp.mympUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : mp.mympSlug ? (
                            <a
                              href={`https://mymp.org.my/p/${mp.mympSlug}?locale=en`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              View
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Unable to load MP status</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
