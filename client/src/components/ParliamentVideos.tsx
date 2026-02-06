/**
 * Copyright by Calmic Sdn Bhd
 *
 * Parliament Videos Component
 *
 * Displays official Dewan Rakyat parliament videos from the PARLIMEN MALAYSIA YouTube channel.
 * Uses privacy-enhanced mode (youtube-nocookie.com) for embedding.
 *
 * To update video data:
 * 1. Edit the VIDEOS_DATA array below with new YouTube video IDs
 * 2. Update LAST_UPDATED when making changes
 * 3. Videos are sourced from https://www.youtube.com/@PARLIMENMALAYSIA1
 */

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  Play,
  ExternalLink,
  Radio,
  ListVideo,
  ChevronLeft,
  ChevronRight,
  Youtube,
} from "lucide-react";

const LAST_UPDATED = "February 2026";

const CHANNEL_URL = "https://www.youtube.com/@PARLIMENMALAYSIA1";
const DEWAN_RAKYAT_PLAYLIST = "https://www.youtube.com/playlist?list=PLxiPX8J3gm-ch1Kg70LSif9fGZrVpUq4M";

interface VideoItem {
  id: string;
  videoId: string;
  titleEn: string;
  titleMs: string;
  date: string;
  isLive?: boolean;
}

// ============================================================================
// VIDEO DATA - Edit this section to update videos
// Videos from official PARLIMEN MALAYSIA YouTube channel
// ============================================================================
const VIDEOS_DATA: VideoItem[] = [
  {
    id: "dr-2026-02-05",
    videoId: "kIWLdsg2fig",
    titleEn: "LIVE: Dewan Rakyat Session | First Meeting, Fifth Term | 5 February 2026",
    titleMs: "LANGSUNG: Persidangan Dewan Rakyat | Mesyuarat Pertama Penggal Kelima | 05 Februari 2026",
    date: "2026-02-05",
    isLive: false,
  },
  {
    id: "dr-2026-02-04",
    videoId: "qpFHnMaud9k",
    titleEn: "LIVE: Dewan Rakyat Session | First Meeting, Fifth Term | 4 February 2026",
    titleMs: "LANGSUNG: Persidangan Dewan Rakyat | Mesyuarat Pertama Penggal Kelima | 04 Februari 2026",
    date: "2026-02-04",
    isLive: false,
  },
  {
    id: "dr-2026-02-03",
    videoId: "i1Ai-oU1pHE",
    titleEn: "LIVE: Dewan Rakyat Session | First Meeting, Fifth Term | 3 February 2026",
    titleMs: "LANGSUNG: Persidangan Dewan Rakyat | Mesyuarat Pertama Penggal Kelima | 03 Februari 2026",
    date: "2026-02-03",
    isLive: false,
  },
  {
    id: "dr-oath-2026-01-20",
    videoId: "cRs-dHhxh50",
    titleEn: "Opening of Fifth Session, 15th Parliament | Royal Address | 20 January 2026",
    titleMs: "Istiadat Pembukaan Penggal Kelima, Parlimen ke-15 | Titah Diraja | 20 Januari 2026",
    date: "2026-01-20",
  },
  {
    id: "dr-2025-12-19",
    videoId: "GRt0p3jq8TY",
    titleEn: "Dewan Rakyat Session | Fourth Term | 19 December 2025",
    titleMs: "Persidangan Dewan Rakyat | Penggal Keempat | 19 Disember 2025",
    date: "2025-12-19",
  },
];

export function ParliamentVideos() {
  const { t, language } = useLanguage();
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);

  const activeVideo = VIDEOS_DATA[activeVideoIndex];
  const hasLive = VIDEOS_DATA.some((v) => v.isLive);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === "ms" ? "ms-MY" : "en-MY", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <Card className="overflow-hidden border-red-200/50 dark:border-red-900/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Youtube className="h-5 w-5 text-red-600" />
            {t("parliamentVideos.title")}
          </CardTitle>
          <div className="flex items-center gap-2">
            {hasLive && (
              <Badge variant="destructive" className="gap-1 animate-pulse">
                <Radio className="h-3 w-3" />
                {t("parliamentVideos.live")}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {t("parliamentVideos.lastUpdated")}: {LAST_UPDATED}
            </Badge>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("parliamentVideos.subtitle")}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Video Player */}
        <figure className="relative">
          <div className="relative w-full rounded-lg overflow-hidden bg-black aspect-video">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${activeVideo.videoId}?rel=0&modestbranding=1`}
              title={language === "ms" ? activeVideo.titleMs : activeVideo.titleEn}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
              loading="lazy"
              aria-label={`${t("parliamentVideos.videoAriaLabel")}: ${language === "ms" ? activeVideo.titleMs : activeVideo.titleEn}`}
            />
          </div>
          <figcaption className="mt-2 space-y-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-tight">
                {language === "ms" ? activeVideo.titleMs : activeVideo.titleEn}
              </h3>
              {activeVideo.isLive && (
                <Badge variant="destructive" className="shrink-0 gap-1 text-xs">
                  <Radio className="h-3 w-3" />
                  LIVE
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {formatDate(activeVideo.date)}
            </p>
          </figcaption>
        </figure>

        {/* Video Thumbnails Strip */}
        <div className="relative">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={() => setActiveVideoIndex((i) => Math.max(0, i - 1))}
              disabled={activeVideoIndex === 0}
              aria-label={t("common.previous")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex-1 overflow-x-auto no-scrollbar">
              <div className="flex gap-2">
                {VIDEOS_DATA.map((video, index) => (
                  <button
                    key={video.id}
                    onClick={() => setActiveVideoIndex(index)}
                    className={`shrink-0 w-28 sm:w-32 rounded-md overflow-hidden border-2 transition-all hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      index === activeVideoIndex
                        ? "border-primary ring-1 ring-primary/30"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                    aria-label={`${t("parliamentVideos.selectVideo")}: ${language === "ms" ? video.titleMs : video.titleEn}`}
                    aria-pressed={index === activeVideoIndex}
                  >
                    <div className="relative aspect-video bg-muted">
                      <img
                        src={`https://img.youtube.com/vi/${video.videoId}/mqdefault.jpg`}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {video.isLive && (
                        <div className="absolute top-1 left-1">
                          <Badge variant="destructive" className="text-[10px] px-1 py-0 gap-0.5">
                            <Radio className="h-2 w-2" />
                            LIVE
                          </Badge>
                        </div>
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Play className="h-5 w-5 text-white drop-shadow-lg" />
                      </div>
                    </div>
                    <div className="p-1.5 bg-background">
                      <p className="text-[10px] leading-tight text-muted-foreground line-clamp-2">
                        {formatDate(video.date)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 h-8 w-8"
              onClick={() => setActiveVideoIndex((i) => Math.min(VIDEOS_DATA.length - 1, i + 1))}
              disabled={activeVideoIndex === VIDEOS_DATA.length - 1}
              aria-label={t("common.next")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Links */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            asChild
          >
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("parliamentVideos.watchAllAriaLabel")}
            >
              <Youtube className="h-3.5 w-3.5 text-red-600" />
              {t("parliamentVideos.watchAll")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            asChild
          >
            <a
              href={DEWAN_RAKYAT_PLAYLIST}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={t("parliamentVideos.fullPlaylistAriaLabel")}
            >
              <ListVideo className="h-3.5 w-3.5" />
              {t("parliamentVideos.fullPlaylist")}
              <ExternalLink className="h-3 w-3" />
            </a>
          </Button>
        </div>

        {/* Source Attribution */}
        <p className="text-[10px] text-muted-foreground border-t pt-2">
          {t("parliamentVideos.source")}
        </p>
      </CardContent>
    </Card>
  );
}
