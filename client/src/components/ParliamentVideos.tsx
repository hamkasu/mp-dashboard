/**
 * Copyright by Calmic Sdn Bhd
 *
 * Parliament Videos Component
 *
 * Links to official Dewan Rakyat parliament videos from the PARLIMEN MALAYSIA YouTube channel.
 * YouTube blocks iframe embedding (X-Frame-Options: SAMEORIGIN), so all links open YouTube
 * directly in a new tab.
 *
 * Source channel: https://www.youtube.com/@PARLIMENMALAYSIA1
 * Dewan Rakyat playlist: https://www.youtube.com/playlist?list=PLxiPX8J3gm-ch1Kg70LSif9fGZrVpUq4M
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/i18n/LanguageContext";
import {
  ExternalLink,
  ListVideo,
  Youtube,
} from "lucide-react";

const CHANNEL_URL = "https://www.youtube.com/@PARLIMENMALAYSIA1";
const DEWAN_RAKYAT_PLAYLIST_ID = "PLxiPX8J3gm-ch1Kg70LSif9fGZrVpUq4M";
const DEWAN_RAKYAT_PLAYLIST_URL = `https://www.youtube.com/playlist?list=${DEWAN_RAKYAT_PLAYLIST_ID}`;

interface PlaylistLink {
  id: string;
  playlistId: string;
  titleEn: string;
  titleMs: string;
  countLabel: string;
}

// ============================================================================
// PLAYLIST DATA - Edit this section to add/remove featured playlists
// ============================================================================
const PLAYLISTS: PlaylistLink[] = [
  {
    id: "dewan-rakyat",
    playlistId: "PLxiPX8J3gm-ch1Kg70LSif9fGZrVpUq4M",
    titleEn: "Dewan Rakyat Sessions",
    titleMs: "Sesi Dewan Rakyat",
    countLabel: "929+",
  },
  {
    id: "dewan-negara",
    playlistId: "PLxiPX8J3gm-e85RFD5qFoJPe36MJhfrep",
    titleEn: "Dewan Negara Sessions",
    titleMs: "Sesi Dewan Negara",
    countLabel: "300+",
  },
  {
    id: "sidang-media",
    playlistId: "PLxiPX8J3gm-fKhyF0hUBANoFRAFRDkUa1",
    titleEn: "Media Sessions (DR & DN)",
    titleMs: "Sidang Media (DR & DN)",
    countLabel: "200+",
  },
  {
    id: "kamar-khas",
    playlistId: "PLxiPX8J3gm-edN3c7jPMFOB6MzPNm7hAb",
    titleEn: "Kamar Khas (Special Chamber)",
    titleMs: "Kamar Khas",
    countLabel: "100+",
  },
];

export function ParliamentVideos() {
  const { t, language } = useLanguage();

  return (
    <Card className="overflow-hidden border-red-200/50 dark:border-red-900/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Youtube className="h-5 w-5 text-red-600" />
            {t("parliamentVideos.title")}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            2,700+ {t("parliamentVideos.videos")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("parliamentVideos.subtitle")}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Playlists Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {PLAYLISTS.map((playlist) => (
            <a
              key={playlist.id}
              href={`https://www.youtube.com/playlist?list=${playlist.playlistId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 rounded-md border p-3 hover:bg-accent/50 transition-colors group"
              aria-label={language === "ms" ? playlist.titleMs : playlist.titleEn}
            >
              <div className="shrink-0 rounded-md bg-red-100 dark:bg-red-950/50 p-2 text-red-600 group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                <ListVideo className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight truncate">
                  {language === "ms" ? playlist.titleMs : playlist.titleEn}
                </p>
                <p className="text-xs text-muted-foreground">
                  {playlist.countLabel} {t("parliamentVideos.videos")}
                </p>
              </div>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </a>
          ))}
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
              href={DEWAN_RAKYAT_PLAYLIST_URL}
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
