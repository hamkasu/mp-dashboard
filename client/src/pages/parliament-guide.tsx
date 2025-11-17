import { useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Users, FileText, CheckCircle } from "lucide-react";

export default function ParliamentGuide() {
  const [language, setLanguage] = useState<"en" | "bm">("en");

  const content = {
    en: {
      title: "How the Malaysian Parliament Works",
      subtitle: "A Guide for High School Students",
      whatIs: {
        title: "What is Parliament?",
        content: "Imagine Malaysia is a giant school. Parliament is like the student council for the whole country - but with much bigger responsibilities! It's where laws are made, taxes are decided, and the government is held accountable."
      },
      twoHouses: {
        title: "The Two Houses of Parliament",
        intro: "Malaysia has a bicameral (two-house) system:",
        dewanRakyat: {
          title: "Dewan Rakyat (House of Representatives)",
          subtitle: "The People's House - most powerful",
          points: [
            "222 Members of Parliament (MPs)",
            "Elected by citizens aged 18+ in general elections",
            "Forms the Government: Party with >111 seats wins",
            "Main jobs: Make laws, approve budget, check government work"
          ]
        },
        dewanNegara: {
          title: "Dewan Negara (House of Senate)",
          subtitle: "The Review House - less powerful",
          points: [
            "70 Senators",
            "Not elected by public: 26 from state assemblies, 44 appointed by King",
            "Main jobs: Review laws from Dewan Rakyat, provide expert advice"
          ]
        }
      },
      lawMaking: {
        title: "How Laws Are Made",
        steps: [
          { step: "First Reading", desc: "Bill introduced" },
          { step: "Second Reading", desc: "Main debate" },
          { step: "Committee Stage", desc: "Detailed review" },
          { step: "Third Reading", desc: "Final vote" },
          { step: "Senate Review", desc: "Dewan Negara examines" },
          { step: "Royal Assent", desc: "King signs into law" },
          { step: "Publication", desc: "Becomes official law" }
        ]
      },
      keyPlayers: {
        title: "Key Players",
        players: [
          { role: "Yang di-Pertuan Agong", desc: "Constitutional Monarch" },
          { role: "Prime Minister", desc: "Head of Government" },
          { role: "Speaker", desc: "Parliamentary referee" },
          { role: "Opposition Leader", desc: "Head of main opposition party" }
        ]
      },
      whyMatters: {
        title: "Why It Matters",
        intro: "Parliament ensures:",
        points: [
          "Your voice is heard through your MP",
          "Government is accountable",
          "Laws are properly debated",
          "Tax money is properly spent"
        ]
      }
    },
    bm: {
      title: "Cara Parlimen Malaysia Berfungsi",
      subtitle: "Panduan untuk Pelajar Sekolah Menengah",
      whatIs: {
        title: "Apakah Parlimen?",
        content: "Bayangkan Malaysia seperti sebuah sekolah besar. Parlimen adalah seperti majlis perwakilan pelajar untuk seluruh negara - tetapi dengan tanggungjawab yang lebih besar! Di sinilah undang-undang dibuat, cukai diputuskan, dan kerajaan dipantau."
      },
      twoHouses: {
        title: "Dua Dewan dalam Parlimen",
        intro: "Malaysia mempunyai sistem dua dewan:",
        dewanRakyat: {
          title: "Dewan Rakyat",
          subtitle: "Rumah Rakyat - paling berkuasa",
          points: [
            "222 Ahli Parlimen (AP)",
            "Dipilih oleh rakyat berumur 18+ dalam pilihan raya umum",
            "Membentuk Kerajaan: Parti dengan >111 kerusi menang",
            "Tugas utama: Buat undang-undang, lulus bajet, periksa kerja kerajaan"
          ]
        },
        dewanNegara: {
          title: "Dewan Negara",
          subtitle: "Dewan Peninjau - kurang kuasa",
          points: [
            "70 Senator",
            "Tidak dipilih oleh rakyat: 26 dari dewan negeri, 44 dilantik Yang di-Pertuan Agong",
            "Tugas utama: Semak semula undang-undang dari Dewan Rakyat, beri nasihat pakar"
          ]
        }
      },
      lawMaking: {
        title: "Cara Undang-Undang Dibuat",
        steps: [
          { step: "Pembacaan Pertama", desc: "Rang undang-undang diperkenalkan" },
          { step: "Pembacaan Kedua", desc: "Perbahasan utama" },
          { step: "Peringkat Jawatankuasa", desc: "Semakan terperinci" },
          { step: "Pembacaan Ketiga", desc: "Undian akhir" },
          { step: "Semakan Dewan Negara", desc: "Dewan Negara periksa" },
          { step: "Perkenan Diraja", desc: "Yang di-Pertuan Agong tandatangani" },
          { step: "Penerbitan", desc: "Menjadi undang-undang rasmi" }
        ]
      },
      keyPlayers: {
        title: "Pemain Utama",
        players: [
          { role: "Yang di-Pertuan Agong", desc: "Raja Berperlembagaan" },
          { role: "Perdana Menteri", desc: "Ketua Kerajaan" },
          { role: "Speaker", desc: "Pengadil parlimen" },
          { role: "Ketua Pembangkang", desc: "Ketua parti pembangkang utama" }
        ]
      },
      whyMatters: {
        title: "Mengapa Ia Penting",
        intro: "Parlimen memastikan:",
        points: [
          "Suara anda didengar melalui Ahli Parlimen anda",
          "Kerajaan bertanggungjawab",
          "Undang-undang dibahaskan dengan betul",
          "Wang cukai dibelanjakan dengan betul"
        ]
      }
    }
  };

  const currentContent = content[language];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8 md:px-6 lg:px-8">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-8 h-8 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight" data-testid="text-guide-title">
                  {currentContent.title}
                </h1>
              </div>
              <p className="text-lg text-muted-foreground" data-testid="text-guide-subtitle">
                {currentContent.subtitle}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={language === "en" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("en")}
                data-testid="button-language-en"
              >
                English
              </Button>
              <Button
                variant={language === "bm" ? "default" : "outline"}
                size="sm"
                onClick={() => setLanguage("bm")}
                data-testid="button-language-bm"
              >
                Bahasa Malaysia
              </Button>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-section-what-is-parliament">
                <BookOpen className="w-5 h-5" />
                {currentContent.whatIs.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed" data-testid="text-what-is-content">
                {currentContent.whatIs.content}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-section-two-houses">
                <Users className="w-5 h-5" />
                {currentContent.twoHouses.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground" data-testid="text-two-houses-intro">{currentContent.twoHouses.intro}</p>
              
              <div className="space-y-4">
                <div className="border rounded-md p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="text-dewan-rakyat-title">{currentContent.twoHouses.dewanRakyat.title}</h3>
                    <p className="text-sm text-muted-foreground" data-testid="text-dewan-rakyat-subtitle">{currentContent.twoHouses.dewanRakyat.subtitle}</p>
                  </div>
                  <ul className="space-y-2">
                    {currentContent.twoHouses.dewanRakyat.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm" data-testid={`text-dewan-rakyat-point-${i}`}>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border rounded-md p-4 space-y-3">
                  <div>
                    <h3 className="text-lg font-semibold" data-testid="text-dewan-negara-title">{currentContent.twoHouses.dewanNegara.title}</h3>
                    <p className="text-sm text-muted-foreground" data-testid="text-dewan-negara-subtitle">{currentContent.twoHouses.dewanNegara.subtitle}</p>
                  </div>
                  <ul className="space-y-2">
                    {currentContent.twoHouses.dewanNegara.points.map((point, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm" data-testid={`text-dewan-negara-point-${i}`}>{point}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-section-law-making">
                <FileText className="w-5 h-5" />
                {currentContent.lawMaking.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {currentContent.lawMaking.steps.map((step, i) => (
                  <div key={i} className="flex items-start gap-3" data-testid={`text-law-step-${i}`}>
                    <Badge variant="secondary" className="mt-1">
                      {i + 1}
                    </Badge>
                    <div>
                      <p className="font-medium" data-testid={`text-law-step-name-${i}`}>{step.step}</p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-law-step-desc-${i}`}>{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-section-key-players">
                <Users className="w-5 h-5" />
                {currentContent.keyPlayers.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-4">
                {currentContent.keyPlayers.players.map((player, i) => (
                  <div key={i} className="border rounded-md p-3" data-testid={`text-key-player-${i}`}>
                    <p className="font-semibold" data-testid={`text-key-player-role-${i}`}>{player.role}</p>
                    <p className="text-sm text-muted-foreground" data-testid={`text-key-player-desc-${i}`}>{player.desc}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" data-testid="text-section-why-matters">
                <CheckCircle className="w-5 h-5" />
                {currentContent.whyMatters.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4" data-testid="text-why-matters-intro">{currentContent.whyMatters.intro}</p>
              <ul className="space-y-2">
                {currentContent.whyMatters.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <span data-testid={`text-why-matters-point-${i}`}>{point}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
