/**
 * Copyright by Calmic Sdn Bhd
 * Fundamental Rights Quick-View Popup
 */

import { useState } from "react";
import { Shield, Scale, Home, MessageCircle, Globe, GraduationCap, Wallet, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import { useLocation } from "wouter";

const rightsData = {
  en: {
    title: "Fundamental Rights",
    subtitle: "Part II (Articles 5-13) of the Federal Constitution",
    viewFull: "View Full Details",
    articles: [
      { number: "5", title: "Liberty of the Person", icon: Shield, summary: "No person shall be deprived of life or personal liberty except in accordance with law." },
      { number: "6", title: "Prohibition of Slavery and Forced Labour", icon: Shield, summary: "No person shall be held in slavery, and all forms of forced labour are prohibited." },
      { number: "8", title: "Equality Before the Law", icon: Scale, summary: "All persons are equal before the law and entitled to equal protection of the law." },
      { number: "9", title: "Prohibition of Banishment and Freedom of Movement", icon: Home, summary: "Citizens cannot be banished from Malaysia and have freedom of movement." },
      { number: "10", title: "Freedom of Speech, Assembly and Association", icon: MessageCircle, summary: "Every citizen has the right to freedom of speech, peaceful assembly, and association." },
      { number: "11", title: "Freedom of Religion", icon: Globe, summary: "Every person has the right to profess and practice their religion." },
      { number: "12", title: "Rights in Respect of Education", icon: GraduationCap, summary: "Rights related to education and protection from discrimination in educational institutions." },
      { number: "13", title: "Rights to Property", icon: Wallet, summary: "Protection against compulsory acquisition of property without adequate compensation." },
    ],
  },
  ms: {
    title: "Kebebasan Asasi",
    subtitle: "Bahagian II (Perkara 5-13) Perlembagaan Persekutuan",
    viewFull: "Lihat Butiran Penuh",
    articles: [
      { number: "5", title: "Kebebasan Diri", icon: Shield, summary: "Tiada seorang pun boleh dilucutkan nyawa atau kebebasan dirinya melainkan mengikut undang-undang." },
      { number: "6", title: "Larangan terhadap Perhambaan dan Buruh Paksa", icon: Shield, summary: "Tiada seorang pun boleh dijadikan hamba, dan semua bentuk buruh paksa adalah dilarang." },
      { number: "8", title: "Kesaksamaan di Hadapan Undang-Undang", icon: Scale, summary: "Semua orang adalah sama rata di sisi undang-undang dan berhak mendapat perlindungan yang sama." },
      { number: "9", title: "Larangan Pengusiran dan Kebebasan Bergerak", icon: Home, summary: "Warganegara tidak boleh dibuang negeri dari Malaysia dan mempunyai kebebasan bergerak." },
      { number: "10", title: "Kebebasan Bersuara, Berhimpun dan Berpersatuan", icon: MessageCircle, summary: "Setiap warganegara mempunyai hak kebebasan bersuara, berhimpun secara aman, dan berpersatuan." },
      { number: "11", title: "Kebebasan Beragama", icon: Globe, summary: "Setiap orang mempunyai hak untuk menganut dan mengamalkan agamanya." },
      { number: "12", title: "Hak Berkenaan Pendidikan", icon: GraduationCap, summary: "Hak yang berkaitan dengan pendidikan dan perlindungan daripada diskriminasi dalam institusi pendidikan." },
      { number: "13", title: "Hak kepada Harta", icon: Wallet, summary: "Perlindungan terhadap pengambilan harta secara paksa tanpa pampasan yang mencukupi." },
    ],
  },
};

export function FundamentalRightsPopup({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const { language } = useLanguage();
  const [, setLocation] = useLocation();

  const content = rightsData[language as keyof typeof rightsData] || rightsData.en;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col" data-testid="fundamental-rights-popup">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5 text-primary" />
            {content.title}
          </DialogTitle>
          <DialogDescription>
            {content.subtitle}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-4">
            {content.articles.map((article) => {
              const Icon = article.icon;
              return (
                <div
                  key={article.number}
                  className="rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  data-testid={`rights-article-${article.number}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 rounded-md bg-primary/10 p-1.5">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm">
                        {language === "ms" ? "Perkara" : "Article"} {article.number}: {article.title}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {article.summary}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        <div className="pt-2 border-t">
          <Button
            className="w-full gap-2"
            onClick={() => {
              setOpen(false);
              setLocation("/fundamental-rights");
            }}
            data-testid="rights-popup-view-full"
          >
            <ExternalLink className="w-4 h-4" />
            {content.viewFull}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
