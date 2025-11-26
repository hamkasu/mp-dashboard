/**
 * Copyright by Calmic Sdn Bhd
 */

import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Newspaper, Calendar, Clock, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";
import type { BlogPost } from "@shared/schema";

export default function Blog() {
  const { t, language } = useLanguage();

  const { data: blogPosts, isLoading } = useQuery<BlogPost[]>({
    queryKey: ["/api/blog-posts"],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-7xl">
        <div className="space-y-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Newspaper className="w-8 h-8 text-primary" />
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-blog-title">
                {t('nav.blog')}
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              {language === 'ms'
                ? 'Artikel, panduan, dan analisis tentang Parlimen Malaysia'
                : 'Articles, guides, and analysis about the Malaysian Parliament'}
            </p>
          </div>

          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="flex flex-col">
                  <CardHeader>
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-8 w-full" />
                      <Skeleton className="h-16 w-full" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : !blogPosts || blogPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <div className="text-center space-y-4">
                  <Newspaper className="w-16 h-16 mx-auto text-muted-foreground opacity-50" />
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      {language === 'ms' ? 'Tiada Artikel Lagi' : 'No Articles Yet'}
                    </h3>
                    <p className="text-muted-foreground">
                      {language === 'ms'
                        ? 'Artikel blog akan dipaparkan di sini tidak lama lagi.'
                        : 'Blog articles will be published here soon.'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {blogPosts.map((post) => (
                <Card key={post.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="space-y-3">
                      <Badge variant="secondary" className="w-fit">
                        {post.category}
                      </Badge>
                      <CardTitle className="text-xl leading-tight" data-testid={`blog-post-title-${post.id}`}>
                        {language === 'ms' ? post.titleMs : post.titleEn}
                      </CardTitle>
                      <CardDescription className="line-clamp-3" data-testid={`blog-post-excerpt-${post.id}`}>
                        {language === 'ms' ? post.excerptMs : post.excerptEn}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span data-testid={`blog-post-date-${post.id}`}>{formatDate(post.publishedAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4" />
                        <span data-testid={`blog-post-readtime-${post.id}`}>
                          {post.readTime} {language === 'ms' ? 'min' : 'min read'}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full justify-between group"
                      data-testid={`blog-post-read-${post.id}`}
                    >
                      <span>{language === 'ms' ? 'Baca Artikel' : 'Read Article'}</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
