/**
 * Ramadan 2026 Festive Banner
 * Auto-expires after March 21, 2026
 */

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const RAMADAN_START = new Date("2026-02-17T00:00:00+08:00");
const RAMADAN_END = new Date("2026-03-21T23:59:59+08:00");
const DISMISS_KEY = "ramadan-2026-banner-dismissed";

function isRamadanPeriod(): boolean {
  const now = new Date();
  return now >= RAMADAN_START && now <= RAMADAN_END;
}

/** Crescent moon and star SVG */
function CrescentStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Crescent moon */}
      <circle cx="22" cy="24" r="14" fill="#FFD700" />
      <circle cx="28" cy="20" r="11" fill="#065F46" />
      {/* Star */}
      <polygon
        points="38,14 39.5,18.5 44,18.5 40.5,21.5 42,26 38,23 34,26 35.5,21.5 32,18.5 36.5,18.5"
        fill="#FFD700"
      />
    </svg>
  );
}

/** Pelita — traditional Malay clay oil lamp */
function Pelita({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 36 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="pelitaFlameGlow" cx="0.5" cy="1" r="0.8">
          <stop offset="0%" stopColor="#FF9500" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFD700" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pelitaClay" x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0%" stopColor="#D4863C" />
          <stop offset="60%" stopColor="#B5632A" />
          <stop offset="100%" stopColor="#8B4513" />
        </linearGradient>
      </defs>
      {/* Hanging string */}
      <line x1="18" y1="0" x2="18" y2="9" stroke="#FFD700" strokeWidth="1.2" />
      {/* Hanger ring */}
      <circle cx="18" cy="11" r="2.5" stroke="#DAA520" strokeWidth="1.2" fill="none" />
      {/* Flame ambient glow */}
      <ellipse cx="18" cy="16" rx="8" ry="10" fill="url(#pelitaFlameGlow)" />
      {/* Outer flame */}
      <path d="M18 8 Q23 13 22 17 Q21 21 18 22 Q15 21 14 17 Q13 13 18 8 Z" fill="#FF6B00" />
      {/* Inner flame */}
      <path d="M18 11 Q21 14 20.5 17 Q20 19.5 18 20.5 Q16 19.5 15.5 17 Q15 14 18 11 Z" fill="#FFD700" />
      {/* Wick */}
      <line x1="18" y1="21" x2="18" y2="25" stroke="#7B5535" strokeWidth="1.5" />
      {/* Bowl rim */}
      <ellipse cx="18" cy="25" rx="10" ry="2.8" fill="#C8900A" />
      {/* Oil sheen */}
      <ellipse cx="18" cy="25" rx="9" ry="2" fill="#F5C842" opacity="0.4" />
      {/* Bowl body — terracotta clay */}
      <path d="M8 25 Q5.5 34 7.5 40 Q10 47 18 48 Q26 47 28.5 40 Q30.5 34 28 25 Z" fill="url(#pelitaClay)" />
      {/* Decorative gold band */}
      <path d="M9 36 Q13.5 39.5 18 39.5 Q22.5 39.5 27 36" stroke="#FFD700" strokeWidth="1" opacity="0.65" />
      {/* Traditional star motif */}
      <polygon
        points="18,28 19.1,31 22,31 19.8,32.8 20.6,35.5 18,33.8 15.4,35.5 16.2,32.8 14,31 16.9,31"
        fill="#FFD700"
        opacity="0.55"
      />
      {/* Bottom tip */}
      <path d="M12 48 Q14.5 52.5 18 53.5 Q21.5 52.5 24 48" fill="#7B3B10" />
      {/* Base */}
      <ellipse cx="18" cy="53.5" rx="5" ry="1.8" fill="#6B3210" />
    </svg>
  );
}

/** Twinkling star decoration */
function TwinkleStar({ delay, left, top, size = 6 }: { delay: number; left: string; top: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="ramadan-twinkle absolute pointer-events-none"
      style={{
        left,
        top,
        width: size,
        height: size,
        animationDelay: `${delay}s`,
      }}
      fill="#FFD700"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="12,2 14.5,9 22,9.5 16,14.5 18,22 12,17.5 6,22 8,14.5 2,9.5 9.5,9" />
    </svg>
  );
}

export function RamadanFestiveBanner() {
  const { language } = useLanguage();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISS_KEY) === "true";
    } catch {
      return false;
    }
  });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!dismissed && isRamadanPeriod()) {
      setVisible(true);
    }
  }, [dismissed]);

  const content = useMemo(
    () => ({
      en: {
        greeting: "Salam Ramadan Al-Mubarak",
        subtitle: "Selamat Berpuasa — wishing all Muslims a blessed Ramadan 1447H",
        wish: "May our worship and deeds be accepted in this holy month",
      },
      ms: {
        greeting: "Selamat Menyambut Ramadan",
        subtitle: "Selamat berpuasa kepada semua umat Islam — 1447H",
        wish: "Semoga amalan kita diterima dan diberkati Allah SWT",
      },
    }),
    []
  );

  if (!visible) return null;

  const t = content[language as keyof typeof content] || content.en;

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Ignore storage errors
    }
    setDismissed(true);
  };

  return (
    <div className="ramadan-banner relative overflow-hidden bg-gradient-to-r from-green-950 via-emerald-900 to-green-950 text-white border-b-2 border-yellow-400/70">
      {/* Songket-inspired diamond lattice background */}
      <div className="absolute inset-0 opacity-[0.55]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Cpath d='M12 0L24 12L12 24L0 12Z' fill='none' stroke='rgba(255,215,0,0.13)' stroke-width='0.5'/%3E%3Cpath d='M12 5L19 12L12 19L5 12Z' fill='none' stroke='rgba(255,215,0,0.07)' stroke-width='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* Twinkling stars */}
      <TwinkleStar delay={0} left="5%" top="15%" size={6} />
      <TwinkleStar delay={0.8} left="15%" top="5%" size={4} />
      <TwinkleStar delay={1.6} left="30%" top="20%" size={5} />
      <TwinkleStar delay={2.4} left="70%" top="8%" size={5} />
      <TwinkleStar delay={0.4} left="80%" top="18%" size={4} />
      <TwinkleStar delay={1.2} left="90%" top="6%" size={6} />
      <TwinkleStar delay={2.0} left="45%" top="5%" size={4} />
      <TwinkleStar delay={1.8} left="60%" top="22%" size={5} />

      <div className="relative flex items-center justify-center gap-3 px-4 py-3 max-w-7xl mx-auto">
        {/* Left pelita */}
        <Pelita className="ramadan-lantern-swing ramadan-pelita-glow h-14 w-9 hidden sm:block flex-shrink-0" />

        {/* Content */}
        <div className="text-center flex-1 min-w-0">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <CrescentStar className="ramadan-glow h-6 w-6 inline-block" />
            <span className="text-yellow-300 text-lg sm:text-xl font-bold tracking-wide">
              {t.greeting}
            </span>
            <CrescentStar className="ramadan-glow h-6 w-6 hidden sm:inline-block" />
          </div>
          <p className="text-emerald-100 text-xs sm:text-sm mt-0.5">
            {t.subtitle}
          </p>
          <p className="text-emerald-200/80 text-xs mt-0.5 hidden sm:block">
            {t.wish}
          </p>
        </div>

        {/* Right pelita */}
        <Pelita className="ramadan-lantern-swing ramadan-pelita-glow h-14 w-9 hidden sm:block flex-shrink-0" />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-1.5 right-2 p-1 rounded-full hover:bg-emerald-600/50 transition-colors text-emerald-200 hover:text-white"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Gold sparkle dots */}
      <div className="ramadan-sparkle absolute top-2 left-[20%] w-1 h-1 rounded-full bg-yellow-300" />
      <div
        className="ramadan-sparkle absolute top-4 right-[25%] w-1.5 h-1.5 rounded-full bg-yellow-200"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="ramadan-sparkle absolute bottom-2 left-[60%] w-1 h-1 rounded-full bg-yellow-400"
        style={{ animationDelay: "2s" }}
      />
    </div>
  );
}
