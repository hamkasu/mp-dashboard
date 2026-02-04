/**
 * Copyright by Calmic Sdn Bhd
 *
 * Donation Prompt Component
 *
 * A banner that encourages users to support the MyParliament Dashboard
 * by showing a QR code for DuitNow donations.
 */

import { useState } from "react";
import { Coffee, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useLanguage } from "@/i18n/LanguageContext";

interface DonationPromptProps {
  className?: string;
}

export function DonationPrompt({ className }: DonationPromptProps) {
  const { language } = useLanguage();
  const [isDismissed, setIsDismissed] = useState(false);
  const [donateOpen, setDonateOpen] = useState(false);

  if (isDismissed) return null;

  const isMs = language === 'ms';

  const content = {
    en: {
      title: "Enjoying the MyParliament Dashboard? Buy Us a Kopi or Teh Tarik!",
      description: "This free tool runs on passion and a bit of caffeine—we keep it ad-free and updated with the latest MP attendance, votes, allowances, and more. If it's helpful for you, consider a small donation to cover hosting and data costs. Terima kasih!",
      buttonText: "Buy Me a Coffee",
      modalTitle: "Support MyParliament Dashboard",
      modalDescription: "Scan the QR code below to make a donation via DuitNow",
      thankYou: "Thank you for your support!"
    },
    ms: {
      title: "Suka dengan MyParliament Dashboard? Belanja Kami Kopi atau Teh Tarik!",
      description: "Alat percuma ini berjalan dengan semangat dan sedikit kafein—kami kekalkannya tanpa iklan dan dikemas kini dengan kehadiran MP, undian, elaun, dan banyak lagi. Jika ia membantu anda, pertimbangkan sumbangan kecil untuk menampung kos pengehosan dan data. Terima kasih!",
      buttonText: "Belanja Kopi",
      modalTitle: "Sokong Papan Pemuka MyParliament",
      modalDescription: "Imbas kod QR di bawah untuk membuat sumbangan melalui DuitNow",
      thankYou: "Terima kasih atas sokongan anda!"
    }
  };

  const currentContent = content[isMs ? 'ms' : 'en'];

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-lg border border-amber-200/50 dark:border-amber-900/30 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 dark:from-amber-950/20 dark:via-yellow-950/10 dark:to-orange-950/10 p-4 md:p-6 ${className}`}
        data-testid="donation-prompt"
        role="region"
        aria-label={isMs ? "Prompt Sumbangan" : "Donation Prompt"}
      >
        {/* Dismiss button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors z-10"
          aria-label={isMs ? "Tutup" : "Dismiss"}
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex flex-col items-center text-center gap-3">
          {/* Title */}
          <div className="flex items-center gap-2">
            <Coffee className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <h3 className="text-base md:text-lg font-semibold text-amber-900 dark:text-amber-100">
              {currentContent.title}
            </h3>
            <span className="text-xl" aria-hidden="true">☕</span>
          </div>

          {/* Description */}
          <p className="text-sm text-amber-800/80 dark:text-amber-200/80 max-w-2xl leading-relaxed">
            {currentContent.description}
            <span className="font-medium"> MY</span>
          </p>

          {/* Button */}
          <Button
            onClick={() => setDonateOpen(true)}
            className="mt-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md shadow-amber-500/20 gap-2"
            size="sm"
          >
            <Coffee className="h-4 w-4" />
            {currentContent.buttonText}
          </Button>
        </div>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
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
    </>
  );
}
