/**
 * Copyright by Calmic Sdn Bhd
 */

import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Newspaper, Calendar, Clock, ArrowRight } from "lucide-react";
import { useLanguage } from "@/i18n/LanguageContext";

interface BlogPost {
  id: string;
  title: {
    en: string;
    ms: string;
  };
  excerpt: {
    en: string;
    ms: string;
  };
  date: string;
  readTime: number;
  category: string;
  author: string;
}

// Sample blog posts - to be replaced with actual data from backend
const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: {
      en: "Understanding Parliamentary Procedures",
      ms: "Memahami Prosedur Parlimen"
    },
    excerpt: {
      en: "Learn about the key procedures and protocols that govern how the Malaysian Parliament operates on a daily basis.",
      ms: "Ketahui tentang prosedur dan protokol utama yang mengawal operasi harian Parlimen Malaysia."
    },
    date: "2025-01-15",
    readTime: 5,
    category: "Parliament Guide",
    author: "Editorial Team"
  },
  {
    id: "2",
    title: {
      en: "The Role of MPs in Budget Approval",
      ms: "Peranan Ahli Parlimen dalam Kelulusan Bajet"
    },
    excerpt: {
      en: "Discover how Members of Parliament participate in the budget approval process and hold the government accountable for public spending.",
      ms: "Temui bagaimana Ahli Parlimen mengambil bahagian dalam proses kelulusan bajet dan mempertanggungjawabkan kerajaan terhadap perbelanjaan awam."
    },
    date: "2025-01-10",
    readTime: 7,
    category: "Analysis",
    author: "Editorial Team"
  },
  {
    id: "3",
    title: {
      en: "How to Contact Your MP",
      ms: "Cara Menghubungi Ahli Parlimen Anda"
    },
    excerpt: {
      en: "A practical guide on how constituents can effectively reach out to their representatives and make their voices heard.",
      ms: "Panduan praktikal tentang cara pengundi boleh menghubungi wakil mereka dengan berkesan dan menyuarakan pendapat mereka."
    },
    date: "2025-01-05",
    readTime: 4,
    category: "Civic Engagement",
    author: "Editorial Team"
  }
];

export default function Blog() {
  const { t, language } = useLanguage();

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

          {blogPosts.length === 0 ? (
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
                        {language === 'ms' ? post.title.ms : post.title.en}
                      </CardTitle>
                      <CardDescription className="line-clamp-3" data-testid={`blog-post-excerpt-${post.id}`}>
                        {language === 'ms' ? post.excerpt.ms : post.excerpt.en}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-end space-y-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-4 h-4" />
                        <span data-testid={`blog-post-date-${post.id}`}>{formatDate(post.date)}</span>
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
