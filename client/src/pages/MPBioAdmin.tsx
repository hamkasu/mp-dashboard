/**
 * MP Biography Admin Page
 * Add and update MP biographies by pasting data
 */

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, FileText, CheckCircle2, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MpListItem {
  id: string;
  name: string;
  constituency: string;
  party: string;
  termEndDate: string | null;
}

interface MpBioData {
  id: string;
  name: string;
  constituency: string;
  party: string;
  biography: string | null;
}

export default function MPBioAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedMpId, setSelectedMpId] = useState("");
  const [biography, setBiography] = useState("");

  // Check admin authentication
  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  // Fetch all MPs
  const { data: mps = [], isLoading: mpsLoading } = useQuery<MpListItem[]>({
    queryKey: ["/api/mps"],
    enabled: authStatus?.isAdmin,
  });

  // Fetch selected MP's current biography
  const { data: mpBioData, isLoading: bioLoading } = useQuery<MpBioData>({
    queryKey: ["/api/admin/mp-bio", selectedMpId],
    queryFn: async () => {
      const response = await fetch(`/api/admin/mp-bio/${selectedMpId}`);
      if (!response.ok) throw new Error("Failed to fetch MP biography");
      return response.json();
    },
    enabled: !!selectedMpId && authStatus?.isAdmin,
  });

  // Load existing biography when MP is selected
  useEffect(() => {
    if (mpBioData?.biography) {
      setBiography(mpBioData.biography);
    } else {
      setBiography("");
    }
  }, [mpBioData]);

  // Update MP biography mutation
  const updateBioMutation = useMutation({
    mutationFn: async (data: { mpId: string; biography: string }) => {
      return await apiRequest("POST", "/api/admin/update-mp-bio", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "MP biography updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/mp-bio", selectedMpId] });
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update MP biography",
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
    setLocation("/admin/login");
    return null;
  }

  const selectedMp = mps.find((mp) => mp.id === selectedMpId);
  const activeMps = mps.filter((mp) => !mp.termEndDate || new Date(mp.termEndDate) > new Date());

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMpId) {
      toast({
        title: "Validation Error",
        description: "Please select an MP",
        variant: "destructive",
      });
      return;
    }

    updateBioMutation.mutate({
      mpId: selectedMpId,
      biography: biography.trim(),
    });
  };

  const handleClearForm = () => {
    setSelectedMpId("");
    setBiography("");
  };

  const mpsWithBio = mps.filter((mp) => {
    // We'll need to track which MPs have bios
    // For now, this is just a placeholder
    return false;
  });

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="MP Biography Admin"
        description="Admin page for adding and updating MP biographies."
        keywords="admin, MP biography"
        url="https://myparliament.calmic.com.my/admin/mp-bio"
      />
      <Header onMenuClick={() => {}} onSearchClick={() => {}} />

      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">MP Biography Management</h1>
            <p className="text-muted-foreground mt-2">
              Add or update MP biographies by pasting the data below
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Total Active MPs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeMps.length}</div>
                <p className="text-xs text-muted-foreground">Currently serving</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Selected MP</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedMp ? (
                  <>
                    <div className="text-lg font-bold truncate">{selectedMp.name}</div>
                    <p className="text-xs text-muted-foreground">{selectedMp.constituency}</p>
                  </>
                ) : (
                  <>
                    <div className="text-lg font-bold text-muted-foreground">None</div>
                    <p className="text-xs text-muted-foreground">Select an MP to edit</p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Biography Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Add/Update MP Biography
              </CardTitle>
              <CardDescription>
                Select an MP and paste their biography data. The biography will be displayed on
                their profile page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* MP Selection */}
                <div className="space-y-2">
                  <Label htmlFor="mp-select">Select MP *</Label>
                  <Select value={selectedMpId} onValueChange={setSelectedMpId}>
                    <SelectTrigger id="mp-select">
                      <SelectValue placeholder="Choose an MP..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeMps
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((mp) => (
                          <SelectItem key={mp.id} value={mp.id}>
                            {mp.name} - {mp.constituency} ({mp.party})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {selectedMp && (
                    <p className="text-sm text-muted-foreground">
                      Selected: <span className="font-medium">{selectedMp.name}</span> ({selectedMp.constituency})
                    </p>
                  )}
                </div>

                {/* Loading indicator when fetching existing bio */}
                {bioLoading && selectedMpId && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading existing biography...
                  </div>
                )}

                {/* Biography Text Area */}
                <div className="space-y-2">
                  <Label htmlFor="biography">Biography *</Label>
                  <Textarea
                    id="biography"
                    placeholder="Paste the MP's biography here...

Example:
YB Dato' Sri Example Name is the Member of Parliament for Example Constituency. Born on January 1, 1970, in Kuala Lumpur, he completed his education at University of Malaya with a degree in Law.

He has served in various capacities including as Minister of Education from 2018 to 2020. He is known for his advocacy on education reform and rural development.

Political career:
- First elected in 2008
- Re-elected in 2013, 2018, and 2022
- Currently serves on the Public Accounts Committee"
                    value={biography}
                    onChange={(e) => setBiography(e.target.value)}
                    rows={15}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {biography.length} characters
                    {mpBioData?.biography && (
                      <span className="ml-2">
                        (Existing biography: {mpBioData.biography.length} characters)
                      </span>
                    )}
                  </p>
                </div>

                {/* Info Alert */}
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Tips for biography content:</strong>
                    <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                      <li>Include birth date and place of birth</li>
                      <li>Education background and qualifications</li>
                      <li>Political career timeline and key positions held</li>
                      <li>Notable achievements or contributions</li>
                      <li>Committee memberships and special roles</li>
                    </ul>
                  </AlertDescription>
                </Alert>

                {/* Submit Buttons */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={!selectedMpId || !biography.trim() || updateBioMutation.isPending}
                  >
                    {updateBioMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Save Biography
                      </>
                    )}
                  </Button>

                  <Button type="button" variant="outline" onClick={handleClearForm}>
                    Clear Form
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Current Biography Preview */}
          {selectedMpId && mpBioData?.biography && (
            <Card>
              <CardHeader>
                <CardTitle>Current Biography</CardTitle>
                <CardDescription>
                  Preview of the existing biography for {mpBioData.name}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="whitespace-pre-wrap text-sm">{mpBioData.biography}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
