/**
 * Copyright by Calmic Sdn Bhd
 */

import { useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Eye, ArrowLeft, User } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useParams, useLocation } from "wouter";
import type { BlogPost as BlogPostType } from "@shared/schema";

export default function BlogPost() {
  const { t, language } = useLanguage();
  const { slug } = useParams<{ slug: string }>();
  const [, setLocation] = useLocation();

  const { data: post, isLoading, error } = useQuery<BlogPostType>({
    queryKey: ["/api/blog-posts/slug", slug],
    queryFn: async () => {
      const response = await fetch(`/api/blog-posts/slug/${slug}`);
      if (!response.ok) {
        throw new Error("Blog post not found");
      }
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
    enabled: !!slug,
  });

  const incrementViewMutation = useMutation({
    mutationFn: async (postId: string) => {
      return await apiRequest("POST", `/api/blog-posts/${postId}/view`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blog-posts/slug", slug] });
    },
  });

  useEffect(() => {
    if (post?.id) {
      incrementViewMutation.mutate(post.id);
    }
  }, [post?.id]);

  const formatDate = (dateValue: string | Date) => {
    const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue;
    return date.toLocaleDateString(language === 'ms' ? 'ms-MY' : 'en-GB', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleBack = () => {
    setLocation("/blog");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-4xl">
          <div className="space-y-6">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-12 w-full" />
            <div className="flex gap-4">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-[400px] w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-4xl">
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <h2 className="text-2xl font-bold">
                  {language === 'ms' ? 'Artikel Tidak Dijumpai' : 'Article Not Found'}
                </h2>
                <p className="text-muted-foreground">
                  {language === 'ms'
                    ? 'Maaf, artikel yang anda cari tidak wujud.'
                    : 'Sorry, the article you are looking for does not exist.'}
                </p>
                <Button onClick={handleBack} variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {language === 'ms' ? 'Kembali ke Blog' : 'Back to Blog'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-6 md:py-8 max-w-4xl">
        <article className="space-y-6">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-4"
            data-testid="button-back-to-blog"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === 'ms' ? 'Kembali ke Blog' : 'Back to Blog'}
          </Button>

          <Badge variant="secondary" className="w-fit" data-testid="blog-post-category">
            {post.category}
          </Badge>

          <h1 className="text-3xl md:text-4xl font-bold leading-tight" data-testid="blog-post-title">
            {post.title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            <div className="flex items-center gap-1.5">
              <User className="w-4 h-4" />
              <span data-testid="blog-post-author">{post.author}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span data-testid="blog-post-date">{formatDate(post.publishedAt)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              <span data-testid="blog-post-readtime">
                {post.readTime} {language === 'ms' ? 'minit membaca' : 'min read'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Eye className="w-4 h-4" />
              <span data-testid="blog-post-views">
                {post.views || 0} {language === 'ms' ? 'pembaca' : 'readers'}
              </span>
            </div>
          </div>

          {post.imageUrl && (
            <div className="rounded-lg overflow-hidden">
              <img
                src={post.imageUrl}
                alt={post.title}
                className="w-full h-auto object-cover"
                data-testid="blog-post-image"
              />
            </div>
          )}

          <Card>
            <CardContent className="py-6">
              <p className="text-lg text-muted-foreground italic mb-6" data-testid="blog-post-excerpt">
                {post.excerpt}
              </p>
              <div
                className="prose prose-lg dark:prose-invert max-w-none"
                data-testid="blog-post-content"
                dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }}
              />
            </CardContent>
          </Card>

          <div className="pt-6 border-t">
            <Button
              variant="outline"
              onClick={handleBack}
              data-testid="button-back-to-blog-bottom"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {language === 'ms' ? 'Kembali ke Blog' : 'Back to Blog'}
            </Button>
          </div>
        </article>
      </main>
    </div>
  );
}
