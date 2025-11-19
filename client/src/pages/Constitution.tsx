import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, BookOpen, Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import federalConstitutionPdf from "@assets/Federal Constitution (Reprint 2020)_1763559512512.pdf";
import simplifiedEnglishPdf from "@assets/Simplified_Constitution_English_Article11_Focus_1763561623756.pdf";
import simplifiedMalayPdf from "@assets/Simplified_Constitution_Malay_Article11_Focus_1763561623753.pdf";

export default function Constitution() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Scale className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-constitution-title">
                Federal Constitution
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              Malaysia's supreme law and simplified guides
            </p>
          </div>

          <Tabs defaultValue="full" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl">
              <TabsTrigger value="full" data-testid="tab-full-constitution" className="gap-2">
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">Full Constitution</span>
                <span className="sm:hidden">Full</span>
              </TabsTrigger>
              <TabsTrigger value="simplified-en" data-testid="tab-simplified-en" className="gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Simplified (EN)</span>
                <span className="sm:hidden">EN</span>
              </TabsTrigger>
              <TabsTrigger value="simplified-bm" data-testid="tab-simplified-bm" className="gap-2">
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">Simplified (BM)</span>
                <span className="sm:hidden">BM</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="full" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="text-2xl" data-testid="text-federal-constitution-title">
                        Federal Constitution (Reprint 2020)
                      </CardTitle>
                      <CardDescription>
                        The supreme law of Malaysia, as at 15 October 2020
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Official</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[calc(100vh-300px)] min-h-[600px] border rounded-md overflow-hidden">
                    <iframe
                      src={federalConstitutionPdf}
                      className="w-full h-full"
                      title="Federal Constitution of Malaysia"
                      data-testid="pdf-viewer-constitution"
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-4">
                    First introduced as the Constitution of the Federation of Malaya on Merdeka Day (31 August 1957).
                    Subsequently introduced as the Constitution of Malaysia on Malaysia Day (16 September 1963).
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="simplified-en" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="text-2xl" data-testid="text-simplified-en-title">
                        Simplified Guide to the Malaysian Federal Constitution
                      </CardTitle>
                      <CardDescription>
                        Easy-to-understand summary with special focus on Article 11 (Freedom of Religion)
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">English</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[calc(100vh-300px)] min-h-[600px] border rounded-md overflow-hidden">
                    <iframe
                      src={simplifiedEnglishPdf}
                      className="w-full h-full"
                      title="Simplified Constitution Guide (English)"
                      data-testid="pdf-viewer-simplified-en"
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Key topics covered:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Introduction to the Federal Constitution</li>
                      <li>Foundation of Malaysia and fundamental liberties</li>
                      <li>Article 11: Freedom of Religion (comprehensive explanation)</li>
                      <li>Citizenship, government structure, and elections</li>
                      <li>Special provisions and constitutional amendments</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="simplified-bm" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="text-2xl" data-testid="text-simplified-bm-title">
                        Panduan Ringkas Perlembagaan Persekutuan Malaysia
                      </CardTitle>
                      <CardDescription>
                        Ringkasan mudah difahami dengan tumpuan khusus kepada Perkara 11 (Kebebasan Beragama)
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Bahasa Malaysia</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[calc(100vh-300px)] min-h-[600px] border rounded-md overflow-hidden">
                    <iframe
                      src={simplifiedMalayPdf}
                      className="w-full h-full"
                      title="Panduan Ringkas Perlembagaan (Bahasa Malaysia)"
                      data-testid="pdf-viewer-simplified-bm"
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Topik utama yang diliputi:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Pengenalan kepada Perlembagaan Persekutuan</li>
                      <li>Asas Malaysia dan kebebasan asasi</li>
                      <li>Perkara 11: Kebebasan Beragama (penjelasan menyeluruh)</li>
                      <li>Kewarganegaraan, struktur kerajaan, dan pilihan raya</li>
                      <li>Peruntukan khas dan pindaan perlembagaan</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
