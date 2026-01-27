/**
 * Copyright by Calmic Sdn Bhd
 * Updated: Simplified Navigation Menu
 */

import { Search, Menu, FileText, BookOpen, UserCheck, Calculator, BarChart3, ExternalLink, AlertCircle, GraduationCap, Scale, Shield, MessageSquare, Gavel, Building2, MessageSquareText, Award, Handshake } from "lucide-react";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  const [, setLocation] = useLocation();
  const { t } = useLanguage();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-16 items-center justify-between gap-4 px-4 max-w-7xl mx-auto">
        {/* Left: Logo */}
        <Link href="/">
          <div className="flex items-center gap-2 cursor-pointer px-1 py-1 rounded-md hover:bg-accent">
            <img
              src="/calmic-logo.png"
              alt="Logo"
              className="h-10 w-10 rounded-full object-cover"
              data-testid="img-calmic-logo"
            />
            <div className="flex flex-col">
              <span className="text-sm font-bold">{t('nav.malayParliament')}</span>
              <span className="text-xs text-muted-foreground hidden sm:block">
                {t('nav.dewanRakyatDashboard')}
              </span>
            </div>
          </div>
        </Link>

        {/* Center: Main Nav Items */}
        <nav className="hidden md:flex items-center gap-1">
          <Link href="/">
            <Button variant="outline" size="sm" className="gap-2">
              <img src="/parlimen-malaysia.svg" alt="" className="w-4 h-4" />
              {t('nav.mps')}
            </Button>
          </Link>
          <Link href="/hansard">
            <Button variant="outline" size="sm" className="gap-2">
              <BookOpen className="w-4 h-4" />
              {t('nav.hansard')}
            </Button>
          </Link>
          <Link href="/parliament-guide">
            <Button variant="outline" size="sm" className="gap-2">
              <GraduationCap className="w-4 h-4" />
              {t('nav.parliamentGuide')}
            </Button>
          </Link>
          <Link href="/report-card">
            <Button variant="outline" size="sm" className="gap-2">
              <Award className="w-4 h-4" />
              {t('nav.reportCard')}
            </Button>
          </Link>
        </nav>

        {/* Right: Menu + Search + Feedback + Language */}
        <div className="flex items-center gap-1">
          {/* Hamburger Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" data-testid="button-menu-toggle">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[80vh] overflow-y-auto">
              {/* Main Navigation */}
              <DropdownMenuItem onSelect={() => setLocation("/")}>
                <img src="/parlimen-malaysia.svg" alt="" className="w-4 h-4 mr-2" />
                {t('nav.mps')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/hansard")}>
                <BookOpen className="w-4 h-4 mr-2" />
                {t('nav.hansard')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/parliament-guide")}>
                <GraduationCap className="w-4 h-4 mr-2" />
                {t('nav.parliamentGuide')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/report-card")}>
                <Award className="w-4 h-4 mr-2" />
                {t('nav.reportCard')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* MA63 - External Link */}
              <DropdownMenuItem onSelect={() => window.open("https://myparliament.calmic.com.my/ma63", "_blank")}>
                <Handshake className="w-4 h-4 mr-2" />
                MA63 Dashboard
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Legal Section */}
              <DropdownMenuItem onSelect={() => setLocation("/constitution")}>
                <Scale className="w-4 h-4 mr-2" />
                {t('nav.constitution')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/fundamental-rights")}>
                <Shield className="w-4 h-4 mr-2" />
                {t('nav.fundamentalRights')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/courts")}>
                <Gavel className="w-4 h-4 mr-2" />
                {t('nav.courts')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/bills")}>
                <FileText className="w-4 h-4 mr-2" />
                {t('nav.bills')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Analysis Section */}
              <DropdownMenuItem onSelect={() => setLocation("/activity")}>
                <FileText className="w-4 h-4 mr-2" />
                {t('nav.activity')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/attendance")}>
                <UserCheck className="w-4 h-4 mr-2" />
                {t('nav.attendance')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/parliamentary-answers")}>
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('nav.parliamentaryAnswers')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/hansard-analysis")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                {t('nav.hansardAnalysis')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/allowances")}>
                <Calculator className="w-4 h-4 mr-2" />
                {t('nav.allowances')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* DUN Section */}
              <DropdownMenuItem onSelect={() => setLocation("/dun/sabah")}>
                <Building2 className="w-4 h-4 mr-2" />
                DUN Sabah
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/sarawak")}>
                <Building2 className="w-4 h-4 mr-2" />
                DUN Sarawak
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* External Links */}
              <DropdownMenuItem onSelect={() => window.open("https://open.dosm.gov.my/ms-MY/dashboard/kawasanku", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('nav.kawanku')}
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onSelect={() => setLocation("/disclaimer")}>
                <AlertCircle className="w-4 h-4 mr-2" />
                {t('nav.disclaimer')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            size="icon"
            onClick={onSearchClick}
            data-testid="button-search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <FeedbackModal>
            <Button variant="outline" size="icon" data-testid="button-feedback">
              <MessageSquareText className="h-5 w-5" />
            </Button>
          </FeedbackModal>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
