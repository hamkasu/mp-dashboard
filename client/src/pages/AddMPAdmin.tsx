/**
 * Add MP Admin Page
 * Create new MP records (for by-election replacements)
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface MpListItem {
  id: string;
  name: string;
  constituency: string;
  parliamentCode: string;
  party: string;
  state: string;
  termEndDate: string | null;
}

// Malaysian political parties
const PARTIES = [
  { value: "PH", label: "Pakatan Harapan (PH)" },
  { value: "BN", label: "Barisan Nasional (BN)" },
  { value: "PN", label: "Perikatan Nasional (PN)" },
  { value: "GPS", label: "Gabungan Parti Sarawak (GPS)" },
  { value: "GRS", label: "Gabungan Rakyat Sabah (GRS)" },
  { value: "WARISAN", label: "Warisan" },
  { value: "MUDA", label: "MUDA" },
  { value: "PSB", label: "Parti Sarawak Bersatu (PSB)" },
  { value: "KDM", label: "Parti Kesejahteraan Demokratik Masyarakat (KDM)" },
  { value: "BEBAS", label: "Bebas (Independent)" },
];

// Malaysian states
const STATES = [
  "Perlis",
  "Kedah",
  "Penang",
  "Perak",
  "Selangor",
  "Kuala Lumpur",
  "Putrajaya",
  "Negeri Sembilan",
  "Melaka",
  "Johor",
  "Pahang",
  "Terengganu",
  "Kelantan",
  "Sabah",
  "Sarawak",
  "Labuan",
];

export default function AddMPAdmin() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Form state
  const [name, setName] = useState("");
  const [party, setParty] = useState("");
  const [parliamentCode, setParliamentCode] = useState("");
  const [constituency, setConstituency] = useState("");
  const [state, setState] = useState("");
  const [gender, setGender] = useState("");
  const [title, setTitle] = useState("YB");
  const [swornInDate, setSwornInDate] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [replacesFormerMpId, setReplacesFormerMpId] = useState("");

  // Check admin authentication
  const { data: authStatus, isLoading: authLoading } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  // Fetch all MPs to get former MPs list
  const { data: mps = [], isLoading: mpsLoading } = useQuery<MpListItem[]>({
    queryKey: ["/api/mps"],
    enabled: authStatus?.isAdmin,
  });

  // Create MP mutation
  const createMpMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      party: string;
      parliamentCode: string;
      constituency: string;
      state: string;
      gender: string;
      title?: string;
      swornInDate: string;
      photoUrl?: string;
      email?: string;
      telephone?: string;
      mobileNumber?: string;
      facebookUrl?: string;
      instagramUrl?: string;
      twitterUrl?: string;
      replacesFormerMpId?: string;
    }) => {
      return await apiRequest("POST", "/api/admin/create-mp", data);
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `MP ${data.mp?.name || name} created successfully`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/mps"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      // Reset form
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create MP",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setName("");
    setParty("");
    setParliamentCode("");
    setConstituency("");
    setState("");
    setGender("");
    setTitle("YB");
    setSwornInDate("");
    setPhotoUrl("");
    setEmail("");
    setTelephone("");
    setMobileNumber("");
    setFacebookUrl("");
    setInstagramUrl("");
    setTwitterUrl("");
    setReplacesFormerMpId("");
  };

  // Redirect if not admin
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!authStatus?.isAdmin) {
    setLocation("/admin/login?redirect=/add-mp-admin");
    return null;
  }

  // Get former MPs (those with termEndDate in the past)
  const formerMps = mps.filter((mp) => mp.termEndDate && new Date(mp.termEndDate) <= new Date());

  // When a former MP is selected, auto-fill constituency info
  const handleFormerMpSelect = (mpId: string) => {
    setReplacesFormerMpId(mpId);
    if (mpId) {
      const formerMp = formerMps.find((mp) => mp.id === mpId);
      if (formerMp) {
        setParliamentCode(formerMp.parliamentCode);
        setConstituency(formerMp.constituency);
        setState(formerMp.state);
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name || !party || !parliamentCode || !constituency || !state || !gender || !swornInDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createMpMutation.mutate({
      name,
      party,
      parliamentCode,
      constituency,
      state,
      gender,
      title: title || undefined,
      swornInDate,
      photoUrl: photoUrl || undefined,
      email: email || undefined,
      telephone: telephone || undefined,
      mobileNumber: mobileNumber || undefined,
      facebookUrl: facebookUrl || undefined,
      instagramUrl: instagramUrl || undefined,
      twitterUrl: twitterUrl || undefined,
      replacesFormerMpId: replacesFormerMpId || undefined,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Add New MP"
        description="Admin page for adding new MP records."
        keywords="admin, add MP, by-election"
        url="https://myparliament.calmic.com.my/add-mp-admin"
      />
      <Header onMenuClick={() => {}} onSearchClick={() => {}} />

      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Add New MP</h1>
            <p className="text-muted-foreground mt-2">
              Create a new MP record (typically for by-election replacements)
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Use this form to add a new MP who has won a by-election to replace a deceased or resigned MP.
              Select the former MP from the dropdown to auto-fill the constituency information.
            </AlertDescription>
          </Alert>

          {/* Create Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                New MP Details
              </CardTitle>
              <CardDescription>
                Enter the details of the new Member of Parliament
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Replacement Selection */}
                {formerMps.length > 0 && (
                  <div className="space-y-2 p-4 border rounded-lg bg-muted/50">
                    <Label htmlFor="replaces-mp">Replaces Former MP (Optional)</Label>
                    <Select value={replacesFormerMpId} onValueChange={handleFormerMpSelect}>
                      <SelectTrigger id="replaces-mp">
                        <SelectValue placeholder="Select former MP to replace..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">-- None (New Constituency) --</SelectItem>
                        {formerMps.map((mp) => (
                          <SelectItem key={mp.id} value={mp.id}>
                            {mp.name} - {mp.constituency} ({mp.parliamentCode})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Selecting a former MP will auto-fill the constituency details
                    </p>
                  </div>
                )}

                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Name */}
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Ahmad bin Abdullah"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Select value={title} onValueChange={setTitle}>
                      <SelectTrigger id="title">
                        <SelectValue placeholder="Select title..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="YB">YB</SelectItem>
                        <SelectItem value="YAB">YAB</SelectItem>
                        <SelectItem value="Datuk">Datuk</SelectItem>
                        <SelectItem value="Datuk Seri">Datuk Seri</SelectItem>
                        <SelectItem value="Tan Sri">Tan Sri</SelectItem>
                        <SelectItem value="Tun">Tun</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Gender */}
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger id="gender">
                        <SelectValue placeholder="Select gender..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Party */}
                  <div className="space-y-2">
                    <Label htmlFor="party">Political Party *</Label>
                    <Select value={party} onValueChange={setParty}>
                      <SelectTrigger id="party">
                        <SelectValue placeholder="Select party..." />
                      </SelectTrigger>
                      <SelectContent>
                        {PARTIES.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Constituency Information */}
                <div className="space-y-4">
                  <h3 className="font-medium">Constituency Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Parliament Code */}
                    <div className="space-y-2">
                      <Label htmlFor="parliament-code">Parliament Code *</Label>
                      <Input
                        id="parliament-code"
                        placeholder="e.g., P001"
                        value={parliamentCode}
                        onChange={(e) => setParliamentCode(e.target.value)}
                        required
                      />
                    </div>

                    {/* Constituency */}
                    <div className="space-y-2">
                      <Label htmlFor="constituency">Constituency Name *</Label>
                      <Input
                        id="constituency"
                        placeholder="e.g., Padang Besar"
                        value={constituency}
                        onChange={(e) => setConstituency(e.target.value)}
                        required
                      />
                    </div>

                    {/* State */}
                    <div className="space-y-2">
                      <Label htmlFor="state">State *</Label>
                      <Select value={state} onValueChange={setState}>
                        <SelectTrigger id="state">
                          <SelectValue placeholder="Select state..." />
                        </SelectTrigger>
                        <SelectContent>
                          {STATES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Sworn In Date */}
                <div className="space-y-2">
                  <Label htmlFor="sworn-in-date">Sworn In Date *</Label>
                  <Input
                    id="sworn-in-date"
                    type="date"
                    value={swornInDate}
                    onChange={(e) => setSwornInDate(e.target.value)}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    The date when the new MP was sworn in after the by-election
                  </p>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="font-medium">Contact Information (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="mp@parliament.gov.my"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telephone">Telephone</Label>
                      <Input
                        id="telephone"
                        placeholder="03-12345678"
                        value={telephone}
                        onChange={(e) => setTelephone(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mobile">Mobile Number</Label>
                      <Input
                        id="mobile"
                        placeholder="012-3456789"
                        value={mobileNumber}
                        onChange={(e) => setMobileNumber(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="photo-url">Photo URL</Label>
                      <Input
                        id="photo-url"
                        placeholder="https://..."
                        value={photoUrl}
                        onChange={(e) => setPhotoUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Social Media */}
                <div className="space-y-4">
                  <h3 className="font-medium">Social Media (Optional)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="facebook">Facebook URL</Label>
                      <Input
                        id="facebook"
                        placeholder="https://facebook.com/..."
                        value={facebookUrl}
                        onChange={(e) => setFacebookUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="instagram">Instagram URL</Label>
                      <Input
                        id="instagram"
                        placeholder="https://instagram.com/..."
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="twitter">Twitter/X URL</Label>
                      <Input
                        id="twitter"
                        placeholder="https://twitter.com/..."
                        value={twitterUrl}
                        onChange={(e) => setTwitterUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Warning Alert */}
                {name && parliamentCode && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      This action will create a new MP record:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li><span className="font-medium">{name}</span> for {constituency} ({parliamentCode})</li>
                        <li>Party: {party || "(not selected)"}</li>
                        <li>State: {state || "(not selected)"}</li>
                        {replacesFormerMpId && (
                          <li>Replacing: {formerMps.find(mp => mp.id === replacesFormerMpId)?.name}</li>
                        )}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Submit Buttons */}
                <div className="flex gap-3">
                  <Button
                    type="submit"
                    disabled={!name || !party || !parliamentCode || !constituency || !state || !gender || !swornInDate || createMpMutation.isPending}
                  >
                    {createMpMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Create MP
                      </>
                    )}
                  </Button>

                  <Button type="button" variant="outline" onClick={resetForm}>
                    Clear Form
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setLocation("/mp-status-admin")}
                  >
                    Go to MP Status Admin
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Former MPs Reference */}
          {formerMps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Former MPs Awaiting Replacement</CardTitle>
                <CardDescription>
                  These MPs have been marked as former and may need by-election replacements
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {formerMps.map((mp) => (
                    <div
                      key={mp.id}
                      className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                      onClick={() => handleFormerMpSelect(mp.id)}
                    >
                      <div>
                        <p className="font-medium">{mp.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {mp.constituency} ({mp.parliamentCode}) - {mp.party}
                        </p>
                        {mp.termEndDate && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Term ended: {new Date(mp.termEndDate).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFormerMpSelect(mp.id);
                        }}
                      >
                        Use as Template
                      </Button>
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
