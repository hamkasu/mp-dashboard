/**
 * Hari Raya Aidilfitri 2026 Festive Banner
 * Auto-expires after March 27, 2026
 */

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const RAYA_START = new Date("2026-03-21T00:00:00+08:00");
const RAYA_END = new Date("2026-03-27T23:59:59+08:00");
const DISMISS_KEY = "hari-raya-2026-banner-dismissed";

function isRayaPeriod(): boolean {
  const now = new Date();
  return now >= RAYA_START && now <= RAYA_END;
}

/** Ketupat — traditional Malay diamond-shaped rice dumpling */
function Ketupat({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 60" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ketupat-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#4ADE80" />
          <stop offset="50%" stopColor="#16A34A" />
          <stop offset="100%" stopColor="#15803D" />
        </linearGradient>
        <linearGradient id="ketupat-leaf2" x1="1" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22C55E" />
          <stop offset="100%" stopColor="#14532D" />
        </linearGradient>
      </defs>
      {/* Hanging string */}
      <line x1="24" y1="0" x2="24" y2="8" stroke="#FFD700" strokeWidth="1.2" />
      {/* Woven diamond body — ketupat shape */}
      <polygon points="24,10 40,24 24,38 8,24" fill="url(#ketupat-leaf)" />
      {/* Woven cross pattern */}
      <line x1="8" y1="24" x2="40" y2="24" stroke="#FFD700" strokeWidth="0.7" opacity="0.5" />
      <line x1="24" y1="10" x2="24" y2="38" stroke="#FFD700" strokeWidth="0.7" opacity="0.5" />
      <line x1="12" y1="16" x2="36" y2="32" stroke="#BBF7D0" strokeWidth="0.5" opacity="0.4" />
      <line x1="36" y1="16" x2="12" y2="32" stroke="#BBF7D0" strokeWidth="0.5" opacity="0.4" />
      {/* Highlight */}
      <polygon points="24,12 38,24 24,36 10,24" fill="none" stroke="#4ADE80" strokeWidth="0.8" opacity="0.5" />
      {/* Leaf tails */}
      <path d="M24 38 Q20 45 18 52" stroke="url(#ketupat-leaf2)" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 38 Q28 45 30 52" stroke="url(#ketupat-leaf2)" strokeWidth="2" strokeLinecap="round" />
      <path d="M18 52 Q24 56 30 52" stroke="#15803D" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/** Crescent moon and star */
function CrescentStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="22" cy="24" r="14" fill="#FFD700" />
      <circle cx="28" cy="20" r="11" fill="#14532D" />
      <polygon
        points="38,14 39.5,18.5 44,18.5 40.5,21.5 42,26 38,23 34,26 35.5,21.5 32,18.5 36.5,18.5"
        fill="#FFD700"
      />
    </svg>
  );
}

/** Firework burst decoration */
function Firework({ className, color = "#FFD700" }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
        <line
          key={i}
          x1="16"
          y1="16"
          x2={16 + 12 * Math.cos((angle * Math.PI) / 180)}
          y2={16 + 12 * Math.sin((angle * Math.PI) / 180)}
          stroke={color}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      ))}
      <circle cx="16" cy="16" r="2.5" fill={color} />
    </svg>
  );
}

/** Twinkling star */
function TwinkleStar({ delay, left, top, size = 6 }: { delay: number; left: string; top: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="raya-twinkle absolute pointer-events-none"
      style={{ left, top, width: size, height: size, animationDelay: `${delay}s` }}
      fill="#FFD700"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon points="12,2 14.5,9 22,9.5 16,14.5 18,22 12,17.5 6,22 8,14.5 2,9.5 9.5,9" />
    </svg>
  );
}

export function HariRayaBanner() {
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
    if (!dismissed && isRayaPeriod()) {
      setVisible(true);
    }
  }, [dismissed]);

  const content = useMemo(
    () => ({
      en: {
        greeting: "Selamat Hari Raya Aidilfitri",
        maaf: "Maaf Zahir & Batin",
        subtitle: "Wishing all Muslims a joyous Eid — 1 Syawal 1447H",
        wish: "May this blessed day bring peace, happiness, and forgiveness to all",
      },
      ms: {
        greeting: "Selamat Hari Raya Aidilfitri",
        maaf: "Maaf Zahir & Batin",
        subtitle: "Sempena 1 Syawal 1447H — Eid Mubarak kepada semua",
        wish: "Semoga Hari Raya ini membawa kegembiraan, kedamaian dan keberkatan",
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
    <div className="raya-banner relative overflow-hidden text-white border-b-2 border-yellow-400/80"
      style={{
        background: "linear-gradient(135deg, #14532D 0%, #166534 20%, #15803D 40%, #065F46 60%, #14532D 80%, #0F3D25 100%)",
      }}
    >
      {/* Songket gold lattice background */}
      <div className="absolute inset-0 opacity-40">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32'%3E%3Cpath d='M16 0L32 16L16 32L0 16Z' fill='none' stroke='rgba(255,215,0,0.18)' stroke-width='0.6'/%3E%3Cpath d='M16 6L26 16L16 26L6 16Z' fill='none' stroke='rgba(255,215,0,0.1)' stroke-width='0.4'/%3E%3Ccircle cx='16' cy='16' r='2' fill='none' stroke='rgba(255,215,0,0.08)' stroke-width='0.3'/%3E%3C/svg%3E")`,
            backgroundSize: "32px 32px",
          }}
        />
      </div>

      {/* Fireworks */}
      <Firework
        className="raya-firework absolute pointer-events-none"
        style={{ left: "8%", top: "10%", width: 20, height: 20, animationDelay: "0s" } as React.CSSProperties}
        color="#FFD700"
      />
      <Firework
        className="raya-firework absolute pointer-events-none"
        style={{ left: "92%", top: "8%", width: 18, height: 18, animationDelay: "1.2s" } as React.CSSProperties}
        color="#FCA5A5"
      />
      <Firework
        className="raya-firework absolute pointer-events-none hidden sm:block"
        style={{ left: "50%", top: "5%", width: 16, height: 16, animationDelay: "2.2s" } as React.CSSProperties}
        color="#86EFAC"
      />

      {/* Twinkling stars */}
      <TwinkleStar delay={0}   left="4%"  top="15%" size={5} />
      <TwinkleStar delay={0.7} left="13%" top="5%"  size={4} />
      <TwinkleStar delay={1.4} left="28%" top="22%" size={5} />
      <TwinkleStar delay={2.1} left="72%" top="6%"  size={5} />
      <TwinkleStar delay={0.3} left="82%" top="18%" size={4} />
      <TwinkleStar delay={1.0} left="91%" top="8%"  size={6} />
      <TwinkleStar delay={1.8} left="44%" top="4%"  size={4} />
      <TwinkleStar delay={2.5} left="60%" top="20%" size={5} />

      <div className="relative flex items-center justify-center gap-3 px-4 py-3 max-w-7xl mx-auto">
        {/* Left ketupat */}
        <Ketupat className="raya-ketupat-swing h-14 w-10 hidden sm:block flex-shrink-0" />

        {/* Content */}
        <div className="text-center flex-1 min-w-0">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <CrescentStar className="raya-crescent-glow h-6 w-6 inline-block" />
            <span className="text-yellow-300 text-lg sm:text-xl font-bold tracking-wide">
              {t.greeting}
            </span>
            <CrescentStar className="raya-crescent-glow h-6 w-6 hidden sm:inline-block" />
          </div>
          <p className="text-yellow-200 text-sm sm:text-base font-semibold mt-0.5 tracking-wider">
            {t.maaf}
          </p>
          <p className="text-green-100 text-xs sm:text-sm mt-0.5">
            {t.subtitle}
          </p>
          <p className="text-green-200/80 text-xs mt-0.5 hidden sm:block">
            {t.wish}
          </p>
        </div>

        {/* Right ketupat */}
        <Ketupat className="raya-ketupat-swing h-14 w-10 hidden sm:block flex-shrink-0" />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-1.5 right-2 p-1 rounded-full hover:bg-green-600/50 transition-colors text-green-200 hover:text-white"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Gold sparkle dots */}
      <div className="raya-sparkle absolute top-2 left-[20%] w-1 h-1 rounded-full bg-yellow-300" />
      <div
        className="raya-sparkle absolute top-4 right-[25%] w-1.5 h-1.5 rounded-full bg-yellow-200"
        style={{ animationDelay: "0.8s" }}
      />
      <div
        className="raya-sparkle absolute bottom-2 left-[55%] w-1 h-1 rounded-full bg-yellow-400"
        style={{ animationDelay: "1.6s" }}
      />
      <div
        className="raya-sparkle absolute bottom-1 left-[35%] w-1.5 h-1.5 rounded-full bg-green-300"
        style={{ animationDelay: "2.4s" }}
      />
    </div>
  );
}
