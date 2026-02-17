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

/** Fanous (Ramadan lantern) SVG */
function Fanous({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 36 60"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Hanging string */}
      <line x1="18" y1="0" x2="18" y2="10" stroke="#FFD700" strokeWidth="1.5" />
      {/* Top cap */}
      <path d="M12 10 L24 10 L22 14 L14 14 Z" fill="#FFD700" />
      {/* Lantern body - ornate shape */}
      <path
        d="M14 14 Q8 24 8 32 Q8 40 14 46 L22 46 Q28 40 28 32 Q28 24 22 14 Z"
        fill="#065F46"
      />
      <path
        d="M14 14 Q8 24 8 32 Q8 40 14 46 L22 46 Q28 40 28 32 Q28 24 22 14 Z"
        fill="url(#fanousGlow)"
      />
      {/* Decorative bands */}
      <line x1="9" y1="24" x2="27" y2="24" stroke="#FFD700" strokeWidth="1" opacity="0.7" />
      <line x1="8.5" y1="32" x2="27.5" y2="32" stroke="#FFD700" strokeWidth="1" opacity="0.7" />
      <line x1="9" y1="40" x2="27" y2="40" stroke="#FFD700" strokeWidth="1" opacity="0.7" />
      {/* Center star motif */}
      <polygon
        points="18,28 19.2,31 22,31 19.8,33 20.5,36 18,34 15.5,36 16.2,33 14,31 16.8,31"
        fill="#FFD700"
        opacity="0.9"
      />
      {/* Bottom cap */}
      <path d="M14 46 L22 46 L20 50 L16 50 Z" fill="#FFD700" />
      {/* Tassel */}
      <line x1="16.5" y1="50" x2="15" y2="57" stroke="#FFD700" strokeWidth="1.2" />
      <line x1="18" y1="50" x2="18" y2="58" stroke="#FFD700" strokeWidth="1.2" />
      <line x1="19.5" y1="50" x2="21" y2="57" stroke="#FFD700" strokeWidth="1.2" />
      <defs>
        <radialGradient id="fanousGlow" cx="0.5" cy="0.4" r="0.5">
          <stop offset="0%" stopColor="#34D399" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#065F46" stopOpacity="0" />
        </radialGradient>
      </defs>
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
        greeting: "Ramadan Mubarak!",
        subtitle: "Wishing all Muslims a blessed Ramadan 1447H",
        wish: "May this holy month bring peace, reflection, and blessings to all",
      },
      ms: {
        greeting: "Ramadan Mubarak!",
        subtitle: "Selamat menyambut Ramadan 1447H",
        wish: "Semoga bulan mulia ini membawa keamanan, refleksi, dan keberkatan kepada semua",
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
    <div className="ramadan-banner relative overflow-hidden bg-gradient-to-r from-emerald-900 via-emerald-800 to-emerald-900 text-white border-b-2 border-yellow-500/60">
      {/* Background geometric pattern */}
      <div className="absolute inset-0 opacity-[0.07]">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-conic-gradient(
              rgba(255,215,0,0.3) 0deg 30deg,
              transparent 30deg 60deg
            )`,
            backgroundSize: "40px 40px",
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
        {/* Left fanous */}
        <Fanous className="ramadan-lantern-swing h-14 w-9 hidden sm:block flex-shrink-0" />

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

        {/* Right fanous */}
        <Fanous className="ramadan-lantern-swing h-14 w-9 hidden sm:block flex-shrink-0" />

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
