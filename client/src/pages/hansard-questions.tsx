/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, BarChart3, Users, MapPin, AlertCircle, CheckCircle } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ParsedQuestion {
  mpName: string;
  constituency: string;
  questionText: string;
  questionNumber?: string;
  lineNumber: number;
}

interface ConstituencyStat {
  constituency: string;
  questionCount: number;
  mpNames: string[];
}

interface ParseResult {
  sessionInfo: {
    sessionDate: string;
    sessionNumber: string;
    parliamentTerm: string;
    sitting: string;
  };
  summary: {
    totalQuestions: number;
    uniqueConstituencies: number;
    constituenciesList: string[];
    persistedCount?: number;
  };
  questions: ParsedQuestion[];
  constituencyStats: ConstituencyStat[];
}

export default function HansardQuestions() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);

  const parseMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('pdf', file);
      const response = await fetch('/api/hansard/parse-questions', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to parse PDF');
      }
      
      return response.json();
    },
    onSuccess: (data: ParseResult) => {
      setParseResult(data);
      // Invalidate constituency stats cache since we've added new questions
      queryClient.invalidateQueries({ queryKey: ["/api/hansard/constituency-question-stats"] });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setParseResult(null);
      }
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setParseResult(null);
    }
  };

  const handleParse = () => {
    if (selectedFile) {
      parseMutation.mutate(selectedFile);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Hansard Question Analyzer</h1>
          <p className="text-muted-foreground">
            Upload Hansard PDFs to analyze parliamentary questions by constituency
          </p>
        </div>
      </div>

      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Hansard PDF
          </CardTitle>
          <CardDescription>
            Upload a Malaysian Parliament Hansard PDF to extract and analyze questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-md p-8 text-center transition-colors ${
              dragActive ? 'border-primary bg-primary/5' : 'border-border'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            data-testid="drop-zone-hansard-pdf"
          >
            <FileText className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium mb-2">
              Drag and drop a PDF file here
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              or
            </p>
            <label htmlFor="file-upload">
              <Button variant="outline" asChild>
                <span>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={handleFileInput}
                    data-testid="input-file-upload"
                  />
                  Select PDF File
                </span>
              </Button>
            </label>
          </div>

          {selectedFile && (
            <Alert data-testid="alert-file-selected">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Selected: <span data-testid="text-selected-file-name">{selectedFile.name}</span> ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleParse}
            disabled={!selectedFile || parseMutation.isPending}
            className="w-full"
            data-testid="button-parse-pdf"
          >
            {parseMutation.isPending ? 'Parsing...' : 'Parse PDF'}
          </Button>

          {parseMutation.isError && (
            <Alert variant="destructive" data-testid="alert-parse-error">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {parseMutation.error instanceof Error ? parseMutation.error.message : 'Failed to parse PDF'}
              </AlertDescription>
            </Alert>
          )}

          {parseResult && parseResult.summary.persistedCount !== undefined && (
            <Alert data-testid="alert-persisted-count">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Successfully persisted {parseResult.summary.persistedCount} of {parseResult.summary.totalQuestions} questions to the database
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Section */}
      {parseResult && (
        <>
          {/* Session Info */}
          <Card>
            <CardHeader>
              <CardTitle>Session Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Session Number</p>
                  <p className="font-semibold" data-testid="text-session-number">{parseResult.sessionInfo.sessionNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-semibold" data-testid="text-session-date">{parseResult.sessionInfo.sessionDate}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Parliament</p>
                  <p className="font-semibold" data-testid="text-parliament-term">{parseResult.sessionInfo.parliamentTerm}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Sitting</p>
                  <p className="font-semibold" data-testid="text-sitting">{parseResult.sessionInfo.sitting}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
                <FileText className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-total-questions">{parseResult.summary.totalQuestions}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Constituencies Asked Questions</CardTitle>
                <MapPin className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="text-unique-constituencies">{parseResult.summary.uniqueConstituencies}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Questions per Constituency</CardTitle>
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(parseResult.summary.totalQuestions / parseResult.summary.uniqueConstituencies).toFixed(1)}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Constituency Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Questions by Constituency
              </CardTitle>
              <CardDescription>
                Breakdown of parliamentary questions by constituency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rank</TableHead>
                    <TableHead>Constituency</TableHead>
                    <TableHead>Questions</TableHead>
                    <TableHead>MPs</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parseResult.constituencyStats.map((stat, index) => (
                    <TableRow key={stat.constituency} data-testid={`row-constituency-${index}`}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{stat.constituency}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{stat.questionCount}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {stat.mpNames.join(', ')}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* All Questions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                All Questions ({parseResult.questions.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[600px] overflow-y-auto">
                {parseResult.questions.map((q, index) => (
                  <div key={index} className="border rounded-md p-4 space-y-2" data-testid={`card-question-${index}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <p className="font-semibold">{q.mpName}</p>
                        <p className="text-sm text-muted-foreground">{q.constituency}</p>
                      </div>
                      {q.questionNumber && (
                        <Badge variant="outline">Q{q.questionNumber}</Badge>
                      )}
                    </div>
                    <p className="text-sm">{q.questionText}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
