import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useLanguage } from "@/i18n/LanguageContext";
import { Crown } from "lucide-react";

export function RoyalAddress() {
  const { t } = useLanguage();

  return (
    <Card className="border-primary/20 bg-primary/5 overflow-hidden h-full">
      <CardContent className="p-0">
        <div className="bg-primary/10 px-6 py-4 flex items-center justify-between border-b border-primary/10">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground p-2 rounded-full">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-primary">{t("royalAddress.title")}</h2>
              <p className="text-sm text-muted-foreground">{t("royalAddress.subtitle")}</p>
            </div>
          </div>
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 uppercase tracking-wider font-semibold">
            {t("royalAddress.session")}
          </Badge>
        </div>
        
        <ScrollArea className="h-[400px] w-full">
          <div className="px-8 py-8 prose prose-sm dark:prose-invert max-w-none text-foreground/90 leading-relaxed">
            <div className="text-center mb-10 space-y-2">
              <p className="font-semibold text-lg italic">{t("royalAddress.greeting")}</p>
              <p className="text-muted-foreground italic text-sm">{t("royalAddress.bismillah")}</p>
            </div>

            <p className="mb-6 font-medium">{t("royalAddress.intro")}</p>
            
            <p className="mb-8 italic border-l-4 border-primary/20 pl-4 py-1">{t("royalAddress.thanks")}</p>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">1.</span>
                <p>{t("royalAddress.p1")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">2.</span>
                <p>{t("royalAddress.p2")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">3.</span>
                <p>{t("royalAddress.p3")}</p>
              </div>

              <div className="flex gap-4 bg-red-500/5 p-4 rounded-lg border border-red-500/10">
                <span className="font-bold text-red-600 dark:text-red-400 shrink-0">4.</span>
                <p className="font-semibold text-red-700 dark:text-red-300">{t("royalAddress.p4")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">5.</span>
                <p>{t("royalAddress.p5")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">6.</span>
                <p>{t("royalAddress.p6")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">7.</span>
                <p>{t("royalAddress.p7")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">8.</span>
                <p>{t("royalAddress.p8")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">9.</span>
                <p>{t("royalAddress.p9")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">10.</span>
                <p>{t("royalAddress.p10")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">11.</span>
                <p>{t("royalAddress.p11")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">12.</span>
                <p>{t("royalAddress.p12")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">13.</span>
                <p>{t("royalAddress.p13")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">14.</span>
                <p>{t("royalAddress.p14")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">15.</span>
                <p>{t("royalAddress.p15")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">16.</span>
                <p>{t("royalAddress.p16")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">17.</span>
                <p>{t("royalAddress.p17")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">18.</span>
                <p>{t("royalAddress.p18")}</p>
              </div>
            </div>

            <div className="mt-8 mb-6 font-semibold border-t pt-8">
              <p>{t("royalAddress.members")}</p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">19.</span>
                <p>{t("royalAddress.p19")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">20.</span>
                <p>{t("royalAddress.p20")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">21.</span>
                <p>{t("royalAddress.p21")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">22.</span>
                <p>{t("royalAddress.p22")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">23.</span>
                <p>{t("royalAddress.p23")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">24.</span>
                <p>{t("royalAddress.p24")}</p>
              </div>

              <div className="flex gap-4">
                <span className="font-bold text-primary shrink-0">25.</span>
                <p>{t("royalAddress.p25")}</p>
              </div>
            </div>

            <div className="mt-12 text-right italic font-medium space-y-1">
              <p>Sekian,</p>
              <p>Wabillahi Taufik Wal Hidayah,</p>
              <p>Wassalamualaikum Warahmatullah Wabarakatuh.</p>
            </div>
          </div>
        </ScrollArea>
        
        <div className="px-6 py-3 bg-primary/5 text-center border-t border-primary/10">
          <p className="text-xs text-muted-foreground font-medium">{t("royalAddress.closing")}</p>
        </div>
      </CardContent>
    </Card>
  );
}
