/**
 * Copyright by Calmic Sdn Bhd
 *
 * Parliament Videos Component
 *
 * Displays official Dewan Rakyat parliament videos from the PARLIMEN MALAYSIA YouTube channel.
 * Uses privacy-enhanced mode (youtube-nocookie.com) for embedding.
 * Embeds the official Dewan Rakyat playlist which auto-shows latest session videos.
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

export function ParliamentVideos() {
  const { t } = useLanguage();

  return (
    <Card className="overflow-hidden border-red-200/50 dark:border-red-900/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Youtube className="h-5 w-5 text-red-600" />
            {t("parliamentVideos.title")}
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            929+ {t("parliamentVideos.videos")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("parliamentVideos.subtitle")}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Embedded Playlist Player - auto-shows latest videos from official playlist */}
        <section aria-label={t("parliamentVideos.title")}>
          <figure>
            <div className="relative w-full rounded-lg overflow-hidden bg-black aspect-video">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/videoseries?list=${DEWAN_RAKYAT_PLAYLIST_ID}&rel=0&modestbranding=1`}
                title={t("parliamentVideos.playlistEmbedTitle")}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
                loading="lazy"
                aria-label={t("parliamentVideos.videoAriaLabel")}
              />
            </div>
            <figcaption className="mt-2 text-xs text-muted-foreground">
              {t("parliamentVideos.playlistCaption")}
            </figcaption>
          </figure>
        </section>

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
