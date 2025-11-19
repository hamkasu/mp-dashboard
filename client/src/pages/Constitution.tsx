import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, BookOpen, GraduationCap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import federalConstitutionPdf from "@assets/Federal Constitution (Reprint 2020)_1763559512512.pdf";
import parliamentGuideEnPdf from "@assets/EN - Parliament_1763559743234.pdf";
import parliamentGuideBmPdf from "@assets/BM - Parlimen_1763559743235.pdf";

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
              Malaysia's supreme law and educational guides about how Parliament works
            </p>
          </div>

          <Tabs defaultValue="constitution" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl">
              <TabsTrigger value="constitution" data-testid="tab-constitution" className="gap-2">
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">Federal Constitution</span>
                <span className="sm:hidden">Constitution</span>
              </TabsTrigger>
              <TabsTrigger value="guide-en" data-testid="tab-guide-en" className="gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">Guide (EN)</span>
                <span className="sm:hidden">EN</span>
              </TabsTrigger>
              <TabsTrigger value="guide-bm" data-testid="tab-guide-bm" className="gap-2">
                <GraduationCap className="w-4 h-4" />
                <span className="hidden sm:inline">Guide (BM)</span>
                <span className="sm:hidden">BM</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="constitution" className="space-y-4">
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
                    <Badge variant="secondary">17,558 lines</Badge>
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

            <TabsContent value="guide-en" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="text-2xl" data-testid="text-parliament-guide-en-title">
                        How the Malaysian Parliament Works
                      </CardTitle>
                      <CardDescription>
                        A guide for high school students (English)
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Educational</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[calc(100vh-300px)] min-h-[600px] border rounded-md overflow-hidden">
                    <iframe
                      src={parliamentGuideEnPdf}
                      className="w-full h-full"
                      title="How Malaysian Parliament Works - English Guide"
                      data-testid="pdf-viewer-guide-en"
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Topics covered:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>What is Parliament?</li>
                      <li>The Two Houses: Dewan Rakyat & Dewan Negara</li>
                      <li>How Laws Are Made</li>
                      <li>Key Players in Parliament</li>
                      <li>Why Parliament Matters</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="guide-bm" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="text-2xl" data-testid="text-parliament-guide-bm-title">
                        Cara Parlimen Malaysia Berfungsi
                      </CardTitle>
                      <CardDescription>
                        Panduan untuk pelajar sekolah menengah (Bahasa Malaysia)
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">Pendidikan</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="w-full h-[calc(100vh-300px)] min-h-[600px] border rounded-md overflow-hidden">
                    <iframe
                      src={parliamentGuideBmPdf}
                      className="w-full h-full"
                      title="Cara Parlimen Malaysia Berfungsi - Panduan Bahasa Malaysia"
                      data-testid="pdf-viewer-guide-bm"
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium">Topik yang diliputi:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Apakah Parlimen?</li>
                      <li>Dua Dewan: Dewan Rakyat & Dewan Negara</li>
                      <li>Cara Undang-Undang Dibuat</li>
                      <li>Pemain Utama dalam Parlimen</li>
                      <li>Mengapa Parlimen Penting</li>
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
