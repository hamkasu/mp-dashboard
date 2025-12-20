/**
 * Copyright by Calmic Sdn Bhd
 */

import { useState } from "react";
import { Coffee } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

export function DonateButton() {
  const { language } = useLanguage();
  const [open, setOpen] = useState(false);

  const content = {
    en: {
      title: "Enjoying the MyParliament Dashboard? Buy Us a Kopi or Teh Tarik! ☕",
      subtitle: "This free tool runs on passion and a bit of caffeine—we keep it ad-free and updated with the latest MP attendance, votes, allowances, and more. If it's helpful for you, consider a small donation to cover hosting and data costs. Terima kasih! 🇲🇾",
      buttonText: "Buy Me a Coffee",
      modalTitle: "Support MyParliament Dashboard",
      modalDescription: "Scan the QR code below to make a donation via DuitNow",
      thankYou: "Thank you for your support!"
    },
    ms: {
      title: "Menikmati Papan Pemuka MyParliament? Belikan Kami Kopi atau Teh Tarik! ☕",
      subtitle: "Alat percuma ini dijalankan dengan semangat dan sedikit kafein—kami mengekalkannya tanpa iklan dan dikemas kini dengan kehadiran MP terkini, undi, elaun, dan banyak lagi. Jika ia membantu anda, pertimbangkan sumbangan kecil untuk menampung kos hosting dan data. Terima kasih! 🇲🇾",
      buttonText: "Belikan Saya Kopi",
      modalTitle: "Sokong Papan Pemuka MyParliament",
      modalDescription: "Imbas kod QR di bawah untuk membuat sumbangan melalui DuitNow",
      thankYou: "Terima kasih atas sokongan anda!"
    }
  };

  const currentContent = content[language as keyof typeof content] || content.en;

  return (
    <div className="w-full max-w-3xl mx-auto p-6 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg border border-amber-200 dark:border-amber-800 shadow-sm">
      <div className="text-center space-y-4">
        <h3 className="text-xl font-semibold text-amber-900 dark:text-amber-100 flex items-center justify-center gap-2">
          <Coffee className="h-6 w-6" />
          {currentContent.title}
        </h3>
        <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
          {currentContent.subtitle}
        </p>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-medium px-6 py-2 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            >
              <Coffee className="mr-2 h-4 w-4" />
              {currentContent.buttonText}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-center text-xl">
                {currentContent.modalTitle}
              </DialogTitle>
              <DialogDescription className="text-center">
                {currentContent.modalDescription}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center space-y-4 py-4">
              {/* QR Code Image */}
              <div className="bg-white p-4 rounded-lg shadow-md">
                <img
                  src="/duitnow-qr.png"
                  alt="DuitNow QR Code - CALMIC SDN. BHD."
                  className="w-[36rem] h-[36rem] object-contain"
                />
              </div>
              <p className="text-sm text-center text-muted-foreground font-medium">
                CALMIC SDN. BHD.
              </p>
              <p className="text-sm text-center text-primary font-semibold">
                {currentContent.thankYou}
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
