/**
 * MP Status Admin Page
 * Update MP status when they pass away or resign
 */

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserX, AlertTriangle, CheckCircle2, UserPlus, X } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Mp } from "@shared/schema";

interface MpListItem {
  id: string;
  name: string;
  constituency: string;
  party: string;
  termEndDate: string | null;
}

export default function MPStatusAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedMpId, setSelectedMpId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dateOfPassing, setDateOfPassing] = useState("");
  const [byElectionDate, setByElectionDate] = useState("");
  const [byElectionNotes, setByElectionNotes] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Check admin authentication
  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/auth-status"],
    retry: false,
  });

  // Fetch all MPs
  const { data: mps = [], isLoading: mpsLoading } = useQuery<MpListItem[]>({
    queryKey: ["/api/mps"],
    enabled: authStatus?.isAdmin,
  });

  // Update MP status mutation
  const updateMpStatusMutation = useMutation({
    mutationFn: async (data: {
      mpId: string;
      termEndDate: string;
      byElectionDate?: string;
      byElectionNotes?: string;
    }) => {
      return await apiRequest("POST", "/api/admin/update-mp-status", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "MP status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Reset form
      setSelectedMpId("");
      setSearchQuery("");
      setDateOfPassing("");
      setByElectionDate("");
      setByElectionNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update MP status",
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
    setLocation("/admin/login?redirect=/mp-status-admin");
    return null;
  }

  const selectedMp = mps.find((mp) => mp.id === selectedMpId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMpId || !dateOfPassing) {
      toast({
        title: "Validation Error",
        description: "Please select an MP and provide the date",
        variant: "destructive",
      });
      return;
    }

    updateMpStatusMutation.mutate({
      mpId: selectedMpId,
      termEndDate: dateOfPassing,
      byElectionDate: byElectionDate || undefined,
      byElectionNotes: byElectionNotes || undefined,
    });
  };

  const activeMps = mps.filter((mp) => !mp.termEndDate || new Date(mp.termEndDate) > new Date());
  const formerMps = mps.filter((mp) => mp.termEndDate && new Date(mp.termEndDate) <= new Date());

  // Filter MPs based on search query
  const filteredMps = activeMps.filter((mp) => {
    const query = searchQuery.toLowerCase();
    return (
      mp.name.toLowerCase().includes(query) ||
      mp.constituency.toLowerCase().includes(query) ||
      mp.party.toLowerCase().includes(query)
    );
  });

  const handleSelectMp = (mp: MpListItem) => {
    setSelectedMpId(mp.id);
    setSearchQuery(mp.name);
    setShowSuggestions(false);
  };

  const handleClearSelection = () => {
    setSelectedMpId("");
    setSearchQuery("");
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="MP Status Admin"
        description="Admin page for updating MP status."
        keywords="admin, MP status"
        url="https://myparliament.calmic.com.my/admin/mp-status"
      />
      <Header onMenuClick={() => {}} onSearchClick={() => {}} />

      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">MP Status Management</h1>
              <p className="text-muted-foreground mt-2">
                Update MP records when they pass away or resign
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setLocation("/add-mp-admin")}
              className="gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add New MP
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Active MPs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeMps.length}</div>
                <p className="text-xs text-muted-foreground">Currently serving</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Former MPs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formerMps.length}</div>
                <p className="text-xs text-muted-foreground">Deceased or resigned</p>
              </CardContent>
            </Card>
          </div>

          {/* Update Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5" />
                Update MP Status
              </CardTitle>
              <CardDescription>
                Mark an MP as former when they pass away or resign. This will update their status
                and enable by-election tracking.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* MP Selection */}
                <div className="space-y-2">
                  <Label htmlFor="mp-search">Select MP</Label>
                  <div className="relative">
                    <div className="flex gap-2">
                      <Input
                        ref={searchInputRef}
                        id="mp-search"
                        placeholder="Type MP name, constituency, or party..."
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          setShowSuggestions(true);
                          if (selectedMpId && activeMps.find((mp) => mp.id === selectedMpId)?.name !== e.target.value) {
                            setSelectedMpId("");
                          }
                        }}
                        onFocus={() => setShowSuggestions(true)}
                      />
                      {selectedMpId && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleClearSelection}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {showSuggestions && searchQuery && (
                      <div className="absolute top-full left-0 right-0 mt-1 border rounded-md bg-background shadow-md z-10 max-h-64 overflow-y-auto">
                        {filteredMps.length > 0 ? (
                          filteredMps.map((mp) => (
                            <button
                              key={mp.id}
                              type="button"
                              onClick={() => handleSelectMp(mp)}
                              className="w-full text-left px-3 py-2 hover:bg-accent border-b last:border-b-0 transition-colors"
                            >
                              <div className="font-medium">{mp.name}</div>
                              <div className="text-sm text-muted-foreground">{mp.constituency} ({mp.party})</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-sm text-muted-foreground">No MPs found</div>
                        )}
                      </div>
                    )}
                  </div>
                  {selectedMp && (
                    <p className="text-sm text-muted-foreground">
                      Selected: <span className="font-medium">{selectedMp.name}</span> ({selectedMp.constituency})
                    </p>
                  )}
                </div>

                {/* Date of Passing/Resignation */}
                <div className="space-y-2">
                  <Label htmlFor="term-end-date">Date of Passing/Resignation *</Label>
                  <Input
                    id="term-end-date"
                    type="date"
                    value={dateOfPassing}
                    onChange={(e) => setDateOfPassing(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The date when the MP passed away or resigned
                  </p>
                </div>

                {/* By-Election Date (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="by-election-date">By-Election Date (Optional)</Label>
                  <Input
                    id="by-election-date"
                    type="date"
                    value={byElectionDate}
                    onChange={(e) => setByElectionDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If a by-election has been scheduled, enter the date here
                  </p>
                </div>

                {/* By-Election Notes (Optional) */}
                <div className="space-y-2">
                  <Label htmlFor="by-election-notes">By-Election Notes (Optional)</Label>
                  <Textarea
                    id="by-election-notes"
                    placeholder="Enter any relevant notes about the by-election, successor, or circumstances..."
                    value={byElectionNotes}
                    onChange={(e) => setByElectionNotes(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Additional information about the succession or by-election process
                  </p>
                </div>

                {/* Warning Alert */}
                {selectedMpId && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This action will:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Mark {selectedMp?.name} as a Former MP</li>
                        <li>Update their role to "Former Member of Parliament (Deceased)"</li>
                        <li>Display their card with a grayscale filter and "Former MP" banner</li>
                        <li>Move them to the "Former MPs" filter by default</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={!selectedMpId || !dateOfPassing || updateMpStatusMutation.isPending}
                  >
                    {updateMpStatusMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Update MP Status
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setSelectedMpId("");
                      setSearchQuery("");
                      setDateOfPassing("");
                      setByElectionDate("");
                      setByElectionNotes("");
                    }}
                  >
                    Clear Form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Former MPs List */}
          {formerMps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Former MPs</CardTitle>
                <CardDescription>
                  MPs who have been marked as former (deceased or resigned)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formerMps.map((mp) => (
                    <div
                      key={mp.id}
                      className="flex items-start justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{mp.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {mp.constituency} ({mp.party})
                        </p>
                        {mp.termEndDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Term ended: {new Date(mp.termEndDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <UserX className="h-5 w-5 text-muted-foreground" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
