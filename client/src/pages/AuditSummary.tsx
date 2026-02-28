/**
 * Copyright by Calmic Sdn Bhd
 * LKAN 1/2026 Audit Summary Page
 */

import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, AlertTriangle, Building2, ExternalLink } from "lucide-react";

const qualifiedAgencies = [
  { bil: 1, agency: "Suruhanjaya Hak Asasi Manusia Malaysia (SUHAKAM)", reason: "Unverified cash/bank balances", ministry: "Jabatan Perdana Menteri (under PM)" },
  { bil: 2, agency: "Perbadanan Harta Intelek Malaysia (MyIPO)", reason: "Understated depreciation & benefits", ministry: "Kementerian Pelaburan, Perdagangan dan Industri – Datuk Seri Johari Abdul Ghani" },
  { bil: 3, agency: "Perbadanan Labuan (PL)", reason: "Overstated funds & assets", ministry: "Kementerian Kewangan (PM also holds Finance)" },
  { bil: 4, agency: "Perbadanan Tabung Pembangunan Kemahiran (PTPK)", reason: "No provision for doubtful debts", ministry: "Kementerian Sumber Manusia" },
  { bil: 5, agency: "Pertubuhan Berita Nasional Malaysia (BERNAMA)", reason: "Overstated balances", ministry: "Kementerian Komunikasi" },
  { bil: 6, agency: "Institut Koperasi Malaysia (IKMa)", reason: "Overstated advance", ministry: "Kementerian Pembangunan Usahawan & Koperasi" },
  { bil: 7, agency: "Institut Penyelidikan Perhutanan Malaysia (FRIM)", reason: "Overstated investment", ministry: "Kementerian Sumber Asli & Kelestarian Alam Sekitar" },
  { bil: 8, agency: "Perbadanan Hal Ehwal Bekas Angkatan Tentera (PERHEBAT)", reason: "Overstated loan debtors", ministry: "Kementerian Pertahanan – Dato' Seri Mohamed Khaled Nordin" },
  { bil: 9, agency: "Perbadanan Aset Keretapi (RAC)", reason: "Multiple overstatements in assets/receivables", ministry: "Kementerian Pengangkutan" },
  { bil: 10, agency: "Universiti Kebangsaan Malaysia (UKM)", reason: "Irregular student fees & expenditures (Key Audit Area)", ministry: "Kementerian Pendidikan Tinggi – YB Dato' Seri Diraja Dr. Zambry Abd Kadir", highlight: true },
  { bil: 11, agency: "Universiti Sains Islam Malaysia (USIM)", reason: "Projects not capitalised correctly", ministry: "Kementerian Pendidikan Tinggi – Dr. Zambry Abd Kadir" },
  { bil: 12, agency: "Lembaga Ahli Geologi Malaysia (BOG)", reason: "Understated fee income", ministry: "Kementerian Sumber Asli & Kelestarian Alam Sekitar" },
  { bil: 13, agency: "Lembaga Getah Malaysia (LGM)", reason: "Misstated investment property", ministry: "Kementerian Perladangan & Komoditi" },
  { bil: 14, agency: "Lembaga Kenaf dan Tembakau Negara (LKTN)", reason: "Understated assets", ministry: "Kementerian Perladangan & Komoditi" },
  { bil: 15, agency: "Lembaga Kemajuan Pertanian Kemubu (KADA)", reason: "Misstated assets", ministry: "Kementerian Pertanian dan Keterjaminan Makanan – Datuk Seri Haji Mohamad Sabu" },
];

const proceduralBreaches = [
  {
    agency: "Universiti Kebangsaan Malaysia (UKM)",
    type: "Key Audit Area",
    details: "Unauthorised fee collection by cooperative (RM50.74 juta), conflict of interest (5 UKM officers), irregular spending (RM5.94 juta commissions, bypassed procurement, etc.).",
    ministry: "Kementerian Pendidikan Tinggi – YB Dato' Seri Diraja Dr. Zambry Abd Kadir",
  },
  {
    agency: "Perbadanan Perwira Harta Malaysia (PPHM)",
    type: "Emphasis of Matter",
    details: "Going-concern issues: Liabilities exceed assets; operations ceased 31 May 2025.",
    ministry: "Kementerian Pertahanan (via LTAT) – YB Dato' Seri Mohamed Khaled bin Nordin",
  },
  {
    agency: "R&D&C&I Program & MyDigital ID Project",
    type: "Multiple Breaches",
    details: "RM183.11 juta unreturned grants, RM107.71 juta non-compliance, missing prototypes, misused funds, no separate bank accounts.",
    ministry: null,
    subMinistries: [
      { label: "Kementerian Pendidikan Tinggi (KPT + UKM) – Dr. Zambry Abd Kadir", amount: "RM110.67 juta grants not returned" },
      { label: "Kementerian Sains, Teknologi dan Inovasi (MOSTI + MIMOS Berhad, Cradle Fund, UTM) – YB Datuk Chang Lih Kang", amount: "RM65.78 juta no bank accounts, missing i-Breath prototypes" },
      { label: "Kementerian Pelaburan, Perdagangan dan Industri (MITI) – Datuk Seri Johari Abdul Ghani", amount: "RM55.64 juta grants not returned" },
      { label: "Kementerian Pertanian dan Keterjaminan Makanan (KPKM) – Datuk Seri Haji Mohamad Sabu", amount: "RM33.80 juta misused for operating expenses" },
    ],
  },
];

export default function AuditSummary() {
  return (
    <div className="min-h-screen bg-background">
      <PageMeta
        title="LKAN 1/2026 Audit Summary"
        description="Summary of LKAN 1/2026 audit findings – agencies with modified opinions and serious procedural breaches."
        keywords="audit, LKAN, Laporan Ketua Audit Negara, modified opinion, pendapat diubahsuai, federal agencies"
        url="https://myparliament.calmic.com.my/audit-summary"
      />
      <Header />
      <main className="container max-w-6xl mx-auto px-4 py-8">
        {/* Page Title */}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-lg bg-primary/10">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">LKAN 1/2026 – Audit Summary</h1>
            <p className="text-muted-foreground mt-1">
              Laporan Ketua Audit Negara · Penyata Kewangan & Aktiviti Agensi Persekutuan 2024
            </p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-8 ml-1">
          Source: LKAN 1/2026 (Penyata Kewangan and Aktiviti reports). All details are directly from the Auditor General's report.
        </p>

        {/* Section 1 */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h2 className="text-xl font-semibold">
              1. Agencies with Pendapat Diubahsuai (Modified Opinion / Pendapat Berteguran)
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            15 agencies – material breaches of accounting standards, Treasury rules, or financial procedures.
          </p>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left px-4 py-3 font-semibold w-10">Bil.</th>
                      <th className="text-left px-4 py-3 font-semibold">Agensi Persekutuan</th>
                      <th className="text-left px-4 py-3 font-semibold">Main Reasons (Broke Rules)</th>
                      <th className="text-left px-4 py-3 font-semibold">Kementerian / Menteri Bertanggungjawab</th>
                    </tr>
                  </thead>
                  <tbody>
                    {qualifiedAgencies.map((row) => (
                      <tr
                        key={row.bil}
                        className={`border-b last:border-0 hover:bg-muted/30 transition-colors ${row.highlight ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                      >
                        <td className="px-4 py-3 text-muted-foreground font-mono">{row.bil}</td>
                        <td className="px-4 py-3 font-medium">
                          {row.agency}
                          {row.highlight && (
                            <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-400">
                              Key Audit Area
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{row.reason}</td>
                        <td className="px-4 py-3 text-muted-foreground">{row.ministry}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Section 2 */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-5 h-5 text-red-500" />
            <h2 className="text-xl font-semibold">
              2. Agencies / Programs with Serious Procedural Breaches
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Key Audit Area or Aktiviti Report – major violations of laws, guidelines, and financial regulations, even if some received clean opinions overall.
          </p>

          <div className="space-y-4">
            {proceduralBreaches.map((item, idx) => (
              <Card key={idx} className="border-l-4 border-l-red-400">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-base">{item.agency}</CardTitle>
                    <Badge variant="outline" className="text-xs text-red-600 border-red-400">
                      {item.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">{item.details}</p>
                  {item.ministry && (
                    <p className="text-sm">
                      <span className="font-medium">Kementerian / Menteri:</span>{" "}
                      <span className="text-muted-foreground">{item.ministry}</span>
                    </p>
                  )}
                  {item.subMinistries && (
                    <div>
                      <p className="text-sm font-medium mb-2">Kementerian / Menteri:</p>
                      <ul className="space-y-1">
                        {item.subMinistries.map((sub, i) => (
                          <li key={i} className="text-sm pl-4 border-l-2 border-muted">
                            <span className="text-muted-foreground">{sub.label}</span>
                            <span className="ml-2 font-medium text-red-600">({sub.amount})</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Summary Box */}
        <Card className="bg-muted/40 border-primary/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• <strong>15 agencies</strong> received qualified audit opinions for direct breaches of rules.</p>
            <p>• The most serious governance failures (unauthorised collections, conflicts of interest, lost assets, misuse of public funds) are at <strong>UKM</strong> and the <strong>R&D program</strong> (under KPT, MOSTI, MITI, KPKM).</p>
            <p>• Ministers responsible for immediate corrective action and preventing recurrence are listed above.</p>
            <p>• The Auditor General has issued specific recommendations (<em>syor</em>) to each ministry/agency.</p>
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                All details are directly from <strong>LKAN 1/2026</strong> (Penyata Kewangan and Aktiviti reports).
                The Auditor General's Dashboard (AGD) now tracks follow-up actions publicly.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* PDF Links */}
        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/LKAN-1-2026-Penyata-Kewangan-Agensi-Persekutuan-Tahun-2024-Bookmark.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="w-4 h-4" />
            LKAN 1/2026 – Penyata Kewangan (PDF)
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href="/LKAN-1-2026-AKTIVITI-KEM-JAB-BDN-BERKANUN-PENGURUSAN-SYRKT-KERAJAAN-compressed.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <FileText className="w-4 h-4" />
            LKAN 1/2026 – Aktiviti (PDF)
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </main>
    </div>
  );
}
