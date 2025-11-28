/**
 * Copyright by Calmic Sdn Bhd
 */

import { Search, Menu, Home, FileText, BookOpen, UserCheck, Calculator, BarChart3, ExternalLink, ChevronDown, AlertCircle, GraduationCap, TrendingUp, Scale, Shield, MessageSquare, Newspaper, Edit, Gavel } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";
import { useQuery } from "@tanstack/react-query";

interface HeaderProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();

  // Check admin authentication
  const { data: authStatus } = useQuery<{ isAdmin: boolean }>({
    queryKey: ["/api/admin/auth-status"],
    retry: false,
  });

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-16 md:h-20 items-center gap-4 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        {onMenuClick && (
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={onMenuClick}
            data-testid="button-menu-toggle"
          >
            <Menu className="h-5 w-5" />
          </Button>
        )}
        
        <Link href="/">
          <div className="flex items-center gap-3 cursor-pointer hover-elevate px-2 py-1 rounded-md">
            <div className="h-12 w-12 md:h-14 md:w-14 rounded-md bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg md:text-xl">MY</span>
            </div>
            <div className="flex flex-col">
              <h1 className="text-base md:text-lg font-bold tracking-tight">
                {t('nav.malayParliament')}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                {t('nav.dewanRakyatDashboard')}
              </p>
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-2 ml-4">
          <Link href="/">
            <Button
              variant={location === "/" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-home"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              <span>{t('nav.mps')}</span>
            </Button>
          </Link>
          <Link href="/hansard">
            <Button
              variant={location === "/hansard" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-hansard"
              className="gap-2"
            >
              <BookOpen className="w-4 h-4" />
              <span>{t('nav.hansard')}</span>
            </Button>
          </Link>
          <Link href="/parliament-guide">
            <Button
              variant={location === "/parliament-guide" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-parliament-guide"
              className="gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span>{t('nav.parliamentGuide')}</span>
            </Button>
          </Link>
          <Link href="/constitution">
            <Button
              variant={location === "/constitution" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-constitution"
              className="gap-2"
            >
              <Scale className="w-4 h-4" />
              <span>{t('nav.constitution')}</span>
            </Button>
          </Link>
          <Link href="/fundamental-rights">
            <Button
              variant={location === "/fundamental-rights" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-fundamental-rights"
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>{t('nav.fundamentalRights')}</span>
            </Button>
          </Link>
          <Link href="/courts">
            <Button
              variant={location === "/courts" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-courts"
              className="gap-2"
            >
              <Gavel className="w-4 h-4" />
              <span>{t('nav.courts')}</span>
            </Button>
          </Link>
          <Link href="/blog">
            <Button
              variant={location === "/blog" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-blog"
              className="gap-2"
            >
              <Newspaper className="w-4 h-4" />
              <span>{t('nav.blog')}</span>
            </Button>
          </Link>
          {authStatus?.isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={location === "/hansard-admin" || location === "/blog-admin" || location === "/court-cases-admin" ? "secondary" : "ghost"}
                  size="sm"
                  data-testid="nav-admin-dropdown"
                  className="gap-2"
                >
                  <Shield className="w-4 h-4" />
                  <span>{t('nav.admin')}</span>
                  <ChevronDown className="w-3 h-3 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem
                  onSelect={() => setLocation("/hansard-admin")}
                  data-testid="nav-hansard-admin"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span>Hansard Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setLocation("/blog-admin")}
                  data-testid="nav-blog-admin"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  <span>Blog Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onSelect={() => setLocation("/court-cases-admin")}
                  data-testid="nav-court-cases-admin"
                >
                  <Scale className="w-4 h-4 mr-2" />
                  <span>Court Cases Admin</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={location === "/activity" || location === "/unpassed-bills" || location === "/attendance" || location === "/hansard-analysis" || location === "/hansard-questions" || location === "/allowances" || location === "/disclaimer" || location === "/analytics" ? "secondary" : "ghost"}
                size="sm"
                data-testid="nav-analysis-dropdown"
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>{t('nav.analysis')}</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() => setLocation("/activity")}
                data-testid="nav-activity"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span>{t('nav.activity')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/unpassed-bills")}
                data-testid="nav-unpassed-bills"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span>Unpassed Bills</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/attendance")}
                data-testid="nav-attendance"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                <span>{t('nav.attendance')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/hansard-analysis")}
                data-testid="nav-hansard-analysis"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                <span>{t('nav.hansardAnalysis')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/hansard-questions")}
                data-testid="nav-hansard-questions"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                <span>{t('nav.hansardQuestions')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/analytics")}
                data-testid="nav-analytics"
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                <span>{t('nav.visitorAnalytics')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/allowances")}
                data-testid="nav-allowances"
              >
                <Calculator className="w-4 h-4 mr-2" />
                <span>{t('nav.allowances')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/disclaimer")}
                data-testid="nav-disclaimer"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>{t('nav.disclaimer')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <a href="https://open.dosm.gov.my/ms-MY/dashboard/kawasanku" target="_blank" rel="noopener noreferrer">
            <Button
              variant="ghost"
              size="sm"
              data-testid="nav-kawanku"
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              <span>{t('nav.kawanku')}</span>
            </Button>
          </a>
        </nav>

        <div className="flex-1 flex justify-end items-center gap-2">
          {onSearchClick && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchClick}
              className="h-9 w-9"
              data-testid="button-search"
            >
              <Search className="h-5 w-5" />
            </Button>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
