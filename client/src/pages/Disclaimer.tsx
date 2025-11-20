import { Header } from "@/components/Header";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function Disclaimer() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-lg bg-primary/10">
            <AlertCircle className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('disclaimer.title')}</h1>
            <p className="text-muted-foreground mt-1">
              {t('disclaimer.subtitle')}
            </p>
          </div>
        </div>

        <Card className="p-8">
          <div className="prose prose-sm max-w-none">
            <p className="text-base mb-6">
              {t('disclaimer.welcome')}
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">1. {t('disclaimer.natureOfInformation')}</h2>
              <p className="mb-3">
                {t('disclaimer.natureContent1')}
              </p>
              <p>
                {t('disclaimer.natureContent2')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">2. {t('disclaimer.dataSources')}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">{t('disclaimer.primarySource')}</h3>
                  <p>
                    {t('disclaimer.primarySourceContent')}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">{t('disclaimer.mediaSources')}</h3>
                  <p>
                    {t('disclaimer.mediaSourcesContent')}
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-2">{t('disclaimer.inherentBiases')}</h3>
                  <p>
                    {t('disclaimer.inherentBiasesContent')}
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">3. {t('disclaimer.noWarranty')}</h2>
              <p className="mb-3">
                {t('disclaimer.noWarrantyContent1')}
              </p>
              <p>
                {t('disclaimer.noWarrantyContent2')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">4. {t('disclaimer.subjectivity')}</h2>
              <p>
                {t('disclaimer.subjectivityContent')}
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-3">5. {t('disclaimer.independence')}</h2>
              <p>
                {t('disclaimer.independenceContent')}
              </p>
            </section>

            <div className="mt-8 p-4 bg-muted/50 rounded-lg border-l-4 border-primary">
              <p className="text-sm font-medium">
                {t('disclaimer.acknowledgement')}
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
