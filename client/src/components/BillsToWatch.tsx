/**
 * Copyright by Calmic Sdn Bhd
 *
 * Bills to Watch Component
 *
 * A dynamic section highlighting pending/controversial bills in Malaysian Parliament.
 *
 * To update bill data:
 * 1. Edit the BILLS_DATA array below
 * 2. Each bill has: id, titleEn, titleMs, status, summaryEn, summaryMs, isFeatured, icon, tags
 * 3. The featured bill (isFeatured: true) appears prominently at the top
 * 4. Update LAST_UPDATED when making changes
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  ScrollText,
  ExternalLink,
  Users,
  ChevronDown,
  ChevronUp,
  Scale,
  ShieldCheck,
  FileSearch,
  Building2,
  BookOpen,
  Clock,
  Flame,
  X
} from "lucide-react";
import { Link } from "wouter";

// Last updated date - change this when updating bill data
const LAST_UPDATED = "February 2026";

// Bill status types
type BillStatus = "drafting" | "consultation" | "tabled" | "committee" | "pending" | "passed";

interface Bill {
  id: string;
  titleEn: string;
  titleMs: string;
  billNumber?: string;
  status: BillStatus;
  summaryEn: string;
  summaryMs: string;
  detailsEn?: string;
  detailsMs?: string;
  isFeatured?: boolean;
  icon: "scale" | "shield" | "search" | "building" | "book" | "scroll" | "users";
  tags: string[];
  sourceUrl?: string;
}

// ============================================================================
// BILL DATA - Edit this section to update bills
// ============================================================================
const BILLS_DATA: Bill[] = [
  {
    id: "political-financing",
    titleEn: "Political Financing Bill",
    titleMs: "RUU Pembiayaan Politik",
    status: "drafting",
    isFeatured: true,
    icon: "scale",
    tags: ["Reform", "Anti-Corruption", "High Priority"],
    summaryEn: "Landmark reform to regulate party funding, curb money politics, and increase transparency in political donations.",
    summaryMs: "Pembaharuan penting untuk mengawal selia pembiayaan parti, membendung politik wang, dan meningkatkan ketelusan dalam derma politik.",
    detailsEn: `20+ stakeholder sessions completed by BHEUU. Public perception study (IIUM-led) ends late Feb 2026.

Key proposals:
• Mandatory public disclosure of party finances
• Donation caps: RM50k/individual, RM100k/company, RM500k/large groups
• Protect small donor anonymity (disclose donations >RM10k only)
• Possible public funding for parties
• Restrictions to end "donations-for-contracts" perception

Opposition raises concerns about enforcement and fear-of-reprisal for donors.`,
    detailsMs: `20+ sesi pemegang taruh telah selesai oleh BHEUU. Kajian persepsi awam (diketuai IIUM) berakhir akhir Feb 2026.

Cadangan utama:
• Pendedahan mandatori kewangan parti kepada awam
• Had derma: RM50k/individu, RM100k/syarikat, RM500k/kumpulan besar
• Lindungi kerahsiaan penderma kecil (dedahkan derma >RM10k sahaja)
• Kemungkinan pembiayaan awam untuk parti
• Sekatan untuk menamatkan persepsi "derma-untuk-kontrak"

Pembangkang membangkitkan kebimbangan mengenai penguatkuasaan dan ketakutan pembalasan terhadap penderma.`,
  },
  {
    id: "pm-term-limit",
    titleEn: "Prime Minister Term Limit Bill",
    titleMs: "RUU Had Penggal Perdana Menteri",
    status: "consultation",
    icon: "shield",
    tags: ["Constitutional", "Reform"],
    summaryEn: "Constitutional amendment to limit PM tenure to 2 terms or maximum 10 years. High reform priority; politically sensitive due to power dynamics.",
    summaryMs: "Pindaan perlembagaan untuk mengehadkan tempoh PM kepada 2 penggal atau maksimum 10 tahun. Keutamaan pembaharuan tinggi; sensitif politik kerana dinamik kuasa.",
  },
  {
    id: "ag-separation",
    titleEn: "Attorney-General/Public Prosecutor Separation Bill",
    titleMs: "RUU Pengasingan Peguam Negara/Pendakwa Raya",
    status: "consultation",
    icon: "scale",
    tags: ["Judicial Reform", "Independence"],
    summaryEn: "Split AG's advisory role from prosecution to reduce political interference in legal proceedings. Controversial among legal establishment.",
    summaryMs: "Mengasingkan peranan nasihat Peguam Negara daripada pendakwaan untuk mengurangkan campur tangan politik dalam prosiding undang-undang. Kontroversi dalam kalangan badan kehakiman.",
  },
  {
    id: "ombudsman",
    titleEn: "Ombudsman Bill",
    titleMs: "RUU Ombudsman",
    status: "consultation",
    icon: "search",
    tags: ["Oversight", "Accountability"],
    summaryEn: "Establish independent oversight body to investigate maladministration. Debate expected on scope and independence from executive.",
    summaryMs: "Menubuhkan badan pengawasan bebas untuk menyiasat salah tadbir. Perdebatan dijangka mengenai skop dan kebebasan daripada eksekutif.",
  },
  {
    id: "foi",
    titleEn: "Freedom of Information Bill",
    titleMs: "RUU Kebebasan Maklumat",
    status: "consultation",
    icon: "search",
    tags: ["Transparency", "3R Sensitive"],
    summaryEn: "Enhance transparency and public access to government information. Sensitive regarding national security and 3R (race, religion, royalty) matters.",
    summaryMs: "Meningkatkan ketelusan dan akses awam kepada maklumat kerajaan. Sensitif berkenaan keselamatan negara dan perkara 3R (kaum, agama, raja).",
  },
  {
    id: "urban-renewal",
    titleEn: "Urban Renewal Bill 2025 (URA)",
    titleMs: "RUU Pembaharuan Bandar 2025 (URA)",
    status: "pending",
    icon: "building",
    tags: ["Property", "Development"],
    summaryEn: "Stalled bill involving land and property powers. Potential controversy over development rights and landowner protections.",
    summaryMs: "Rang undang-undang tertangguh melibatkan kuasa tanah dan harta. Potensi kontroversi mengenai hak pembangunan dan perlindungan pemilik tanah.",
  },
  {
    id: "mufti-ft",
    titleEn: "Mufti (Federal Territories) Bill 2024",
    titleMs: "RUU Mufti (Wilayah Persekutuan) 2024",
    status: "pending",
    icon: "book",
    tags: ["Religious", "3R Sensitive"],
    summaryEn: "Defines authority of religious officials in Federal Territories. Highly sensitive due to 3R implications and moral/faith debates.",
    summaryMs: "Mentakrifkan kuasa pegawai agama di Wilayah Persekutuan. Sangat sensitif kerana implikasi 3R dan perdebatan moral/keimanan.",
  },
];

// ============================================================================
// Component Implementation
// ============================================================================

const STATUS_CONFIG: Record<BillStatus, { labelEn: string; labelMs: string; className: string }> = {
  drafting: { labelEn: "Drafting", labelMs: "Penggubalan", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  consultation: { labelEn: "Consultation", labelMs: "Perundingan", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  tabled: { labelEn: "Tabled", labelMs: "Dibentang", className: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  committee: { labelEn: "Committee", labelMs: "Jawatankuasa", className: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  pending: { labelEn: "Pending", labelMs: "Menunggu", className: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300" },
  passed: { labelEn: "Passed", labelMs: "Diluluskan", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300" },
};

const ICON_MAP = {
  scale: Scale,
  shield: ShieldCheck,
  search: FileSearch,
  building: Building2,
  book: BookOpen,
  scroll: ScrollText,
  users: Users,
};

interface BillsToWatchProps {
  className?: string;
}

export function BillsToWatch({ className }: BillsToWatchProps) {
  const { language } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  const isMs = language === 'ms';
  const featuredBill = BILLS_DATA.find(b => b.isFeatured);
  const otherBills = BILLS_DATA.filter(b => !b.isFeatured);

  const getText = (en: string, ms: string) => isMs ? ms : en;

  return (
    <Card
      className={`relative overflow-hidden border-orange-200/50 dark:border-orange-900/30 bg-gradient-to-br from-orange-50/80 via-amber-50/50 to-yellow-50/30 dark:from-orange-950/20 dark:via-amber-950/10 dark:to-yellow-950/5 ${className}`}
      data-testid="bills-to-watch"
      role="region"
      aria-label={isMs ? "Rang Undang-Undang Untuk Diperhatikan" : "Bills to Watch"}
    >
      {/* Dismiss button */}
      <button
        onClick={() => setIsDismissed(true)}
        className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10"
        aria-label={isMs ? "Tutup seksyen ini" : "Dismiss this section"}
      >
        <X className="h-4 w-4 text-muted-foreground" />
      </button>

      <CardHeader className="pb-4">
        <div className="flex items-start gap-3">
          <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white p-2.5 rounded-xl shadow-lg shadow-orange-500/20">
            <ScrollText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-xl font-bold text-orange-900 dark:text-orange-100">
                {isMs ? "Rang Undang-Undang Untuk Diperhatikan" : "Bills to Watch"}
              </CardTitle>
              <Flame className="h-5 w-5 text-orange-500 animate-pulse" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground">
              {isMs
                ? "Rang undang-undang penting yang sedang dalam proses parlimen"
                : "Key legislation currently in the parliamentary pipeline"}
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Featured Bill */}
        {featuredBill && (
          <div className="bg-white/80 dark:bg-black/20 rounded-xl p-4 border border-orange-200/50 dark:border-orange-800/30 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-lg shrink-0">
                {(() => {
                  const IconComponent = ICON_MAP[featuredBill.icon];
                  return <IconComponent className="h-5 w-5 text-orange-600 dark:text-orange-400" />;
                })()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h3 className="font-bold text-lg text-foreground">
                    {getText(featuredBill.titleEn, featuredBill.titleMs)}
                  </h3>
                  <Badge className={`text-xs ${STATUS_CONFIG[featuredBill.status].className}`}>
                    {getText(STATUS_CONFIG[featuredBill.status].labelEn, STATUS_CONFIG[featuredBill.status].labelMs)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {featuredBill.tags.map(tag => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="text-xs border-orange-300/50 text-orange-700 dark:text-orange-300 bg-orange-50/50 dark:bg-orange-950/30"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-sm text-foreground/80 mb-3">
              {getText(featuredBill.summaryEn, featuredBill.summaryMs)}
            </p>

            {/* Expandable details */}
            {(featuredBill.detailsEn || featuredBill.detailsMs) && (
              <>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 text-sm font-medium text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 transition-colors mb-2"
                  aria-expanded={isExpanded}
                  aria-controls="featured-bill-details"
                >
                  {isExpanded
                    ? (isMs ? "Tunjuk kurang" : "Show less")
                    : (isMs ? "Baca lebih lanjut" : "Read more")}
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {isExpanded && (
                  <div
                    id="featured-bill-details"
                    className="bg-orange-50/50 dark:bg-orange-950/20 rounded-lg p-3 text-sm text-foreground/80 whitespace-pre-line border border-orange-100 dark:border-orange-900/30"
                  >
                    {getText(featuredBill.detailsEn || "", featuredBill.detailsMs || "")}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Other Bills List */}
        <div>
          <h4 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {isMs ? "Lain-lain Rang Undang-Undang Dalam Perhatian" : "Other Bills Under Watch"}
          </h4>

          <ScrollArea className="max-h-[280px]">
            <ul className="space-y-2" role="list">
              {otherBills.map(bill => {
                const IconComponent = ICON_MAP[bill.icon];
                return (
                  <li
                    key={bill.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/60 dark:bg-black/10 border border-orange-100/50 dark:border-orange-900/20 hover:bg-white/80 dark:hover:bg-black/20 transition-colors"
                  >
                    <div className="bg-orange-100/80 dark:bg-orange-900/20 p-1.5 rounded-md shrink-0 mt-0.5">
                      <IconComponent className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground">
                          {getText(bill.titleEn, bill.titleMs)}
                        </span>
                        <Badge className={`text-xs ${STATUS_CONFIG[bill.status].className}`}>
                          {getText(STATUS_CONFIG[bill.status].labelEn, STATUS_CONFIG[bill.status].labelMs)}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {getText(bill.summaryEn, bill.summaryMs)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ScrollArea>
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap gap-2 pt-2">
          <Button
            asChild
            size="sm"
            className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-md shadow-orange-500/20"
          >
            <Link href="/" aria-label={isMs ? "Hubungi Ahli Parlimen anda" : "Message your MP"}>
              <Users className="h-4 w-4 mr-1.5" />
              {isMs ? "Hubungi MP Anda" : "Message Your MP"}
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-orange-200 dark:border-orange-800 hover:bg-orange-50 dark:hover:bg-orange-950/30"
          >
            <a
              href="https://www.parlimen.gov.my"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={isMs ? "Jejak kemajuan di parlimen.gov.my" : "Track progress at parlimen.gov.my"}
            >
              <ExternalLink className="h-4 w-4 mr-1.5" />
              {isMs ? "Jejak di Parlimen.gov.my" : "Track at Parlimen.gov.my"}
            </a>
          </Button>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-orange-200/30 dark:border-orange-800/20">
          <p className="text-xs text-muted-foreground">
            {isMs
              ? `Dikemas kini: ${LAST_UPDATED} • Sumber: Kenyataan rasmi kerajaan`
              : `Last updated: ${LAST_UPDATED} • Source: Official government statements`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
