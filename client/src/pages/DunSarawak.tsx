import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, MapPin, RefreshCw, Search, Building2, DollarSign, TrendingDown, Home, AlertTriangle, Briefcase, BarChart3, Wallet, Eye, ArrowUpDown, Crown, Award } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useEffect } from "react";
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

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount).replace('MYR', 'RM');
}

function getPovertyColor(povertyRate: number | null): string {
  if (povertyRate === null) return "text-muted-foreground";
  // povertyRate is stored as percentage * 10 (e.g., 52 = 5.2%)
  const rate = povertyRate / 10; // Convert to actual percentage
  if (rate < 5) return "text-green-600 dark:text-green-400";
  if (rate < 10) return "text-yellow-600 dark:text-yellow-400";
  if (rate < 20) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function formatPovertyRate(povertyRate: number | null): string {
  if (povertyRate === null) return "N/A";
  // povertyRate is stored as percentage * 10 (e.g., 52 = 5.2%)
  return (povertyRate / 10).toFixed(1) + "%";
}

function getCabinetRoleColor(role: string | null): string {
  if (!role) return "";
  const lowerRole = role.toLowerCase();
  if (lowerRole.includes('premier') || lowerRole.includes('chief minister')) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  }
  if (lowerRole.includes('deputy chief') || lowerRole.includes('deputy premier')) {
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
  }
  if (lowerRole.includes('minister') && !lowerRole.includes('deputy') && !lowerRole.includes('assistant')) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
  }
  if (lowerRole.includes('deputy minister')) {
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
  }
  if (lowerRole.includes('assistant')) {
    return "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-400";
  }
  return "bg-muted text-muted-foreground";
}


type SortOption = 'code' | 'population-asc' | 'population-desc';

export default function DunSarawak() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('code');

  const { data: authStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/auth-status"],
    retry: false,
  });

  const { data: members = [], isLoading, refetch } = useQuery<DunMember[]>({
    queryKey: ["/api/dun/sarawak/members"],
  });

  const { data: viewsData } = useQuery<{ views: number }>({
    queryKey: ["/api/dun/sarawak/views"],
  });

  // Track page view
  useEffect(() => {
    const trackView = async () => {
      try {
        await apiRequest("POST", "/api/track-view", {
          path: "/dun/sarawak",
        });
      } catch (error) {
        // Silently fail - don't interrupt user experience
        console.debug("Failed to track page view:", error);
      }
    };
    trackView();
  }, []); // Run only once on mount

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

  const scrapePovertyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/dun/sarawak/scrape-poverty");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ms' ? "Berjaya" : "Success",
        description: language === 'ms' 
          ? `Data kemiskinan untuk ${data.updatedCount} kawasan telah dikemas kini`
          : `Poverty data for ${data.updatedCount} constituencies has been updated`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dun/sarawak/members"] });
    },
    onError: (error: any) => {
      toast({
        title: language === 'ms' ? "Ralat" : "Error",
        description: error.message || "Failed to scrape poverty data",
        variant: "destructive",
      });
    },
  });

  const updateCabinetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/dun/sarawak/update-cabinet");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: language === 'ms' ? "Berjaya" : "Success",
        description: language === 'ms' 
          ? `Data kabinet untuk ${data.updatedCount} ahli telah dikemas kini (${data.cabinetMembersFound} ahli kabinet dijumpai)`
          : `Cabinet data for ${data.updatedCount} members has been updated (${data.cabinetMembersFound} cabinet members found)`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dun/sarawak/members"] });
    },
    onError: (error: any) => {
      toast({
        title: language === 'ms' ? "Ralat" : "Error",
        description: error.message || "Failed to update cabinet data",
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
    switch (sortBy) {
      case 'population-asc':
        // Smallest constituency first (nulls last)
        if (a.population === null && b.population === null) return 0;
        if (a.population === null) return 1;
        if (b.population === null) return -1;
        return a.population - b.population;
      case 'population-desc':
        // Biggest constituency first (nulls last)
        if (a.population === null && b.population === null) return 0;
        if (a.population === null) return 1;
        if (b.population === null) return -1;
        return b.population - a.population;
      case 'code':
      default:
        const codeA = parseInt(a.constituencyCode.replace(/\D/g, ''));
        const codeB = parseInt(b.constituencyCode.replace(/\D/g, ''));
        return codeA - codeB;
    }
  });

  // Calculate total salary including cabinet positions from database
  const calculateTotalMonthlySalary = () => {
    let total = 0;
    members.forEach(member => {
      const dunSalary = member.totalMonthlyAllowance || 40000;
      const cabinetSalary = member.cabinetTotalSalary || 0;
      total += dunSalary + cabinetSalary;
    });
    return total;
  };
  
  // Calculate cabinet salary totals by role from database
  const calculateCabinetSalaryByRole = () => {
    const roleGroups = {
      premier: { total: 0, count: 0 },
      deputyPremier: { total: 0, count: 0 },
      minister: { total: 0, count: 0 },
      deputyMinister: { total: 0, count: 0 },
      assistantMinister: { total: 0, count: 0 },
    };
    
    members.forEach(member => {
      if (!member.cabinetRole || !member.cabinetTotalSalary) return;
      const lowerRole = member.cabinetRole.toLowerCase();
      
      if ((lowerRole.includes('premier') || lowerRole.includes('chief minister')) && !lowerRole.includes('deputy')) {
        roleGroups.premier.total += member.cabinetTotalSalary;
        roleGroups.premier.count++;
      } else if (lowerRole.includes('deputy chief') || lowerRole.includes('deputy premier')) {
        roleGroups.deputyPremier.total += member.cabinetTotalSalary;
        roleGroups.deputyPremier.count++;
      } else if (lowerRole.includes('deputy minister')) {
        roleGroups.deputyMinister.total += member.cabinetTotalSalary;
        roleGroups.deputyMinister.count++;
      } else if (lowerRole.includes('assistant minister') || lowerRole.includes('assistant')) {
        roleGroups.assistantMinister.total += member.cabinetTotalSalary;
        roleGroups.assistantMinister.count++;
      } else if (lowerRole.includes('minister')) {
        roleGroups.minister.total += member.cabinetTotalSalary;
        roleGroups.minister.count++;
      }
    });
    
    return {
      premier: roleGroups.premier.count > 0 ? Math.round(roleGroups.premier.total / roleGroups.premier.count) : 0,
      deputyPremier: roleGroups.deputyPremier.count > 0 ? Math.round(roleGroups.deputyPremier.total / roleGroups.deputyPremier.count) : 0,
      minister: roleGroups.minister.count > 0 ? Math.round(roleGroups.minister.total / roleGroups.minister.count) : 0,
      deputyMinister: roleGroups.deputyMinister.count > 0 ? Math.round(roleGroups.deputyMinister.total / roleGroups.deputyMinister.count) : 0,
      assistantMinister: roleGroups.assistantMinister.count > 0 ? Math.round(roleGroups.assistantMinister.total / roleGroups.assistantMinister.count) : 0,
    };
  };
  
  const cabinetSalaryByRole = calculateCabinetSalaryByRole();

  const totalMonthlySalary = calculateTotalMonthlySalary();
  const cabinetMembersCount = members.filter(m => m.cabinetRole).length;

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
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-full sm:w-[220px]" data-testid="select-sort-dun">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue placeholder={language === 'ms' ? 'Susun mengikut...' : 'Sort by...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code">
                {language === 'ms' ? 'Kod Kawasan' : 'Constituency Code'}
              </SelectItem>
              <SelectItem value="population-asc">
                {language === 'ms' ? 'Populasi (Terkecil)' : 'Population (Smallest)'}
              </SelectItem>
              <SelectItem value="population-desc">
                {language === 'ms' ? 'Populasi (Terbesar)' : 'Population (Largest)'}
              </SelectItem>
            </SelectContent>
          </Select>
          {authStatus?.isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={() => updateCabinetMutation.mutate()} 
                disabled={updateCabinetMutation.isPending || members.length === 0}
                variant="default"
                data-testid="button-update-cabinet-data"
              >
                <Crown className={`h-4 w-4 mr-2 ${updateCabinetMutation.isPending ? 'animate-spin' : ''}`} />
                {updateCabinetMutation.isPending 
                  ? (language === 'ms' ? 'Mengemas kini...' : 'Updating...') 
                  : (language === 'ms' ? 'Kemas Kini Data Kabinet' : 'Update Cabinet Data')}
              </Button>
              <Button 
                onClick={() => scrapePovertyMutation.mutate()} 
                disabled={scrapePovertyMutation.isPending || scrapeMutation.isPending || members.length === 0}
                variant="outline"
                data-testid="button-refresh-poverty-data"
              >
                <TrendingDown className={`h-4 w-4 mr-2 ${scrapePovertyMutation.isPending ? 'animate-spin' : ''}`} />
                {scrapePovertyMutation.isPending 
                  ? (language === 'ms' ? 'Mengemas kini...' : 'Updating...') 
                  : (language === 'ms' ? 'Kemas Kini Data Kemiskinan' : 'Refresh Poverty Data')}
              </Button>
              <Button 
                onClick={() => scrapeMutation.mutate()} 
                disabled={scrapeMutation.isPending || scrapePovertyMutation.isPending}
                variant="outline"
                data-testid="button-refresh-dun-data"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${scrapeMutation.isPending ? 'animate-spin' : ''}`} />
                {scrapeMutation.isPending 
                  ? (language === 'ms' ? 'Mengemas kini...' : 'Updating...') 
                  : (language === 'ms' ? 'Kemas Kini Ahli' : 'Refresh Members')}
              </Button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 mb-6">
          <Badge variant="secondary" className="text-sm">
            <Users className="h-3 w-3 mr-1" />
            {isLoading ? '...' : `${members.length} ${language === 'ms' ? 'Ahli' : 'Members'}`}
          </Badge>
          <Badge variant="outline" className="text-sm" data-testid="badge-page-views">
            <Eye className="h-3 w-3 mr-1" />
            {viewsData?.views?.toLocaleString() || '0'} {language === 'ms' ? 'tontonan' : 'views'}
          </Badge>
          {searchQuery && (
            <Badge variant="outline" className="text-sm">
              {language === 'ms' ? 'Ditapis' : 'Filtered'}: {filteredMembers.length}
            </Badge>
          )}
        </div>

        {!isLoading && members.length > 0 && (
          <Card className="mb-6 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-primary" />
                {language === 'ms' ? 'Jumlah Gaji & Elaun ADUN + Kabinet' : 'Total ADUN + Cabinet Salaries & Allowances'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary" data-testid="text-total-dun-salary">
                {formatCurrency(totalMonthlySalary)}/{language === 'ms' ? 'bulan' : 'month'}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {language === 'ms' 
                  ? `Kos kumulatif untuk ${members.length} ahli DUN (termasuk ${cabinetMembersCount} ahli kabinet)`
                  : `Cumulative cost for ${members.length} DUN members (including ${cabinetMembersCount} cabinet members)`}
              </p>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ms' ? 'Gaji Asas ADUN' : 'ADUN Basic Salary'}</p>
                  <p className="font-semibold">RM 11,130</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ms' ? 'Elaun Kawasan' : 'Constituency'}</p>
                  <p className="font-semibold">RM 6,000-15,000</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ms' ? 'Elaun Duduk' : 'Sitting Allowance'}</p>
                  <p className="font-semibold">RM 450/day</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ms' ? 'Jumlah ADUN Bulanan' : 'Total ADUN Monthly'}</p>
                  <p className="font-semibold">RM 25,000-40,000</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  {language === 'ms' ? 'Elaun Kabinet Negeri (tambahan kepada elaun ADUN)' : 'State Cabinet Allowances (additional to ADUN allowances)'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                  <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-900/20">
                    <p className="text-muted-foreground">{language === 'ms' ? 'Premier' : 'Premier'}</p>
                    <p className="font-semibold text-amber-700 dark:text-amber-400">
                      {cabinetSalaryByRole.premier > 0 ? `+${formatCurrency(cabinetSalaryByRole.premier)}` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-orange-50 dark:bg-orange-900/20">
                    <p className="text-muted-foreground">{language === 'ms' ? 'Timbalan Premier' : 'Deputy Premier'}</p>
                    <p className="font-semibold text-orange-700 dark:text-orange-400">
                      {cabinetSalaryByRole.deputyPremier > 0 ? `+${formatCurrency(cabinetSalaryByRole.deputyPremier)}` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-purple-50 dark:bg-purple-900/20">
                    <p className="text-muted-foreground">{language === 'ms' ? 'Menteri' : 'Minister'}</p>
                    <p className="font-semibold text-purple-700 dark:text-purple-400">
                      {cabinetSalaryByRole.minister > 0 ? `+${formatCurrency(cabinetSalaryByRole.minister)}` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-indigo-50 dark:bg-indigo-900/20">
                    <p className="text-muted-foreground">{language === 'ms' ? 'Timbalan Menteri' : 'Deputy Minister'}</p>
                    <p className="font-semibold text-indigo-700 dark:text-indigo-400">
                      {cabinetSalaryByRole.deputyMinister > 0 ? `+${formatCurrency(cabinetSalaryByRole.deputyMinister)}` : 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 rounded-md bg-sky-50 dark:bg-sky-900/20">
                    <p className="text-muted-foreground">{language === 'ms' ? 'Pembantu Menteri' : 'Assistant Minister'}</p>
                    <p className="font-semibold text-sky-700 dark:text-sky-400">
                      {cabinetSalaryByRole.assistantMinister > 0 ? `+${formatCurrency(cabinetSalaryByRole.assistantMinister)}` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14 border-2 border-border flex-shrink-0">
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
                      <div className="flex flex-wrap gap-1">
                        {member.party && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getPartyColor(member.party)}`}
                            data-testid={`badge-party-${member.id}`}
                          >
                            {member.party}
                          </Badge>
                        )}
                        {member.cabinetRole && (
                          <Badge 
                            variant="secondary" 
                            className={`text-xs ${getCabinetRoleColor(member.cabinetRole)}`}
                            data-testid={`badge-cabinet-${member.id}`}
                          >
                            <Crown className="h-2.5 w-2.5 mr-1" />
                            {member.cabinetRole}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-t border-border space-y-2">
                    {(() => {
                      const dunSalary = member.totalMonthlyAllowance || 40000;
                      const cabinetSalary = member.cabinetTotalSalary || 0;
                      const totalSalary = dunSalary + cabinetSalary;
                      
                      return (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center justify-between text-xs">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <DollarSign className="h-3 w-3" />
                                {language === 'ms' ? 'Jumlah Bulanan' : 'Total Monthly'}
                              </span>
                              <span className="font-semibold text-green-600 dark:text-green-400" data-testid={`text-salary-${member.id}`}>
                                {formatCurrency(totalSalary)}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1 text-xs">
                              <p className="font-semibold mb-2">{language === 'ms' ? 'Pecahan Elaun ADUN:' : 'ADUN Allowance Breakdown:'}</p>
                              <div className="flex justify-between gap-4">
                                <span>{language === 'ms' ? 'Gaji Asas' : 'Basic Salary'}:</span>
                                <span>{formatCurrency(member.baseSalary || 11130)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>{language === 'ms' ? 'Elaun Perkhidmatan' : 'Service Allowance'}:</span>
                                <span>{formatCurrency(member.serviceAllowance || 3870)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>{language === 'ms' ? 'Elaun Kawasan' : 'Constituency Allowance'}:</span>
                                <span>{formatCurrency(member.constituencyAllowance || 10500)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>{language === 'ms' ? 'Elaun Perjalanan' : 'Travel Allowance'}:</span>
                                <span>{formatCurrency(member.travelAllowance || 2000)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>{language === 'ms' ? 'Elaun Hiburan' : 'Entertainment'}:</span>
                                <span>{formatCurrency(member.entertainmentAllowance || 1500)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>{language === 'ms' ? 'Elaun Penginapan' : 'Housing Allowance'}:</span>
                                <span>{formatCurrency(member.housingAllowance || 3000)}</span>
                              </div>
                              <div className="flex justify-between gap-4">
                                <span>{language === 'ms' ? 'Elaun Duduk' : 'Sitting Allowance'}:</span>
                                <span>{formatCurrency(member.sittingAllowance || 450)}/day</span>
                              </div>
                              <div className="flex justify-between gap-4 pt-1 border-t font-medium">
                                <span>{language === 'ms' ? 'Jumlah ADUN' : 'ADUN Total'}:</span>
                                <span>{formatCurrency(dunSalary)}</span>
                              </div>
                              
                              {member.cabinetRole && member.cabinetTotalSalary && (
                                <>
                                  <p className="font-semibold mt-3 mb-2 flex items-center gap-1">
                                    <Crown className="h-3 w-3" />
                                    {language === 'ms' ? 'Elaun Kabinet:' : 'Cabinet Allowance:'}
                                  </p>
                                  {member.cabinetBaseSalary && (
                                    <div className="flex justify-between gap-4">
                                      <span>{language === 'ms' ? 'Gaji Asas Kabinet' : 'Cabinet Basic Salary'}:</span>
                                      <span>{formatCurrency(member.cabinetBaseSalary)}</span>
                                    </div>
                                  )}
                                  {member.cabinetEntertainment && (
                                    <div className="flex justify-between gap-4">
                                      <span>{language === 'ms' ? 'Elaun Hiburan' : 'Entertainment'}:</span>
                                      <span>{formatCurrency(member.cabinetEntertainment)}</span>
                                    </div>
                                  )}
                                  {member.cabinetSpecialAllowance && (
                                    <div className="flex justify-between gap-4">
                                      <span>{language === 'ms' ? 'Elaun Khas' : 'Special Allowance'}:</span>
                                      <span>{formatCurrency(member.cabinetSpecialAllowance)}</span>
                                    </div>
                                  )}
                                  <div className="flex justify-between gap-4 pt-1 border-t font-medium">
                                    <span>{language === 'ms' ? 'Jumlah Kabinet' : 'Cabinet Total'}:</span>
                                    <span>{formatCurrency(member.cabinetTotalSalary)}</span>
                                  </div>
                                </>
                              )}
                              
                              <div className="flex justify-between gap-4 pt-2 border-t-2 font-bold text-green-600 dark:text-green-400">
                                <span>{language === 'ms' ? 'JUMLAH KESELURUHAN' : 'GRAND TOTAL'}:</span>
                                <span>{formatCurrency(totalSalary)}</span>
                              </div>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })()}

                    {member.povertyRate !== null && member.povertyRate !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <AlertTriangle className="h-3 w-3" />
                          {language === 'ms' ? 'Kadar Kemiskinan' : 'Poverty Rate'}
                        </span>
                        <span className={`font-semibold ${getPovertyColor(member.povertyRate)}`} data-testid={`text-poverty-${member.id}`}>
                          {formatPovertyRate(member.povertyRate)}
                        </span>
                      </div>
                    )}

                    {member.householdIncome !== null && member.householdIncome !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Wallet className="h-3 w-3" />
                          {language === 'ms' ? 'Pendapatan Isi Rumah' : 'Household Income'}
                        </span>
                        <span className="font-semibold" data-testid={`text-household-income-${member.id}`}>
                          {formatCurrency(member.householdIncome)}
                        </span>
                      </div>
                    )}

                    {member.giniCoefficient !== null && member.giniCoefficient !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <BarChart3 className="h-3 w-3" />
                          {language === 'ms' ? 'Pekali Gini' : 'Gini Coefficient'}
                        </span>
                        <span className="font-semibold" data-testid={`text-gini-${member.id}`}>
                          {(member.giniCoefficient / 1000).toFixed(3)}
                        </span>
                      </div>
                    )}

                    {member.unemploymentRate !== null && member.unemploymentRate !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Briefcase className="h-3 w-3" />
                          {language === 'ms' ? 'Kadar Pengangguran' : 'Unemployment Rate'}
                        </span>
                        <span className="font-semibold" data-testid={`text-unemployment-${member.id}`}>
                          {(member.unemploymentRate / 10).toFixed(1)}%
                        </span>
                      </div>
                    )}

                    {member.population !== null && member.population !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <Users className="h-3 w-3" />
                          {language === 'ms' ? 'Populasi' : 'Population'}
                        </span>
                        <span className="font-semibold" data-testid={`text-population-${member.id}`}>
                          {member.population.toLocaleString()}
                        </span>
                      </div>
                    )}
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
