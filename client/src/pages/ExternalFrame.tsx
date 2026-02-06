/**
 * Copyright by Calmic Sdn Bhd
 */

import { Header } from "@/components/Header";
import { PageMeta } from "@/components/PageMeta";
import { useRoute } from "wouter";
import { useLanguage } from "@/i18n/LanguageContext";
import { ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Define the external sites that can be embedded
const externalSites: Record<string, { url: string; titleKey: string; name: string }> = {
  "lumi-news": {
    url: "https://luminews.my/",
    titleKey: "nav.lumiNews",
    name: "Lumi News",
  },
  "mcchr": {
    url: "https://mcchr.org/",
    titleKey: "nav.mcchr",
    name: "MCCHR",
  },
  "parliament-videos": {
    url: "https://www.youtube.com/@PARLIMENMALAYSIA1",
    titleKey: "parliamentVideos.title",
    name: "Parliament Videos",
  },
};

export default function ExternalFrame() {
  const { t } = useLanguage();
  const [, params] = useRoute("/external/:site");
  const siteKey = params?.site || "";
  const site = externalSites[siteKey];

  if (!site) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto" />
            <h1 className="text-2xl font-bold">Site not found</h1>
            <p className="text-muted-foreground">The requested external site is not available.</p>
          </div>
        </main>
      </div>
    );
  }

  const siteName = t(site.titleKey as any) || site.name;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PageMeta
        title={`${siteName} - MyParliament`}
        description={`View ${siteName} within MyParliament`}
        url={`https://myparliament.calmic.com.my/external/${siteKey}`}
      />
      <Header />

      <main className="flex-1 flex flex-col">
        {/* Toolbar with site info and open in new tab option */}
        <div className="border-b bg-muted/30 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <ExternalLink className="w-4 h-4" />
            <span>Viewing: <strong className="text-foreground">{siteName}</strong></span>
            <span className="hidden sm:inline">({site.url})</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(site.url, "_blank")}
            className="gap-1"
          >
            <ExternalLink className="w-3 h-3" />
            <span className="hidden sm:inline">Open in new tab</span>
            <span className="sm:hidden">Open</span>
          </Button>
        </div>

        {/* Iframe container - header is 64px, toolbar is ~40px */}
        <div className="h-[calc(100vh-104px)]">
          <iframe
            src={site.url}
            className="w-full h-full border-0"
            title={siteName}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer-when-downgrade"
            data-testid={`iframe-${siteKey}`}
          />
        </div>
      </main>
    </div>
  );
}
