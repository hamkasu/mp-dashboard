import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scale, BookOpen, Languages } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/i18n/LanguageContext";
import federalConstitutionPdf from "@assets/Federal Constitution (Reprint 2020)_1763559512512.pdf";
import simplifiedEnglishPdf from "@assets/Simplified_Constitution_English_Article11_Focus_1763561623756.pdf";
import simplifiedMalayPdf from "@assets/Simplified_Constitution_Malay_Article11_Focus_1763561623753.pdf";

export default function Constitution() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Scale className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-constitution-title">
                {t('constitution.title')}
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              {t('constitution.subtitle')}
            </p>
          </div>

          <Tabs defaultValue="full" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-2xl">
              <TabsTrigger value="full" data-testid="tab-full-constitution" className="gap-2">
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">{t('constitution.fullConstitution')}</span>
                <span className="sm:hidden">{t('constitution.full')}</span>
              </TabsTrigger>
              <TabsTrigger value="simplified-en" data-testid="tab-simplified-en" className="gap-2">
                <BookOpen className="w-4 h-4" />
                <span className="hidden sm:inline">{t('constitution.simplifiedEn')}</span>
                <span className="sm:hidden">{t('constitution.en')}</span>
              </TabsTrigger>
              <TabsTrigger value="simplified-bm" data-testid="tab-simplified-bm" className="gap-2">
                <Languages className="w-4 h-4" />
                <span className="hidden sm:inline">{t('constitution.simplifiedBm')}</span>
                <span className="sm:hidden">{t('constitution.bm')}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="full" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5">
                      <CardTitle className="text-2xl" data-testid="text-federal-constitution-title">
                        {t('constitution.federalConstitutionTitle')}
                      </CardTitle>
                      <CardDescription>
                        {t('constitution.federalConstitutionDescription')}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{t('constitution.official')}</Badge>
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
                    {t('constitution.firstIntroduced')}
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
                        {t('constitution.simplifiedEnTitle')}
                      </CardTitle>
                      <CardDescription>
                        {t('constitution.simplifiedEnDescription')}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{t('constitution.english')}</Badge>
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
                    <p className="text-sm font-medium">{t('constitution.keyTopicsCovered')}</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>{t('constitution.introduction')}</li>
                      <li>{t('constitution.foundation')}</li>
                      <li>{t('constitution.article11')}</li>
                      <li>{t('constitution.citizenship')}</li>
                      <li>{t('constitution.specialProvisions')}</li>
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
                        {t('constitution.simplifiedBmTitle')}
                      </CardTitle>
                      <CardDescription>
                        {t('constitution.simplifiedBmDescription')}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">{t('constitution.bahasaMalaysia')}</Badge>
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
                    <p className="text-sm font-medium">{t('constitution.mainTopicsCovered')}</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>{t('constitution.introductionBm')}</li>
                      <li>{t('constitution.foundationBm')}</li>
                      <li>{t('constitution.article11Bm')}</li>
                      <li>{t('constitution.citizenshipBm')}</li>
                      <li>{t('constitution.specialProvisionsBm')}</li>
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
