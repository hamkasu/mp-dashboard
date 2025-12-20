/**
 * Copyright by Calmic Sdn Bhd
 */

import { Card, CardContent } from "@/components/ui/card";
import { PageMeta } from "@/components/PageMeta";
import { AlertCircle } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <PageMeta
        title="Page Not Found"
        description="The page you are looking for could not be found."
        keywords="404, not found, error"
        url="https://myparliament.calmic.com.my"
      />
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">{t('notFound.title')}</h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            {t('notFound.message')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
