/**
 * Copyright by Calmic Sdn Bhd
 * MA63 Dashboard - Malaysia Agreement 1963 Implementation Tracker
 * Focused on Sabah & Sarawak rights and autonomy progress
 */

import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import malaysiaAgreementPdf from "@/assets/malaysia-agreement-1963.pdf";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";
import { useLanguage } from "@/i18n/LanguageContext";
import { apiRequest } from "@/lib/queryClient";
import {
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  FileText,
  DollarSign,
  MapPin,
  Users,
  Landmark,
  Shield,
  Scale,
  Info,
  Calendar,
  Target,
  AlertTriangle,
  ChevronRight,
  ExternalLink,
  Download,
  Eye,
  BookOpen
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

// ============================================
// STATIC DATA - MA63 Implementation Tracker
// ============================================

const ma63Data = {
  summary: {
    totalIssues: 29,
    resolved: 13,
    resolvedMadani: 9, // Resolved under current Madani government
    inProgress: 14,
    pending: 2,
    overallProgress: 45,
  },

  categories: [
    {
      id: "territorial",
      name: { en: "Territorial & Continental Shelf", ms: "Wilayah & Pelantar Benua" },
      icon: "MapPin",
      resolved: 1,
      inProgress: 3,
      pending: 1,
      total: 5,
      color: "#0033A0", // Malaysia Blue
      examples: {
        resolved: ["State boundaries clarification"],
        inProgress: ["Continental shelf rights", "Petroleum jurisdiction", "Territorial sea limits"],
        pending: ["Maritime zone disputes"]
      }
    },
    {
      id: "fiscal",
      name: { en: "Fiscal & Revenue Sharing", ms: "Fiskal & Perkongsian Hasil" },
      icon: "DollarSign",
      resolved: 3,
      inProgress: 4,
      pending: 0,
      total: 7,
      color: "#FFD100", // Malaysia Yellow
      examples: {
        resolved: ["Special grants increase", "SST revenue sharing", "Tourism tax allocation"],
        inProgress: ["40% oil/gas revenue (Sabah)", "Sales tax expansion", "Federal grants review", "Petroleum royalty structure"],
        pending: []
      }
    },
    {
      id: "autonomy",
      name: { en: "Autonomy & Devolution", ms: "Autonomi & Devolusi" },
      icon: "Shield",
      resolved: 4,
      inProgress: 3,
      pending: 0,
      total: 7,
      color: "#C8102E", // Malaysia Red
      examples: {
        resolved: ["Education policy autonomy (partial)", "Health administration", "Sabah/Sarawak Day holiday", "Native court jurisdiction"],
        inProgress: ["Immigration control enhancement", "Land administration", "Wildlife protection"],
        pending: []
      }
    },
    {
      id: "parliamentary",
      name: { en: "Parliamentary Representation", ms: "Perwakilan Parlimen" },
      icon: "Landmark",
      resolved: 2,
      inProgress: 2,
      pending: 1,
      total: 5,
      color: "#00A86B", // Green
      examples: {
        resolved: ["Minimum 1/3 seats recognition", "Sarawak GPS ministerial positions"],
        inProgress: ["Seat rebalancing formula", "Constitutional amendment process"],
        pending: ["Equal partner status formalization"]
      }
    },
    {
      id: "immigration",
      name: { en: "Immigration Control", ms: "Kawalan Imigresen" },
      icon: "Users",
      resolved: 2,
      inProgress: 1,
      pending: 0,
      total: 3,
      color: "#6B21A8", // Purple
      examples: {
        resolved: ["Entry permit system maintained", "Work permit authority"],
        inProgress: ["Enhanced border control powers"],
        pending: []
      }
    },
    {
      id: "others",
      name: { en: "Others", ms: "Lain-lain" },
      icon: "FileText",
      resolved: 1,
      inProgress: 1,
      pending: 0,
      total: 2,
      color: "#64748B", // Slate
      examples: {
        resolved: ["MA63 Technical Committee establishment"],
        inProgress: ["Native customary rights codification"],
        pending: []
      }
    }
  ],

  timeline: [
    {
      year: 2018,
      month: "May",
      event: {
        en: "Pakatan Harapan government pledges to review MA63 implementation",
        ms: "Kerajaan Pakatan Harapan berjanji untuk mengkaji semula pelaksanaan MA63"
      },
      type: "milestone"
    },
    {
      year: 2019,
      month: "April",
      event: {
        en: "MA63 Special Cabinet Committee formed",
        ms: "Jawatankuasa Khas Kabinet MA63 ditubuhkan"
      },
      type: "milestone"
    },
    {
      year: 2019,
      month: "December",
      event: {
        en: "Constitutional amendment (Art. 1(2)) passed - recognizes Sabah & Sarawak as equal partners",
        ms: "Pindaan Perlembagaan (Per. 1(2)) diluluskan - mengiktiraf Sabah & Sarawak sebagai rakan setara"
      },
      type: "resolved"
    },
    {
      year: 2021,
      month: "February",
      event: {
        en: "Sarawak achieves 5.45% SST revenue share",
        ms: "Sarawak mencapai bahagian hasil SST 5.45%"
      },
      type: "resolved"
    },
    {
      year: 2022,
      month: "November",
      event: {
        en: "Unity Government (Madani) formed with strong Sabah/Sarawak representation",
        ms: "Kerajaan Perpaduan (Madani) dibentuk dengan perwakilan kuat Sabah/Sarawak"
      },
      type: "milestone"
    },
    {
      year: 2023,
      month: "July",
      event: {
        en: "Sabah, Sarawak granted public holiday for Malaysia Day (Sept 16)",
        ms: "Sabah, Sarawak diberikan cuti umum Hari Malaysia (16 Sept)"
      },
      type: "resolved"
    },
    {
      year: 2024,
      month: "March",
      event: {
        en: "Petroleum Development Act review announced",
        ms: "Semakan Akta Pembangunan Petroleum diumumkan"
      },
      type: "inProgress"
    },
    {
      year: 2024,
      month: "September",
      event: {
        en: "Special grants to Sabah & Sarawak increased to RM300M each",
        ms: "Pemberian khas kepada Sabah & Sarawak ditingkatkan ke RM300J setiap satu"
      },
      type: "resolved"
    },
    {
      year: 2025,
      month: "March",
      event: {
        en: "MA63 Technical Committee reports 13 of 29 issues resolved",
        ms: "Jawatankuasa Teknikal MA63 melaporkan 13 daripada 29 isu diselesaikan"
      },
      type: "milestone"
    },
    {
      year: 2025,
      month: "October",
      event: {
        en: "Sabah 40% revenue talks enter final stage negotiations",
        ms: "Rundingan hasil 40% Sabah memasuki peringkat akhir"
      },
      type: "inProgress"
    },
    {
      year: 2026,
      month: "January",
      event: {
        en: "Official MA63 Dashboard launch scheduled (BHESS/JPM portal)",
        ms: "Pelancaran Dashboard MA63 rasmi dijadualkan (portal BHESS/JPM)"
      },
      type: "upcoming"
    }
  ],

  hansardDocuments: [
    {
      id: "DR-24071974",
      date: "24 July 1974",
      dateMs: "24 Julai 1974",
      title: { en: "Dewan Rakyat Hansard - 24 July 1974", ms: "Hansard Dewan Rakyat - 24 Julai 1974" },
      description: {
        en: "Parliamentary proceedings of the Dewan Rakyat session on 24 July 1974 (3rd Parliament)",
        ms: "Prosiding parlimen sesi Dewan Rakyat pada 24 Julai 1974 (Parlimen ke-3)"
      },
      pdfUrl: "https://www.parlimen.gov.my/files/hindex/pdf/DR-24071974.pdf",
      parliament: "3rd Parliament",
      parliamentMs: "Parlimen ke-3"
    },
    {
      id: "DR-25071974",
      date: "25 July 1974",
      dateMs: "25 Julai 1974",
      title: { en: "Dewan Rakyat Hansard - 25 July 1974", ms: "Hansard Dewan Rakyat - 25 Julai 1974" },
      description: {
        en: "Parliamentary proceedings of the Dewan Rakyat session on 25 July 1974 (3rd Parliament)",
        ms: "Prosiding parlimen sesi Dewan Rakyat pada 25 Julai 1974 (Parlimen ke-3)"
      },
      pdfUrl: "https://www.parlimen.gov.my/files/hindex/pdf/DR-25071974.pdf",
      parliament: "3rd Parliament",
      parliamentMs: "Parlimen ke-3"
    },
    {
      id: "DR-26071974",
      date: "26 July 1974",
      dateMs: "26 Julai 1974",
      title: { en: "Dewan Rakyat Hansard - 26 July 1974", ms: "Hansard Dewan Rakyat - 26 Julai 1974" },
      description: {
        en: "Parliamentary proceedings of the Dewan Rakyat session on 26 July 1974 (3rd Parliament)",
        ms: "Prosiding parlimen sesi Dewan Rakyat pada 26 Julai 1974 (Parlimen ke-3)"
      },
      pdfUrl: "https://www.parlimen.gov.my/files/hindex/pdf/DR-26071974.pdf",
      parliament: "3rd Parliament",
      parliamentMs: "Parlimen ke-3"
    }
  ],

  priorityWatchlist: [
    {
      id: 1,
      title: { en: "Sabah 40% Oil & Gas Revenue", ms: "Hasil Minyak & Gas 40% Sabah" },
      description: {
        en: "Long-standing demand for Sabah to receive 40% of petroleum revenue from resources within its territory, as originally promised.",
        ms: "Tuntutan lama untuk Sabah menerima 40% hasil petroleum dari sumber dalam wilayahnya, seperti yang dijanjikan asal."
      },
      status: "inProgress",
      priority: "critical",
      lastUpdate: "Oct 2025"
    },
    {
      id: 2,
      title: { en: "Continental Shelf & Petroleum Rights", ms: "Hak Pelantar Benua & Petroleum" },
      description: {
        en: "Clarification of jurisdiction over continental shelf resources and petroleum beyond territorial waters.",
        ms: "Penjelasan bidang kuasa ke atas sumber pelantar benua dan petroleum di luar perairan wilayah."
      },
      status: "inProgress",
      priority: "high",
      lastUpdate: "Sep 2025"
    },
    {
      id: 3,
      title: { en: "Parliamentary Seat Rebalancing", ms: "Pengimbangan Semula Kerusi Parlimen" },
      description: {
        en: "Adjustment of parliamentary seats to ensure Sabah & Sarawak together hold at least 35% (originally 1/3) of total seats.",
        ms: "Pelarasan kerusi parlimen untuk memastikan Sabah & Sarawak bersama-sama memegang sekurang-kurangnya 35% (asal 1/3) daripada jumlah kerusi."
      },
      status: "inProgress",
      priority: "high",
      lastUpdate: "Aug 2025"
    },
    {
      id: 4,
      title: { en: "Native Customary Rights & Land", ms: "Hak Adat & Tanah Natif" },
      description: {
        en: "Legal recognition and protection of native customary land rights (NCR) for indigenous communities.",
        ms: "Pengiktirafan undang-undang dan perlindungan hak tanah adat (NCR) untuk komuniti orang asal."
      },
      status: "inProgress",
      priority: "medium",
      lastUpdate: "Nov 2025"
    },
    {
      id: 5,
      title: { en: "Equal Partner Status Formalization", ms: "Pemformalan Status Rakan Setara" },
      description: {
        en: "Complete constitutional formalization of Sabah and Sarawak as equal partners in the Federation, not just states.",
        ms: "Pemformalan perlembagaan lengkap Sabah dan Sarawak sebagai rakan setara dalam Persekutuan, bukan sekadar negeri."
      },
      status: "pending",
      priority: "medium",
      lastUpdate: "Jul 2025"
    }
  ]
};

// Chart configuration
const categoryChartConfig = {
  resolved: {
    label: "Resolved",
    color: "#22c55e", // green-500
  },
  inProgress: {
    label: "In Progress",
    color: "#eab308", // yellow-500
  },
  pending: {
    label: "Pending",
    color: "#ef4444", // red-500
  },
};

// Helper functions
function getStatusColor(status: string): string {
  switch (status) {
    case "resolved":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "inProgress":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "pending":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "upcoming":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "border-red-500 bg-red-50 dark:bg-red-950/20";
    case "high":
      return "border-orange-500 bg-orange-50 dark:bg-orange-950/20";
    case "medium":
      return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
    default:
      return "border-gray-300 bg-gray-50 dark:bg-gray-950/20";
  }
}

function getPriorityBadge(priority: string, language: string): { text: string; className: string } {
  switch (priority) {
    case "critical":
      return {
        text: language === 'ms' ? "Kritikal" : "Critical",
        className: "bg-red-500 text-white"
      };
    case "high":
      return {
        text: language === 'ms' ? "Tinggi" : "High",
        className: "bg-orange-500 text-white"
      };
    case "medium":
      return {
        text: language === 'ms' ? "Sederhana" : "Medium",
        className: "bg-yellow-500 text-black"
      };
    default:
      return {
        text: language === 'ms' ? "Rendah" : "Low",
        className: "bg-gray-500 text-white"
      };
  }
}

function getIconComponent(iconName: string) {
  const icons: Record<string, typeof MapPin> = {
    MapPin,
    DollarSign,
    Shield,
    Landmark,
    Users,
    FileText
  };
  return icons[iconName] || FileText;
}

// Sabah & Sarawak SVG Map Component
function MalaysiaMapHighlight() {
  return (
    <svg viewBox="0 0 400 200" className="w-full h-auto max-h-48">
      {/* Simplified Malaysia map outline */}
      <defs>
        <linearGradient id="sabahGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0033A0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#0033A0" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="sarawakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C8102E" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#C8102E" stopOpacity="0.6" />
        </linearGradient>
        <linearGradient id="peninsulaGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.3" />
        </linearGradient>
      </defs>

      {/* Peninsular Malaysia (simplified) */}
      <path
        d="M30 60 L50 50 L70 55 L80 70 L85 100 L90 130 L80 160 L60 170 L40 160 L30 130 L35 100 L30 60 Z"
        fill="url(#peninsulaGradient)"
        stroke="#64748b"
        strokeWidth="1"
        className="transition-all duration-300"
      />
      <text x="55" y="115" textAnchor="middle" className="fill-muted-foreground text-[8px] font-medium">
        Peninsular
      </text>

      {/* Sarawak (simplified) */}
      <path
        d="M140 100 L180 80 L220 70 L260 75 L280 90 L290 110 L280 130 L250 140 L210 145 L170 140 L140 130 L140 100 Z"
        fill="url(#sarawakGradient)"
        stroke="#C8102E"
        strokeWidth="2"
        className="transition-all duration-300 hover:opacity-90"
      />
      <text x="215" y="115" textAnchor="middle" className="fill-white text-[10px] font-bold drop-shadow-sm">
        SARAWAK
      </text>

      {/* Sabah (simplified) */}
      <path
        d="M290 50 L330 40 L360 45 L380 60 L385 80 L375 100 L350 110 L320 105 L295 95 L290 75 L290 50 Z"
        fill="url(#sabahGradient)"
        stroke="#0033A0"
        strokeWidth="2"
        className="transition-all duration-300 hover:opacity-90"
      />
      <text x="338" y="75" textAnchor="middle" className="fill-white text-[10px] font-bold drop-shadow-sm">
        SABAH
      </text>

      {/* South China Sea label */}
      <text x="150" y="60" textAnchor="middle" className="fill-muted-foreground/60 text-[7px] italic">
        South China Sea
      </text>

      {/* Legend */}
      <g transform="translate(10, 175)">
        <rect x="0" y="0" width="10" height="10" fill="#0033A0" rx="2" />
        <text x="14" y="9" className="fill-muted-foreground text-[7px]">Sabah</text>
        <rect x="45" y="0" width="10" height="10" fill="#C8102E" rx="2" />
        <text x="59" y="9" className="fill-muted-foreground text-[7px]">Sarawak</text>
      </g>
    </svg>
  );
}

export default function MA63Dashboard() {
  const { language } = useLanguage();
  const [visitorCount, setVisitorCount] = useState<number>(0);

  useEffect(() => {
    const trackAndFetchVisitorCount = async () => {
      try {
        await apiRequest("POST", "/api/page-views", { page: "ma63" });
        const response = await fetch("/api/page-views/ma63");
        if (response.ok) {
          const data = await response.json();
          setVisitorCount(data.count || 0);
        }
      } catch (error) {
        console.debug("Failed to track page view:", error);
      }
    };
    trackAndFetchVisitorCount();
  }, []);

  const { summary, categories, timeline, priorityWatchlist, hansardDocuments } = ma63Data;

  // Prepare data for pie chart
  const pieData = [
    { name: language === 'ms' ? "Selesai" : "Resolved", value: summary.resolved, fill: "#22c55e" },
    { name: language === 'ms' ? "Dalam Proses" : "In Progress", value: summary.inProgress, fill: "#eab308" },
    { name: language === 'ms' ? "Belum Selesai" : "Pending", value: summary.pending, fill: "#ef4444" },
  ];

  // Prepare data for category bar chart
  const barData = categories.map(cat => ({
    name: language === 'ms' ? cat.name.ms.split(' ')[0] : cat.name.en.split(' ')[0],
    fullName: language === 'ms' ? cat.name.ms : cat.name.en,
    resolved: cat.resolved,
    inProgress: cat.inProgress,
    pending: cat.pending,
  }));

  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title={language === 'ms' ? "Dashboard MA63 - Penjejak Perjanjian Malaysia 1963" : "MA63 Dashboard - Malaysia Agreement 1963 Tracker"}
        description={language === 'ms'
          ? "Penjejak pelaksanaan Perjanjian Malaysia 1963 (MA63) untuk hak dan autonomi Sabah & Sarawak"
          : "Track the implementation of the Malaysia Agreement 1963 (MA63) for Sabah & Sarawak rights and autonomy"}
        keywords="MA63, Malaysia Agreement 1963, Sabah, Sarawak, Borneo, autonomy, rights, federation"
        url="https://myparliament.calmic.com.my/ma63"
      />
      <Header />

      <main className="container max-w-7xl mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="space-y-2 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Scale className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">
                  {language === 'ms' ? 'Dashboard MA63' : 'MA63 Dashboard'}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {language === 'ms'
                    ? 'Perjanjian Malaysia 1963 - Penjejak Pelaksanaan'
                    : 'Malaysia Agreement 1963 - Implementation Tracker'}
                </p>
              </div>
            </div>
            <div className="sm:ml-auto flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-visitor-count">
                <Eye className="h-4 w-4" />
                <span>{visitorCount.toLocaleString()} {language === 'ms' ? 'pengunjung' : 'visitors'}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-1.5"
                data-testid="button-download-malaysia-agreement"
              >
                <a href={malaysiaAgreementPdf} download="Malaysia-Agreement-1963.pdf">
                  <Download className="h-4 w-4" />
                  {language === 'ms' ? 'Perjanjian Malaysia' : 'Malaysia Agreement'}
                </a>
              </Button>
              <Badge variant="outline" className="bg-[#0033A0]/10 text-[#0033A0] dark:text-blue-400 border-[#0033A0]/30">
                Sabah
              </Badge>
              <Badge variant="outline" className="bg-[#C8102E]/10 text-[#C8102E] dark:text-red-400 border-[#C8102E]/30">
                Sarawak
              </Badge>
            </div>
          </div>
        </div>

        {/* KPI Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="col-span-2 md:col-span-1">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs text-muted-foreground font-medium">
                  {language === 'ms' ? 'Jumlah Isu' : 'Total Issues'}
                </span>
              </div>
              <div className="text-3xl font-bold text-primary">{summary.totalIssues}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ms' ? 'Isu MA63 dijejaki' : 'MA63 issues tracked'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 dark:border-green-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs text-muted-foreground font-medium">
                  {language === 'ms' ? 'Selesai' : 'Resolved'}
                </span>
              </div>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">{summary.resolved}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.resolvedMadani} {language === 'ms' ? 'di bawah Madani' : 'under Madani'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-200 dark:border-yellow-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-xs text-muted-foreground font-medium">
                  {language === 'ms' ? 'Dalam Proses' : 'In Progress'}
                </span>
              </div>
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{summary.inProgress}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ms' ? 'Sedang dirunding' : 'Under discussion'}
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-200 dark:border-red-900/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
                <span className="text-xs text-muted-foreground font-medium">
                  {language === 'ms' ? 'Belum Selesai' : 'Pending'}
                </span>
              </div>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">{summary.pending}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {language === 'ms' ? 'Perlu tindakan' : 'Needs action'}
              </p>
            </CardContent>
          </Card>

          <Card className="col-span-2 md:col-span-1 border-primary/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-xs text-muted-foreground font-medium">
                  {language === 'ms' ? 'Kemajuan' : 'Progress'}
                </span>
              </div>
              <div className="text-3xl font-bold text-primary">{summary.overallProgress}%</div>
              <Progress value={summary.overallProgress} className="h-2 mt-2" />
            </CardContent>
          </Card>
        </div>

        {/* Charts and Map Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Progress Donut Chart */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                {language === 'ms' ? 'Status Keseluruhan' : 'Overall Status'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={categoryChartConfig} className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                      labelLine={false}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
              <div className="flex justify-center gap-4 mt-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-muted-foreground">{language === 'ms' ? 'Selesai' : 'Resolved'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-xs text-muted-foreground">{language === 'ms' ? 'Dalam Proses' : 'In Progress'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs text-muted-foreground">{language === 'ms' ? 'Belum Selesai' : 'Pending'}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Category Bar Chart */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                {language === 'ms' ? 'Mengikut Kategori' : 'By Category'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={categoryChartConfig} className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData} layout="vertical" margin={{ left: 0, right: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={60} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      labelFormatter={(label, payload) => {
                        if (payload && payload[0]) {
                          return payload[0].payload.fullName;
                        }
                        return label;
                      }}
                    />
                    <Bar dataKey="resolved" stackId="a" fill="#22c55e" name={language === 'ms' ? "Selesai" : "Resolved"} />
                    <Bar dataKey="inProgress" stackId="a" fill="#eab308" name={language === 'ms' ? "Dalam Proses" : "In Progress"} />
                    <Bar dataKey="pending" stackId="a" fill="#ef4444" name={language === 'ms' ? "Belum Selesai" : "Pending"} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Malaysia Map */}
          <Card className="lg:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                {language === 'ms' ? 'Wilayah Terfokus' : 'Focus Regions'}
              </CardTitle>
              <CardDescription>
                {language === 'ms'
                  ? 'Sabah & Sarawak - Rakan Pengasas Persekutuan Malaysia'
                  : 'Sabah & Sarawak - Founding Partners of the Federation of Malaysia'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MalaysiaMapHighlight />
              <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {language === 'ms'
                    ? 'MA63 menubuhkan Persekutuan Malaysia pada 16 September 1963 dengan Malaya, Sabah, Sarawak, dan Singapura.'
                    : 'MA63 formed the Federation of Malaysia on 16 September 1963 with Malaya, Sabah, Sarawak, and Singapore.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Category Details Table */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              {language === 'ms' ? 'Pecahan Kategori Isu' : 'Category Breakdown'}
            </CardTitle>
            <CardDescription>
              {language === 'ms'
                ? 'Status terperinci mengikut kategori isu MA63'
                : 'Detailed status by MA63 issue category'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">{language === 'ms' ? 'Kategori' : 'Category'}</th>
                    <th className="text-center p-3 font-medium">{language === 'ms' ? 'Jumlah' : 'Total'}</th>
                    <th className="text-center p-3 font-medium text-green-600 dark:text-green-400">{language === 'ms' ? 'Selesai' : 'Resolved'}</th>
                    <th className="text-center p-3 font-medium text-yellow-600 dark:text-yellow-400">{language === 'ms' ? 'Dalam Proses' : 'In Progress'}</th>
                    <th className="text-center p-3 font-medium text-red-600 dark:text-red-400">{language === 'ms' ? 'Belum' : 'Pending'}</th>
                    <th className="text-left p-3 font-medium hidden md:table-cell">{language === 'ms' ? 'Contoh' : 'Examples'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {categories.map((cat) => {
                    const IconComponent = getIconComponent(cat.icon);
                    return (
                      <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-md" style={{ backgroundColor: `${cat.color}20` }}>
                              <IconComponent className="h-4 w-4" style={{ color: cat.color }} />
                            </div>
                            <span className="font-medium">
                              {language === 'ms' ? cat.name.ms : cat.name.en}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-semibold">{cat.total}</td>
                        <td className="p-3 text-center">
                          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                            {cat.resolved}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                            {cat.inProgress}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">
                          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
                            {cat.pending}
                          </Badge>
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <div className="text-xs text-muted-foreground max-w-xs">
                            {cat.examples.inProgress.length > 0
                              ? cat.examples.inProgress.slice(0, 2).join(", ")
                              : cat.examples.resolved.slice(0, 2).join(", ")}
                            {(cat.examples.inProgress.length > 2 || cat.examples.resolved.length > 2) && "..."}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Hansard Documents */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {language === 'ms' ? 'Dokumen Hansard' : 'Hansard Documents'}
            </CardTitle>
            <CardDescription>
              {language === 'ms'
                ? 'Rekod rasmi prosiding Dewan Rakyat berkaitan MA63'
                : 'Official Dewan Rakyat proceedings records related to MA63'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {hansardDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-primary/10 shrink-0">
                      <FileText className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm mb-1">
                        {language === 'ms' ? doc.title.ms : doc.title.en}
                      </h4>
                      <p className="text-xs text-muted-foreground mb-2">
                        {language === 'ms' ? doc.description.ms : doc.description.en}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          <Calendar className="h-3 w-3 mr-1" />
                          {language === 'ms' ? doc.dateMs : doc.date}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          <Landmark className="h-3 w-3 mr-1" />
                          {language === 'ms' ? doc.parliamentMs : doc.parliament}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-1.5 w-full"
                      >
                        <a href={doc.pdfUrl} target="_blank" rel="noopener noreferrer">
                          <Download className="h-3.5 w-3.5" />
                          {language === 'ms' ? 'Muat Turun PDF' : 'Download PDF'}
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Timeline and Priority Watchlist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {language === 'ms' ? 'Garis Masa MA63' : 'MA63 Timeline'}
              </CardTitle>
              <CardDescription>
                {language === 'ms' ? 'Peristiwa penting 2018-2026' : 'Key milestones 2018-2026'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-4">
                  {timeline.map((item, index) => (
                    <div key={index} className="relative flex gap-4 pl-10">
                      {/* Timeline dot */}
                      <div className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-background ${
                        item.type === 'resolved' ? 'bg-green-500' :
                        item.type === 'inProgress' ? 'bg-yellow-500' :
                        item.type === 'upcoming' ? 'bg-blue-500' :
                        'bg-primary'
                      }`} />

                      <div className="flex-1 pb-4">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-xs font-semibold text-primary">
                            {item.month} {item.year}
                          </span>
                          <Badge variant="secondary" className={`text-xs ${getStatusColor(item.type)}`}>
                            {item.type === 'resolved' ? (language === 'ms' ? 'Selesai' : 'Resolved') :
                             item.type === 'inProgress' ? (language === 'ms' ? 'Dalam Proses' : 'In Progress') :
                             item.type === 'upcoming' ? (language === 'ms' ? 'Akan Datang' : 'Upcoming') :
                             (language === 'ms' ? 'Peristiwa' : 'Milestone')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {language === 'ms' ? item.event.ms : item.event.en}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Priority Watchlist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-primary" />
                {language === 'ms' ? 'Senarai Pemerhatian Utama' : 'Priority Watchlist'}
              </CardTitle>
              <CardDescription>
                {language === 'ms' ? 'Isu-isu kritikal yang belum selesai' : 'Critical unresolved issues'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {priorityWatchlist.map((item) => {
                  const priorityBadge = getPriorityBadge(item.priority, language);
                  return (
                    <div
                      key={item.id}
                      className={`p-3 rounded-lg border-l-4 transition-colors ${getPriorityColor(item.priority)}`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="font-semibold text-sm">
                          {language === 'ms' ? item.title.ms : item.title.en}
                        </h4>
                        <Badge className={`text-xs shrink-0 ${priorityBadge.className}`}>
                          {priorityBadge.text}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {language === 'ms' ? item.description.ms : item.description.en}
                      </p>
                      <div className="flex items-center justify-between text-xs">
                        <Badge variant="secondary" className={getStatusColor(item.status)}>
                          {item.status === 'inProgress'
                            ? (language === 'ms' ? 'Dalam Proses' : 'In Progress')
                            : (language === 'ms' ? 'Belum Selesai' : 'Pending')}
                        </Badge>
                        <span className="text-muted-foreground">
                          {language === 'ms' ? 'Kemas kini:' : 'Updated:'} {item.lastUpdate}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data Source Note */}
        <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100 mb-1">
                  {language === 'ms' ? 'Nota Sumber Data' : 'Data Source Note'}
                </h4>
                <p className="text-xs text-blue-800/80 dark:text-blue-200/80 leading-relaxed">
                  {language === 'ms'
                    ? 'Data berdasarkan pengumuman kerajaan awam & Jawatankuasa Teknikal MA63. Dashboard MA63 rasmi dijadualkan dilancarkan pada 28 Januari 2026 melalui portal BHESS/JPM. Data ini adalah anggaran dan akan dikemas kini apabila data rasmi tersedia.'
                    : 'Data based on public government announcements & MA63 Technical Committee reports. Official MA63 Dashboard launching January 28, 2026 via BHESS/JPM portal. This data is estimated and will be updated when official data becomes available.'}
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Badge variant="outline" className="text-xs border-blue-300 dark:border-blue-700">
                    {language === 'ms' ? 'Terakhir dikemas kini: Januari 2026' : 'Last updated: January 2026'}
                  </Badge>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="text-xs border-blue-300 dark:border-blue-700 cursor-help">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        BHESS/JPM
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs max-w-xs">
                        {language === 'ms'
                          ? 'Bahagian Hal Ehwal Sabah dan Sarawak, Jabatan Perdana Menteri'
                          : 'Sabah and Sarawak Affairs Division, Prime Minister\'s Department'}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
