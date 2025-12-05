import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, MapPin, RefreshCw, Search, Building2 } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DunMember } from "@shared/schema";

function getMemberInitials(name: string): string {
  const parts = name.split(' ').filter(p => 
    !['YB', 'YAB', 'DATUK', 'DATO', 'DATO\'', 'TAN', 'SRI', 'DR', 'DR.', 'HAJI', 'HAJJAH', 'PATINGGI', 'AMAR'].includes(p.toUpperCase())
  );
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return parts[0]?.substring(0, 2).toUpperCase() || '??';
}

function getPartyColor(party: string | null): string {
  if (!party) return "bg-muted text-muted-foreground";
  
  const lowerParty = party.toLowerCase();
  
  if (lowerParty.includes('gps') || lowerParty.includes('gabungan')) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  }
  if (lowerParty.includes('ph') || lowerParty.includes('pakatan')) {
    return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  }
  if (lowerParty.includes('bn') || lowerParty.includes('barisan')) {
    return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
  }
  if (lowerParty.includes('pn') || lowerParty.includes('perikatan')) {
    return "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400";
  }
  
  return "bg-muted text-muted-foreground";
}

export default function DunSarawak() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: authStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/status"],
  });

  const { data: members = [], isLoading, refetch } = useQuery<DunMember[]>({
    queryKey: ["/api/dun/sarawak/members"],
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/dun/sarawak/scrape");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ms' ? "Berjaya" : "Success",
        description: language === 'ms' 
          ? `${data.insertedCount} ahli DUN Sarawak telah dikemas kini`
          : `${data.insertedCount} Sarawak DUN members have been updated`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dun/sarawak/members"] });
    },
    onError: (error: any) => {
      toast({
        title: language === 'ms' ? "Ralat" : "Error",
        description: error.message || "Failed to scrape DUN data",
        variant: "destructive",
      });
    },
  });

  const filteredMembers = members.filter(member => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.name.toLowerCase().includes(query) ||
      member.constituencyName.toLowerCase().includes(query) ||
      member.constituencyCode.toLowerCase().includes(query) ||
      (member.party && member.party.toLowerCase().includes(query))
    );
  });

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const codeA = parseInt(a.constituencyCode.replace(/\D/g, ''));
    const codeB = parseInt(b.constituencyCode.replace(/\D/g, ''));
    return codeA - codeB;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container max-w-7xl mx-auto px-4 py-8">
        <div className="space-y-2 mb-8">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold" data-testid="text-dun-sarawak-title">
              {language === 'ms' ? 'Dewan Undangan Negeri Sarawak' : 'Sarawak State Legislative Assembly'}
            </h1>
          </div>
          <p className="text-muted-foreground" data-testid="text-dun-sarawak-description">
            {language === 'ms' 
              ? 'Ahli-ahli Dewan Undangan Negeri Sarawak (82 kerusi)'
              : 'Members of the Sarawak State Legislative Assembly (82 seats)'}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'ms' ? 'Cari ahli atau kawasan...' : 'Search member or constituency...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search-dun-members"
            />
          </div>
          {authStatus?.isAdmin && (
            <Button 
              onClick={() => scrapeMutation.mutate()} 
              disabled={scrapeMutation.isPending}
              variant="outline"
              data-testid="button-refresh-dun-data"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
              {scrapeMutation.isPending 
                ? (language === 'ms' ? 'Mengemas kini...' : 'Updating...') 
                : (language === 'ms' ? 'Kemas Kini Data' : 'Refresh Data')}
            </Button>
          )}
        </div>

        <div className="flex items-center gap-4 mb-6">
          <Badge variant="secondary" className="text-sm">
            <Users className="h-3 w-3 mr-1" />
            {isLoading ? '...' : `${members.length} ${language === 'ms' ? 'Ahli' : 'Members'}`}
          </Badge>
          {searchQuery && (
            <Badge variant="outline" className="text-sm">
              {language === 'ms' ? 'Ditapis' : 'Filtered'}: {filteredMembers.length}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-16 w-16 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : members.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {language === 'ms' ? 'Tiada Data Ahli' : 'No Member Data'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {language === 'ms' 
                  ? 'Data ahli DUN Sarawak belum tersedia.'
                  : 'Sarawak DUN member data is not yet available.'}
              </p>
              {authStatus?.isAdmin && (
                <Button onClick={() => scrapeMutation.mutate()} disabled={scrapeMutation.isPending}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
                  {language === 'ms' ? 'Kemas Kini Data' : 'Refresh Data'}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedMembers.map((member) => (
              <Card key={member.id} className="hover-elevate transition-all duration-200" data-testid={`card-dun-member-${member.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-border">
                      <AvatarImage 
                        src={member.photoUrl || undefined} 
                        alt={member.name}
                        className="object-cover"
                      />
                      <AvatarFallback className="text-sm font-medium bg-primary/10 text-primary">
                        {getMemberInitials(member.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm line-clamp-2 mb-1" data-testid={`text-member-name-${member.id}`}>
                        {member.title && <span className="text-muted-foreground">{member.title} </span>}
                        {member.name.replace(new RegExp(`^${member.title}\\s*`, 'i'), '')}
                      </h3>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">
                          <span className="font-medium">{member.constituencyCode}</span> - {member.constituencyName}
                        </span>
                      </div>
                      {member.party && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getPartyColor(member.party)}`}
                          data-testid={`badge-party-${member.id}`}
                        >
                          {member.party}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {sortedMembers.length === 0 && searchQuery && !isLoading && members.length > 0 && (
          <Card className="mt-4">
            <CardContent className="p-8 text-center">
              <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">
                {language === 'ms' ? 'Tiada Keputusan' : 'No Results'}
              </h3>
              <p className="text-muted-foreground">
                {language === 'ms' 
                  ? `Tiada ahli dijumpai untuk carian "${searchQuery}"`
                  : `No members found for "${searchQuery}"`}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
