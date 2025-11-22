/**
 * Copyright by Calmic Sdn Bhd
 */

import { Search, Menu, Home, FileText, BookOpen, UserCheck, Calculator, BarChart3, ExternalLink, ChevronDown, AlertCircle, GraduationCap, TrendingUp, Scale, Shield, MessageSquare } from "lucide-react";
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

interface HeaderProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const { t } = useLanguage();

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
          <Link href="/hansard-admin">
            <Button
              variant={location === "/hansard-admin" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-hansard-admin"
              className="gap-2"
            >
              <Shield className="w-4 h-4" />
              <span>{t('nav.admin')}</span>
            </Button>
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={location === "/activity" || location === "/attendance" || location === "/hansard-analysis" || location === "/hansard-questions" || location === "/allowances" || location === "/disclaimer" || location === "/analytics" ? "secondary" : "ghost"}
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
              variant="outline"
              onClick={onSearchClick}
              className="gap-2 max-w-xs w-full justify-start text-muted-foreground"
              data-testid="button-search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.searchMps')}</span>
              <kbd className="hidden md:inline-flex ml-auto h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          )}
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
