import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, FileText, Calendar, Download } from "lucide-react";
import type { HansardRecord } from "@shared/schema";

export default function HansardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const { data: allRecords, isLoading } = useQuery<HansardRecord[]>({
    queryKey: ["/api/hansard-records"],
  });

  const filteredRecords = allRecords?.filter(record => {
    const matchesSearch = !searchQuery || 
      record.transcript.toLowerCase().includes(searchQuery.toLowerCase()) ||
      record.topics.some(topic => topic.toLowerCase().includes(searchQuery.toLowerCase())) ||
      record.sessionNumber.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStartDate = !startDate || new Date(record.sessionDate) >= new Date(startDate);
    const matchesEndDate = !endDate || new Date(record.sessionDate) <= new Date(endDate);
    
    return matchesSearch && matchesStartDate && matchesEndDate;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading Hansard records...</div>
      </div>
    );
  }

  return (
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
            <CardContent className="py-12 text-center text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No Hansard records found matching your criteria.</p>
              <p className="text-sm mt-2">Try adjusting your search filters.</p>
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
                {record.pdfLinks && record.pdfLinks.length > 0 && (
                  <Button
                    data-testid={`button-download-${record.id}`}
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a href={record.pdfLinks[0]} target="_blank" rel="noopener noreferrer">
                      <Download className="w-4 h-4 mr-2" />
                      PDF
                    </a>
                  </Button>
                )}
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
              <p className="text-sm text-muted-foreground line-clamp-3">
                {record.transcript.substring(0, 300)}...
              </p>
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
  );
}
