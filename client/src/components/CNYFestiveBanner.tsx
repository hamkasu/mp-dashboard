/**
 * Chinese New Year 2026 Festive Banner
 * Year of the Horse - Auto-expires after Feb 24, 2026
 */

import { useState, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

const CNY_START = new Date("2026-02-14T00:00:00+08:00");
const CNY_END = new Date("2026-02-24T23:59:59+08:00");
const DISMISS_KEY = "cny-2026-banner-dismissed";

function isCNYPeriod(): boolean {
  const now = new Date();
  return now >= CNY_START && now <= CNY_END;
}

function Lantern({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 60"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* String */}
      <line x1="20" y1="0" x2="20" y2="12" stroke="#FFD700" strokeWidth="1.5" />
      {/* Top cap */}
      <rect x="14" y="11" width="12" height="4" rx="1" fill="#FFD700" />
      {/* Lantern body */}
      <ellipse cx="20" cy="32" rx="14" ry="18" fill="#DC2626" />
      <ellipse cx="20" cy="32" rx="14" ry="18" fill="url(#lanternGlow)" />
      {/* Center band */}
      <rect x="6" y="29" width="28" height="6" rx="1" fill="#FFD700" opacity="0.8" />
      {/* Fu character placeholder - simple decorative lines */}
      <text
        x="20"
        y="35"
        textAnchor="middle"
        fontSize="10"
        fill="#FFD700"
        fontWeight="bold"
      >
        福
      </text>
      {/* Bottom cap */}
      <rect x="14" y="49" width="12" height="4" rx="1" fill="#FFD700" />
      {/* Tassel */}
      <line x1="17" y1="53" x2="15" y2="59" stroke="#FFD700" strokeWidth="1.5" />
      <line x1="20" y1="53" x2="20" y2="60" stroke="#FFD700" strokeWidth="1.5" />
      <line x1="23" y1="53" x2="25" y2="59" stroke="#FFD700" strokeWidth="1.5" />
      <defs>
        <radialGradient id="lanternGlow" cx="0.4" cy="0.35" r="0.6">
          <stop offset="0%" stopColor="#FCA5A5" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#DC2626" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

function FireworkBurst({ delay, left, top }: { delay: number; left: string; top: string }) {
  return (
    <div
      className="cny-firework absolute pointer-events-none"
      style={{
        left,
        top,
        animationDelay: `${delay}s`,
      }}
    >
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="cny-firework-particle absolute"
          style={{
            transform: `rotate(${i * 45}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function CNYFestiveBanner() {
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
    if (!dismissed && isCNYPeriod()) {
      setVisible(true);
    }
  }, [dismissed]);

  const content = useMemo(
    () => ({
      en: {
        greeting: "Gong Xi Fa Cai!",
        subtitle: "Happy Chinese New Year 2026 - Year of the Horse",
        wish: "Wishing all Malaysians prosperity and harmony",
      },
      ms: {
        greeting: "Gong Xi Fa Cai!",
        subtitle: "Selamat Tahun Baru Cina 2026 - Tahun Kuda",
        wish: "Mengucapkan kemakmuran dan keharmonian kepada semua rakyat Malaysia",
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
    <div className="cny-banner relative overflow-hidden bg-gradient-to-r from-red-700 via-red-600 to-red-700 text-white border-b-2 border-yellow-500">
      {/* Background decorative pattern */}
      <div className="absolute inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 20px,
              rgba(255,215,0,0.15) 20px,
              rgba(255,215,0,0.15) 22px
            )`,
          }}
        />
      </div>

      {/* Fireworks */}
      <FireworkBurst delay={0} left="10%" top="10%" />
      <FireworkBurst delay={1.5} left="85%" top="5%" />
      <FireworkBurst delay={3} left="50%" top="8%" />

      <div className="relative flex items-center justify-center gap-3 px-4 py-3 max-w-7xl mx-auto">
        {/* Left lantern */}
        <Lantern className="cny-lantern-swing h-12 w-8 hidden sm:block flex-shrink-0" />

        {/* Content */}
        <div className="text-center flex-1 min-w-0">
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-yellow-300 text-lg sm:text-xl font-bold tracking-wide">
              {t.greeting}
            </span>
            <span className="text-yellow-200 text-lg hidden sm:inline">
              🐴
            </span>
          </div>
          <p className="text-red-100 text-xs sm:text-sm mt-0.5">
            {t.subtitle}
          </p>
          <p className="text-red-200/80 text-xs mt-0.5 hidden sm:block">
            {t.wish}
          </p>
        </div>

        {/* Right lantern */}
        <Lantern className="cny-lantern-swing h-12 w-8 hidden sm:block flex-shrink-0" />

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="absolute top-1.5 right-2 p-1 rounded-full hover:bg-red-500/50 transition-colors text-red-200 hover:text-white"
          aria-label="Dismiss banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Gold sparkle dots */}
      <div className="cny-sparkle absolute top-2 left-[20%] w-1 h-1 rounded-full bg-yellow-300" />
      <div
        className="cny-sparkle absolute top-4 right-[25%] w-1.5 h-1.5 rounded-full bg-yellow-200"
        style={{ animationDelay: "1s" }}
      />
      <div
        className="cny-sparkle absolute bottom-2 left-[60%] w-1 h-1 rounded-full bg-yellow-400"
        style={{ animationDelay: "2s" }}
      />
    </div>
  );
}
