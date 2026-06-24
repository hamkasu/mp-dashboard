import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, MapPin, RefreshCw, Search, Building2, DollarSign, TrendingDown, Home, AlertTriangle, Briefcase, BarChart3, Wallet, Eye, ArrowUpDown, Crown, Award, FileText, Download, ExternalLink, Info, BookOpen } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/i18n/LanguageContext";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { DunMember } from "@shared/schema";

const hansardAvailabilityPdf = "/documents/sarawak-hansard-availability.pdf";
const remunerationPdf = "/documents/sarawak-adun-remuneration.pdf";
const cabinetRemunerationPdf = "/documents/sarawak-cabinet-remuneration.pdf";

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
  if (lowerRole.includes('minister') && !lowerRole.includes('deputy')) {
    return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
  }
  if (lowerRole.includes('deputy minister')) {
    return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
  }
  return "bg-muted text-muted-foreground";
}


type SortOption = 'code' | 'population-asc' | 'population-desc';
type CabinetFilter = 'all' | 'cabinet' | 'premier' | 'deputy-premier' | 'minister' | 'deputy-minister' | 'backbencher';

export default function DunSarawak() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>('code');
  const [cabinetFilter, setCabinetFilter] = useState<CabinetFilter>('all');
  const [showHansardDialog, setShowHansardDialog] = useState(false);
  const [showRemunerationDialog, setShowRemunerationDialog] = useState(false);

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
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        member.name.toLowerCase().includes(query) ||
        member.constituencyName.toLowerCase().includes(query) ||
        member.constituencyCode.toLowerCase().includes(query) ||
        (member.party && member.party.toLowerCase().includes(query))
      );
      if (!matchesSearch) return false;
    }
    
    // Cabinet position filter
    if (cabinetFilter !== 'all') {
      const role = member.cabinetRole?.toLowerCase() || '';
      
      switch (cabinetFilter) {
        case 'cabinet':
          if (!member.cabinetRole) return false;
          break;
        case 'premier':
          if (!(role.includes('premier') || role.includes('chief minister')) || role.includes('deputy')) return false;
          break;
        case 'deputy-premier':
          if (!(role.includes('deputy premier') || role.includes('deputy chief'))) return false;
          break;
        case 'minister':
          if (!(role.includes('minister') && !role.includes('deputy'))) return false;
          break;
        case 'deputy-minister':
          if (!role.includes('deputy minister')) return false;
          break;
        case 'backbencher':
          if (member.cabinetRole) return false;
          break;
      }
    }
    
    return true;
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
      const baseSalary = member.baseSalary || 25000;
      // If cabinet_role exists, add cabinet_total_salary (default to 0 if null)
      const cabinetTotalSalary = member.cabinetRole ? (member.cabinetTotalSalary || 0) : 0;
      total += baseSalary + cabinetTotalSalary;
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
    };
  };
  
  const cabinetSalaryByRole = calculateCabinetSalaryByRole();

  const totalMonthlySalary = calculateTotalMonthlySalary();
  const cabinetMembersCount = members.filter(m => m.cabinetRole).length;
  
  // Calculate average ADUN Basic Salary from database
  const calculateAverageBaseSalary = () => {
    const membersWithSalary = members.filter(m => m.baseSalary && m.baseSalary > 0);
    if (membersWithSalary.length === 0) return 25000; // Default fallback
    const total = membersWithSalary.reduce((sum, m) => sum + (m.baseSalary || 0), 0);
    return Math.round(total / membersWithSalary.length);
  };
  
  const averageBaseSalary = calculateAverageBaseSalary();

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="Sarawak DUN (State Legislative Assembly)"
        description="View Sarawak State Legislative Assembly (Dewan Undangan Negeri) members, their roles, constituencies, and remuneration information."
        keywords="Sarawak DUN, Sarawak State Assembly, ADUN Sarawak, Sarawak legislators, state government"
        url="https://myparliament.calmic.com.my/dun-sarawak"
      />
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

        {/* Hansard Availability Notice */}
        <div className="mb-6 p-4 rounded-lg border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20" data-testid="notice-hansard-availability">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                {language === 'ms'
                  ? 'Nota: Ketersediaan Hansard Terhad'
                  : 'Note: Limited Hansard Availability'}
              </h4>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                {language === 'ms'
                  ? 'Hansard ADUN Sarawak tidak mudah diakses kerana dokumen hansard hanya dipaparkan selama 30 hari sebelum dialih keluar dari laman web DUN. Lihat bahagian "Sumber & Dokumen" di bawah untuk maklumat lanjut.'
                  : 'Sarawak ADUN hansard are not easily available as the hansard documents are only shown for 30 days before being removed from the DUN page. See the "Resources & Documents" section below for more information.'}
              </p>
            </div>
          </div>
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
          <Select value={cabinetFilter} onValueChange={(value: CabinetFilter) => setCabinetFilter(value)}>
            <SelectTrigger className="w-full sm:w-[200px]" data-testid="select-cabinet-filter">
              <Crown className="h-4 w-4 mr-2" />
              <SelectValue placeholder={language === 'ms' ? 'Tapis Kabinet...' : 'Cabinet Filter...'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                {language === 'ms' ? 'Semua Ahli' : 'All Members'}
              </SelectItem>
              <SelectItem value="cabinet">
                {language === 'ms' ? 'Ahli Kabinet' : 'Cabinet Members'}
              </SelectItem>
              <SelectItem value="premier">
                {language === 'ms' ? 'Premier' : 'Premier'}
              </SelectItem>
              <SelectItem value="deputy-premier">
                {language === 'ms' ? 'Timbalan Premier' : 'Deputy Premier'}
              </SelectItem>
              <SelectItem value="minister">
                {language === 'ms' ? 'Menteri' : 'Minister'}
              </SelectItem>
              <SelectItem value="deputy-minister">
                {language === 'ms' ? 'Timbalan Menteri' : 'Deputy Minister'}
              </SelectItem>
              <SelectItem value="backbencher">
                {language === 'ms' ? 'Ahli Biasa' : 'Backbencher'}
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
          {(searchQuery || cabinetFilter !== 'all') && (
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
              
              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t">
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ms' ? 'Gaji Asas ADUN' : 'ADUN Basic Salary'}</p>
                  <p className="font-semibold">{formatCurrency(averageBaseSalary)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{language === 'ms' ? 'Elaun Duduk' : 'Sitting Allowance'}</p>
                  <p className="font-semibold">RM 450/{language === 'ms' ? 'hari' : 'day'}</p>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1">
                  <Crown className="h-3 w-3" />
                  {language === 'ms' ? 'Elaun Kabinet Negeri (tambahan kepada elaun ADUN)' : 'State Cabinet Allowances (additional to ADUN allowances)'}
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
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
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Resources & Documents Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {language === 'ms' ? 'Sumber & Dokumen' : 'Resources & Documents'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {language === 'ms' 
                ? 'Dokumen rujukan berkaitan Dewan Undangan Negeri Sarawak'
                : 'Reference documents related to the Sarawak State Legislative Assembly'}
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Hansard Availability Document */}
              <div className="p-4 rounded-md border border-border bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-primary/10 flex-shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1" data-testid="text-doc-hansard-title">
                      {language === 'ms' 
                        ? 'Ketersediaan Hansard DUN Sarawak' 
                        : 'Availability of Sarawak DUN Hansard'}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {language === 'ms'
                        ? 'Maklumat tentang akses kepada transkrip rasmi persidangan DUN Sarawak, termasuk had dan kaedah capaian.'
                        : 'Information about accessing official transcripts of DUN Sarawak proceedings, including limitations and access methods.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => setShowHansardDialog(true)}
                        data-testid="button-read-hansard-doc"
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        {language === 'ms' ? 'Baca' : 'Read'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        data-testid="button-view-hansard-doc"
                      >
                        <a href={hansardAvailabilityPdf} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {language === 'ms' ? 'PDF' : 'PDF'}
                        </a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        data-testid="button-download-hansard-doc"
                      >
                        <a href={hansardAvailabilityPdf} download="Sarawak_DUN_Hansard_Availability.pdf">
                          <Download className="h-3 w-3 mr-1" />
                          {language === 'ms' ? 'Muat Turun' : 'Download'}
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Remuneration Document */}
              <div className="p-4 rounded-md border border-border bg-muted/30">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-md bg-green-500/10 flex-shrink-0">
                    <DollarSign className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1" data-testid="text-doc-remuneration-title">
                      {language === 'ms' 
                        ? 'Imbuhan & Elaun ADUN' 
                        : 'ADUN Remuneration & Allowances'}
                    </h4>
                    <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                      {language === 'ms'
                        ? 'Butiran lengkap tentang gaji, elaun, dan faedah untuk ahli Dewan Undangan Negeri Sarawak.'
                        : 'Complete details on salaries, allowances, and benefits for members of the Sarawak State Legislative Assembly.'}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => setShowRemunerationDialog(true)}
                        data-testid="button-read-remuneration-doc"
                      >
                        <BookOpen className="h-3 w-3 mr-1" />
                        {language === 'ms' ? 'Baca' : 'Read'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        data-testid="button-view-remuneration-doc"
                      >
                        <a href={remunerationPdf} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3 mr-1" />
                          {language === 'ms' ? 'PDF' : 'PDF'}
                        </a>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        asChild
                        data-testid="button-download-remuneration-doc"
                      >
                        <a href={remunerationPdf} download="Sarawak_ADUN_Remuneration_Allowances.pdf">
                          <Download className="h-3 w-3 mr-1" />
                          {language === 'ms' ? 'Muat Turun' : 'Download'}
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                      const baseSalary = member.baseSalary || 25000;
                      // If cabinet_role exists, add cabinet_total_salary (default to 0 if null)
                      const cabinetTotalSalary = member.cabinetRole ? (member.cabinetTotalSalary || 0) : 0;
                      const totalSalary = baseSalary + cabinetTotalSalary;
                      
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
                              <p className="font-semibold mb-2">{language === 'ms' ? 'Pecahan Gaji:' : 'Salary Breakdown:'}</p>
                              <div className="flex justify-between gap-4">
                                <span>{language === 'ms' ? 'Gaji Asas ADUN' : 'ADUN Basic Salary'}:</span>
                                <span>{formatCurrency(baseSalary)}</span>
                              </div>
                              
                              {member.cabinetRole && cabinetTotalSalary > 0 && (
                                <>
                                  <div className="flex justify-between gap-4 mt-2">
                                    <span className="flex items-center gap-1">
                                      <Crown className="h-3 w-3" />
                                      {language === 'ms' ? 'Elaun Kabinet' : 'Cabinet Allowance'}:
                                    </span>
                                    <span>{formatCurrency(cabinetTotalSalary)}</span>
                                  </div>
                                  <p className="text-muted-foreground text-[10px] italic">
                                    ({member.cabinetRole})
                                  </p>
                                </>
                              )}
                              
                              <div className="flex justify-between gap-4 pt-2 border-t font-bold text-green-600 dark:text-green-400">
                                <span>{language === 'ms' ? 'JUMLAH BULANAN' : 'TOTAL MONTHLY'}:</span>
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

      {/* Hansard Availability Dialog */}
      <Dialog open={showHansardDialog} onOpenChange={setShowHansardDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh]" data-testid="dialog-hansard-availability">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-primary" />
              {language === 'ms' 
                ? 'Ketersediaan Hansard DUN Sarawak' 
                : 'Availability of Sarawak DUN Hansard'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ms' 
                ? 'Dikemas kini setakat Disember 2025'
                : 'As of December 2025'}
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6 text-sm">
              <p className="text-muted-foreground leading-relaxed">
                {language === 'ms'
                  ? 'Hansard Dewan Undangan Negeri (DUN) Sarawak (transkrip rasmi prosiding perhimpunan) tidak tersedia kepada orang ramai dalam format yang komprehensif dan mesra pengguna. Berbeza dengan Hansard Parlimen Malaysia persekutuan (boleh dicari sepenuhnya dalam talian sejak 1959), sistem Sarawak adalah terhad, terikat masa, dan memerlukan usaha untuk diakses.'
                  : 'Sarawak Dewan Undangan Negeri (DUN) Hansard (official transcripts of assembly proceedings) is not readily available to the public in a comprehensive, user-friendly format. Unlike federal Malaysian Parliament Hansard (fully searchable online since 1959), Sarawak\'s system is limited, time-bound, and requires effort to access.'}
              </p>

              <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  {language === 'ms' ? 'Had Utama' : 'Key Limitations'}
                </h3>
                <ul className="space-y-3">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <div>
                      <span className="font-medium">{language === 'ms' ? 'Akses Terhad Masa' : 'Time-Restricted Access'}:</span>
                      <span className="text-muted-foreground ml-1">
                        {language === 'ms'
                          ? 'PDF Hansard yang belum disunting dipaparkan di laman web DUN rasmi (duns.sarawak.gov.my) hanya selama 1 bulan selepas tarikh persidangan. Selepas itu, ia dialih keluar daripada paparan awam.'
                          : 'Unedited Hansard PDFs are posted on the official DUN website (duns.sarawak.gov.my) only for 1 month after the sitting date. After that, they are removed from public view.'}
                      </span>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <div>
                      <span className="font-medium">{language === 'ms' ? 'Tiada Arkib Awam atau Portal Carian' : 'No Public Archive or Search Portal'}:</span>
                      <span className="text-muted-foreground ml-1">
                        {language === 'ms'
                          ? 'Tiada arkib dalam talian percuma dan terbuka untuk Hansard sejarah atau yang disunting. Sistem "e-Hansard" wujud (ehansard.sarawak.gov.my), tetapi memerlukan nama pengguna dan kata laluan.'
                          : 'There is no free, open online archive for historical or edited Hansard. An "e-Hansard" system exists (ehansard.sarawak.gov.my), but it requires a username and password (likely for members, staff, or registered users only).'}
                      </span>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <div>
                      <span className="font-medium">{language === 'ms' ? 'Tiada Pendigitalan Proaktif' : 'No Proactive Digitization'}:</span>
                      <span className="text-muted-foreground ml-1">
                        {language === 'ms'
                          ? 'Sesi lama (pra-2010) sering tidak boleh diakses dalam talian; ia mungkin wujud dalam bentuk fizikal di perpustakaan DUN di Kuching tetapi tidak didigitalkan untuk akses jarak jauh.'
                          : 'Older sessions (pre-2010s) are often inaccessible online; they may exist in physical form at the DUN library in Kuching but aren\'t digitized for remote access.'}
                      </span>
                    </div>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  {language === 'ms' ? 'Cara Akses (Pilihan Terhad)' : 'How to Access (Limited Options)'}
                </h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">{language === 'ms' ? 'Kaedah' : 'Method'}</th>
                        <th className="text-left p-2 font-medium">{language === 'ms' ? 'Butiran' : 'Details'}</th>
                        <th className="text-left p-2 font-medium">{language === 'ms' ? 'Kemudahan' : 'Ease'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr>
                        <td className="p-2 font-medium">{language === 'ms' ? 'Laman Web Rasmi' : 'Official Website'}</td>
                        <td className="p-2 text-muted-foreground">
                          {language === 'ms' 
                            ? 'Muat turun PDF dari duns.sarawak.gov.my di bawah bahagian "Hansard"' 
                            : 'Download PDFs from duns.sarawak.gov.my under "Hansard" section'}
                        </td>
                        <td className="p-2">
                          <Badge variant="secondary" className="text-xs">
                            {language === 'ms' ? 'Sederhana (jika dalam 1 bulan)' : 'Moderate (if within 1 month)'}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">{language === 'ms' ? 'Portal e-Hansard' : 'e-Hansard Portal'}</td>
                        <td className="p-2 text-muted-foreground">ehansard.sarawak.gov.my</td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {language === 'ms' ? 'Rendah (perlu log masuk)' : 'Low (login required)'}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">{language === 'ms' ? 'Fizikal/Secara Langsung' : 'Physical/In-Person'}</td>
                        <td className="p-2 text-muted-foreground">
                          {language === 'ms' 
                            ? 'Lawati Bangunan DUN (Petra Jaya, Kuching) atau Perpustakaan Negeri' 
                            : 'Visit DUN Building (Petra Jaya, Kuching) or State Library'}
                        </td>
                        <td className="p-2">
                          <Badge variant="outline" className="text-xs">
                            {language === 'ms' ? 'Rendah' : 'Low'}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">{language === 'ms' ? 'FOI / OSA' : 'FOI (Freedom of Information)'}</td>
                        <td className="p-2 text-muted-foreground">
                          {language === 'ms' 
                            ? 'Failkan di bawah pengecualian Akta Rahsia Rasmi melalui Kerani DUN' 
                            : 'File under Official Secrets Act exemptions via DUN Clerk'}
                        </td>
                        <td className="p-2">
                          <Badge variant="destructive" className="text-xs">
                            {language === 'ms' ? 'Sangat Rendah' : 'Very Low'}
                          </Badge>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 font-medium">{language === 'ms' ? 'Sumber Media/Sekunder' : 'Media/Secondary Sources'}</td>
                        <td className="p-2 text-muted-foreground">
                          {language === 'ms' 
                            ? 'Petikan dalam akhbar (Sarawak Tribune, DayakDaily) atau blog' 
                            : 'Excerpts in newspapers (Sarawak Tribune, DayakDaily) or blogs'}
                        </td>
                        <td className="p-2">
                          <Badge variant="secondary" className="text-xs">
                            {language === 'ms' ? 'Sederhana' : 'Moderate'}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  {language === 'ms' ? 'Contoh Terkini (2025)' : 'Recent Examples (2025)'}
                </h3>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary">-</span>
                    <span>
                      <strong>{language === 'ms' ? 'Persidangan Mei 2025' : 'May 2025 Sitting'}:</strong>{' '}
                      {language === 'ms'
                        ? 'Bahagian Hansard yang tidak diterbitkan dirujuk dalam media (contoh: kenyataan yang dipadamkan oleh ADUN Pending Violet Yong), tetapi teks penuh tidak awam.'
                        : 'Parts of unpublished Hansard were referenced in media (e.g., expunged remarks by Pending ADUN Violet Yong), but full text isn\'t public.'}
                    </span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">-</span>
                    <span>
                      <strong>{language === 'ms' ? 'November 2025' : 'November 2025'}:</strong>{' '}
                      {language === 'ms'
                        ? 'PDF yang belum disunting tersedia sehingga ~Disember 2025; selepas itu, hilang melainkan diminta.'
                        : 'Unedited PDFs available until ~December 2025; after that, gone unless requested.'}
                    </span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-md bg-muted/50 border">
                <h3 className="font-semibold text-base mb-2">
                  {language === 'ms' ? 'Mengapa Begitu Tidak Telus?' : 'Why So Opaque?'}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {language === 'ms'
                    ? 'Ini selaras dengan kritikan yang lebih luas terhadap ketelusan Sarawak. Kumpulan sivil seperti ROSE menyokong pengarkiban dalam talian sepenuhnya, serupa dengan standard persekutuan, tetapi tiada perubahan setakat ini. Jika anda mencari persidangan tertentu, menghantar e-mel kepada Unit Penerbitan atau memfailkan FOI adalah pilihan terbaik anda—kejayaan berbeza-beza.'
                    : 'This aligns with broader criticisms of Sarawak\'s transparency (e.g., opposition calls for open-data reforms in 2025 DUN sessions). Civil groups like ROSE advocate for full online archiving, similar to federal standards, but no changes as of now. If you\'re seeking a specific sitting (e.g., on allowances), emailing the Publication Unit or filing an FOI is your best bet—success varies.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                >
                  <a href={hansardAvailabilityPdf} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {language === 'ms' ? 'Lihat PDF Asal' : 'View Original PDF'}
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                >
                  <a href={hansardAvailabilityPdf} download="Sarawak_DUN_Hansard_Availability.pdf">
                    <Download className="h-3 w-3 mr-1" />
                    {language === 'ms' ? 'Muat Turun PDF' : 'Download PDF'}
                  </a>
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ADUN Remuneration Dialog */}
      <Dialog open={showRemunerationDialog} onOpenChange={setShowRemunerationDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <DollarSign className="h-5 w-5 text-green-600" />
              {language === 'ms' 
                ? 'Imbuhan Kabinet Sarawak: Jumlah Gaji dan Elaun' 
                : 'Sarawak Cabinet Remuneration: Total Salary and Allowances'}
            </DialogTitle>
            <DialogDescription>
              {language === 'ms' 
                ? 'Setakat Disember 2025' 
                : 'As of December 2025'}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-120px)] pr-4">
            <div className="space-y-6 text-sm">
              <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                <div className="flex gap-2">
                  <Info className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 dark:text-amber-200 leading-relaxed">
                    {language === 'ms'
                      ? 'Angka jumlah tepat untuk Premier, Timbalan Premier, Menteri Kabinet, dan Timbalan Menteri Sarawak (termasuk semua elaun) tidak diperincikan secara terperinci kepada umum, kerana kerajaan negeri mendedahkan gaji asas dengan lebih telus sambil menganggap faedah tertentu (contoh: perumahan, perjalanan, hiburan) sebagai sulit atas sebab keselamatan dan operasi.'
                      : 'Exact total figures for Sarawak\'s Premier, Deputy Premiers, Cabinet Ministers, and Deputy Ministers (including all allowances) are not publicly itemized in detail, as the state government discloses basic salaries more transparently while treating certain perks (e.g., housing, travel, entertainment) as confidential for security and operational reasons.'}
                  </p>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  {language === 'ms' ? 'Pecahan Jumlah Imbuhan Bulanan' : 'Monthly Total Remuneration Breakdown'}
                </h3>
                <div className="border rounded-md overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">{language === 'ms' ? 'Jawatan' : 'Position'}</th>
                        <th className="text-left p-2 font-medium">{language === 'ms' ? 'Gaji Asas (RM)' : 'Basic Salary (RM)'}</th>
                        <th className="text-left p-2 font-medium">{language === 'ms' ? 'Anggaran Jumlah Bulanan (RM)' : 'Est. Total Monthly (RM)'}</th>
                        <th className="text-left p-2 font-medium">{language === 'ms' ? 'Setara Tahunan (RM)' : 'Annual Equivalent (RM)'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      <tr className="bg-amber-50/50 dark:bg-amber-900/10">
                        <td className="p-2">
                          <div className="font-medium">{language === 'ms' ? 'Premier' : 'Premier'}</div>
                          <div className="text-muted-foreground text-xs">{language === 'ms' ? '(Datuk Patinggi Tan Sri Abang Johari Tun Openg)' : '(Datuk Patinggi Tan Sri Abang Johari Tun Openg)'}</div>
                        </td>
                        <td className="p-2 font-semibold">30,000</td>
                        <td className="p-2 font-semibold text-amber-700 dark:text-amber-400">55,000 - 65,000</td>
                        <td className="p-2">660,000 - 780,000</td>
                      </tr>
                      <tr className="bg-orange-50/50 dark:bg-orange-900/10">
                        <td className="p-2">
                          <div className="font-medium">{language === 'ms' ? 'Timbalan Premier' : 'Deputy Premiers'}</div>
                          <div className="text-muted-foreground text-xs">(2 {language === 'ms' ? 'jawatan' : 'positions'})</div>
                        </td>
                        <td className="p-2 font-semibold">25,000 - 28,000</td>
                        <td className="p-2 font-semibold text-orange-700 dark:text-orange-400">45,000 - 55,000</td>
                        <td className="p-2">540,000 - 660,000</td>
                      </tr>
                      <tr className="bg-purple-50/50 dark:bg-purple-900/10">
                        <td className="p-2">
                          <div className="font-medium">{language === 'ms' ? 'Menteri Kabinet' : 'Cabinet Ministers'}</div>
                          <div className="text-muted-foreground text-xs">(14 {language === 'ms' ? 'menteri penuh' : 'full ministers'})</div>
                        </td>
                        <td className="p-2 font-semibold">20,000 - 25,000</td>
                        <td className="p-2 font-semibold text-purple-700 dark:text-purple-400">35,000 - 50,000</td>
                        <td className="p-2">420,000 - 600,000</td>
                      </tr>
                      <tr className="bg-indigo-50/50 dark:bg-indigo-900/10">
                        <td className="p-2">
                          <div className="font-medium">{language === 'ms' ? 'Timbalan Menteri' : 'Deputy Ministers'}</div>
                          <div className="text-muted-foreground text-xs">({language === 'ms' ? 'dahulunya Pembantu Menteri' : 'formerly Assistant Ministers'})</div>
                        </td>
                        <td className="p-2 font-semibold">15,000 - 18,000</td>
                        <td className="p-2 font-semibold text-indigo-700 dark:text-indigo-400">25,000 - 35,000</td>
                        <td className="p-2">300,000 - 420,000</td>
                      </tr>
                      <tr>
                        <td className="p-2">
                          <div className="font-medium">{language === 'ms' ? 'ADUN Biasa' : 'Ordinary ADUN'}</div>
                          <div className="text-muted-foreground text-xs">({language === 'ms' ? 'bukan menteri' : 'non-ministers'})</div>
                        </td>
                        <td className="p-2 font-semibold">15,000</td>
                        <td className="p-2 font-semibold">20,000 - 25,000</td>
                        <td className="p-2">240,000 - 300,000</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {language === 'ms'
                    ? '* Elaun utama termasuk: Elaun Duduk/Kawasan, Elaun Hiburan/Perjalanan, Elaun Perubatan/Perumahan, dan Lain-lain (sokongan staf)'
                    : '* Key allowances include: Sitting/Constituency, Entertainment/Travel, Medical/Housing, and Other (staff support)'}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-base mb-3">
                  {language === 'ms' ? 'Penjelasan Utama dan Faedah Tambahan' : 'Key Explanations and Additional Perks'}
                </h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">1.</span>
                    <div>
                      <strong className="text-foreground">{language === 'ms' ? 'Cara Anggaran Jumlah' : 'How Totals Are Estimated'}:</strong>{' '}
                      {language === 'ms'
                        ? 'Gaji asas dari Ordinan Bab 68 (contoh: Premier RM30,000; Timbalan ~RM25,000+; Menteri ~RM20,000+; Timbalan Menteri ~RM15,000+ sebagai lanjutan gaji ADUN). Elaun diambil dari analog persekutuan dan pendedahan negeri.'
                        : 'Basic salaries from Ordinance Chapter 68 (e.g., Premier RM30,000; Deputies ~RM25,000+; Ministers ~RM20,000+; Deputy Ministers ~RM15,000+ as extension of ADUN pay). Allowances drawn from federal analogs and state disclosures.'}
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">2.</span>
                    <div>
                      <strong className="text-foreground">{language === 'ms' ? 'Faedah Bukan Tunai' : 'Non-Cash Benefits'} ({language === 'ms' ? 'tidak dalam jumlah tetapi bernilai tinggi' : 'not in totals but significant value'}):</strong>
                      <ul className="mt-1 ml-4 space-y-1 list-disc">
                        <li>{language === 'ms' ? 'Kediaman rasmi/kuarters (atau elaun perumahan)' : 'Official residence/quarters (or housing allowance)'}</li>
                        <li>{language === 'ms' ? 'Kenderaan + bahan api/pemandu (~RM50,000-RM100,000 nilai tahunan)' : 'Vehicles + fuel/drivers (~RM50,000-RM100,000 annual value)'}</li>
                        <li>{language === 'ms' ? 'Perlindungan perubatan untuk keluarga + staf' : 'Medical coverage for family + staff'}</li>
                        <li>{language === 'ms' ? 'Ganjaran akhir penggal (contoh: 3-6 bulan gaji) + pencen selepas 5 tahun perkhidmatan' : 'End-of-term gratuity (e.g., 3-6 months\' salary) + contributory pension after 5 years\' service'}</li>
                      </ul>
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">3.</span>
                    <div>
                      <strong className="text-foreground">{language === 'ms' ? 'Tiada Perubahan Terkini' : 'No Recent Changes'}:</strong>{' '}
                      {language === 'ms'
                        ? 'Bajet 2026 memberi tumpuan kepada penjawat awam (kenaikan 7%, peruntukan RM56M) dan pemimpin komuniti (+RM400/bulan dari 2026). Hasil minyak/gas Sarawak mengekalkan gaji yang kompetitif, tetapi pengkritik menyatakan ketidaktelusan.'
                        : '2026 Budget focused on civil servants (7% raise, RM56M allocation) and community leaders (+RM400/month from 2026). Sarawak\'s oil/gas revenues keep pay competitive, but critics note opacity.'}
                    </div>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary font-bold">4.</span>
                    <div>
                      <strong className="text-foreground">{language === 'ms' ? 'Perbandingan' : 'Comparison'}:</strong>{' '}
                      {language === 'ms'
                        ? 'Pemimpin Sarawak memperoleh lebih daripada rakan sejawat persekutuan (PM asas RM22,827; menteri persekutuan RM14,907, selepas potongan 20%). Jumlah untuk Premier Sarawak menyaingi menteri Singapura (~SGD 55,000/bulan asas, tetapi dengan bonus).'
                        : 'Sarawak leaders earn more than federal counterparts (PM basic RM22,827; federal ministers RM14,907, post-20% cut). Total for Sarawak Premier rivals Singapore ministers (~SGD 55,000/month basic, but with bonuses).'}
                    </div>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-md bg-muted/50 border">
                <h3 className="font-semibold text-base mb-2">
                  {language === 'ms' ? 'Sumber Undang-undang' : 'Legal Source'}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {language === 'ms'
                    ? 'Imbuhan ditadbir oleh Ordinan Ahli Pentadbiran dan Ahli Dewan Undangan Negeri (Imbuhan, Pencen dan Ganjaran) 2013 (Bab 68), yang menggariskan gaji asas dan mewajibkan elaun/faedah tambahan tetapi tidak menyatakan butiran tambahan yang tepat. Untuk pecahan tepat, PDF Ordinan penuh (melalui Sarawak LawNet) menyenaraikan struktur tetapi bukan kemas kini 2025.'
                    : 'Remuneration is governed by the Members of the Administration and Members of Dewan Undangan Negeri (Remuneration, Pensions and Gratuities) Ordinance 2013 (Chapter 68), which outlines basic salaries and mandates additional allowances/benefits but doesn\'t specify exact add-ons. For precise breakdowns, the full Ordinance PDF (via Sarawak LawNet) lists structures but not 2025 updates.'}
                </p>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                >
                  <a href={cabinetRemunerationPdf} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3 w-3 mr-1" />
                    {language === 'ms' ? 'Lihat PDF Asal' : 'View Original PDF'}
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  asChild
                >
                  <a href={cabinetRemunerationPdf} download="Sarawak_Cabinet_Remuneration.pdf">
                    <Download className="h-3 w-3 mr-1" />
                    {language === 'ms' ? 'Muat Turun PDF' : 'Download PDF'}
                  </a>
                </Button>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
