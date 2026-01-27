/**
 * Copyright by Calmic Sdn Bhd
 * Updated: Parliamentary Answers Navigation (2025-12-02)
 */

import { Search, Menu, FileText, BookOpen, UserCheck, Calculator, BarChart3, ExternalLink, AlertCircle, GraduationCap, TrendingUp, Scale, Shield, MessageSquare, Edit, Gavel, Building2, MessageSquareText, Award, Handshake, ChevronDown } from "lucide-react";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Button } from "@/components/ui/button";
import { NavButton, NavIcon, NavLabel } from "@/components/ui/nav-button";
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
      <div className="flex h-16 md:h-20 items-center justify-between gap-4 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Mobile Navigation Menu - Always visible on mobile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden shrink-0"
              data-testid="button-menu-toggle"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[240px]">
            <DropdownMenuItem onSelect={() => setLocation("/")}>
              <img src="/parlimen-malaysia.svg" alt="Ahli Parlimen" className="w-5 h-5 mr-2" />
              <span>{t('nav.mps')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/hansard")}>
              <BookOpen className="w-4 h-4 mr-2" />
              <span>{t('nav.hansard')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/parliament-guide")}>
              <GraduationCap className="w-4 h-4 mr-2" />
              <span>{t('nav.parliamentGuide')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/report-card")}>
              <Award className="w-4 h-4 mr-2" />
              <span>{t('nav.reportCard')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => window.open("https://myparliament.calmic.com.my/ma63", "_blank")}>
              <Handshake className="w-4 h-4 mr-2" />
              <span>{t('nav.ma63Dashboard')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/activity")}>
              <FileText className="w-4 h-4 mr-2" />
              <span>{t('nav.activity')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/attendance")}>
              <UserCheck className="w-4 h-4 mr-2" />
              <span>{t('nav.attendance')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/parliamentary-answers")}>
              <MessageSquare className="w-4 h-4 mr-2" />
              <span>{t('nav.parliamentaryAnswers')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/allowances")}>
              <Calculator className="w-4 h-4 mr-2" />
              <span>{t('nav.allowances')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/constitution")}>
              <Scale className="w-4 h-4 mr-2" />
              <span>{t('nav.constitution')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/courts")}>
              <Gavel className="w-4 h-4 mr-2" />
              <span>{t('nav.courts')}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setLocation("/disclaimer")}>
              <AlertCircle className="w-4 h-4 mr-2" />
              <span>{t('nav.disclaimer')}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Link href="/">
          <div className="flex items-center gap-2 md:gap-3 cursor-pointer hover-elevate px-1 md:px-2 py-1 rounded-md">
            <img
              src="/calmic-logo.png"
              alt="Calmic Logo"
              className="h-10 w-10 md:h-12 md:w-12 rounded-full object-cover shrink-0"
              data-testid="img-calmic-logo"
            />
            <div className="flex flex-col justify-center min-w-0">
              <h1 className="text-sm md:text-base font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                {t('nav.malayParliament')}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap overflow-hidden text-ellipsis leading-tight">
                {t('nav.dewanRakyatDashboard')}
              </p>
            </div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-0.5 lg:gap-1 flex-1 ml-2 lg:ml-4">
          <Link href="/">
            <NavButton active={location === "/"} data-testid="nav-home">
              <NavIcon large>
                <img src="/parlimen-malaysia.svg" alt="Ahli Parlimen" />
              </NavIcon>
              <NavLabel>{t('nav.mps')}</NavLabel>
            </NavButton>
          </Link>

          <Link href="/hansard">
            <NavButton active={location === "/hansard"} data-testid="nav-hansard">
              <NavIcon><BookOpen /></NavIcon>
              <NavLabel>{t('nav.hansard')}</NavLabel>
            </NavButton>
          </Link>

          <Link href="/parliament-guide">
            <NavButton active={location === "/parliament-guide"} data-testid="nav-parliament-guide">
              <NavIcon><GraduationCap /></NavIcon>
              <NavLabel>{t('nav.guide')}</NavLabel>
            </NavButton>
          </Link>

          <Link href="/report-card">
            <NavButton active={location === "/report-card"} data-testid="nav-report-card">
              <NavIcon><Award /></NavIcon>
              <NavLabel>{t('nav.report')}</NavLabel>
            </NavButton>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <NavButton
                active={location === "/constitution" || location === "/fundamental-rights" || location === "/courts" || location === "/bills"}
                data-testid="nav-legal-dropdown"
              >
                <NavIcon><Scale /></NavIcon>
                <NavLabel><span className="flex items-center gap-0.5">{t('nav.legal')}<ChevronDown className="h-3 w-3" /></span></NavLabel>
              </NavButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setLocation("/constitution")} data-testid="nav-constitution">
                <Scale className="w-4 h-4 mr-2" />
                <span>{t('nav.constitution')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/fundamental-rights")} data-testid="nav-fundamental-rights">
                <Shield className="w-4 h-4 mr-2" />
                <span>{t('nav.fundamentalRights')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/courts")} data-testid="nav-courts">
                <Gavel className="w-4 h-4 mr-2" />
                <span>{t('nav.courts')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/bills")} data-testid="nav-bills">
                <FileText className="w-4 h-4 mr-2" />
                <span>{t('nav.bills')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open("/Penal_Code_ACT_574.pdf", "_blank")} data-testid="nav-penal-code">
                <Scale className="w-4 h-4 mr-2" />
                <span>Penal Code</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <NavButton active={location.startsWith("/dun")} data-testid="nav-dun-dropdown">
                <NavIcon><Building2 /></NavIcon>
                <NavLabel><span className="flex items-center gap-0.5">{t('nav.dun')}<ChevronDown className="h-3 w-3" /></span></NavLabel>
              </NavButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
              <DropdownMenuItem onSelect={() => setLocation("/dun/johor")} data-testid="nav-dun-johor">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Johor</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/kedah")} data-testid="nav-dun-kedah">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Kedah</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/kelantan")} data-testid="nav-dun-kelantan">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Kelantan</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/melaka")} data-testid="nav-dun-melaka">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Melaka</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/negeri-sembilan")} data-testid="nav-dun-negeri-sembilan">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Negeri Sembilan</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/pahang")} data-testid="nav-dun-pahang">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Pahang</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/perak")} data-testid="nav-dun-perak">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Perak</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/perlis")} data-testid="nav-dun-perlis">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Perlis</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/pulau-pinang")} data-testid="nav-dun-pulau-pinang">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Pulau Pinang</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/sabah")} data-testid="nav-dun-sabah">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Sabah</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/sarawak")} data-testid="nav-dun-sarawak">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Sarawak</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/selangor")} data-testid="nav-dun-selangor">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Selangor</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/terengganu")} data-testid="nav-dun-terengganu">
                <Building2 className="w-4 h-4 mr-2" />
                <span>Terengganu</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <a href="https://myparliament.calmic.com.my/ma63" target="_blank" rel="noopener noreferrer">
            <NavButton data-testid="nav-ma63">
              <NavIcon><Handshake /></NavIcon>
              <NavLabel>MA63</NavLabel>
            </NavButton>
          </a>

          {authStatus?.isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <NavButton
                  active={location === "/hansard-admin" || location === "/blog-admin" || location === "/court-cases-admin" || location === "/parliamentary-answers-admin"}
                  data-testid="nav-admin-dropdown"
                >
                  <NavIcon><Shield /></NavIcon>
                  <NavLabel><span className="flex items-center gap-0.5">{t('nav.admin')}<ChevronDown className="h-3 w-3" /></span></NavLabel>
                </NavButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={() => setLocation("/hansard-admin")} data-testid="nav-hansard-admin">
                  <BookOpen className="w-4 h-4 mr-2" />
                  <span>Hansard Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLocation("/parliamentary-answers-admin")} data-testid="nav-parliamentary-answers-admin">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span>Parliamentary Answers Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLocation("/report-card-admin")} data-testid="nav-report-card-admin">
                  <Award className="w-4 h-4 mr-2" />
                  <span>Report Card Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLocation("/blog-admin")} data-testid="nav-blog-admin">
                  <Edit className="w-4 h-4 mr-2" />
                  <span>Blog Admin</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setLocation("/court-cases-admin")} data-testid="nav-court-cases-admin">
                  <Scale className="w-4 h-4 mr-2" />
                  <span>Court Cases Admin</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <NavButton
                active={["/activity", "/unpassed-bills", "/attendance", "/hansard-analysis", "/hansard-questions", "/parliamentary-answers", "/allowances", "/disclaimer", "/analytics"].includes(location)}
                data-testid="nav-analysis-dropdown"
              >
                <NavIcon><BarChart3 /></NavIcon>
                <NavLabel><span className="flex items-center gap-0.5">{t('nav.analysis')}<ChevronDown className="h-3 w-3" /></span></NavLabel>
              </NavButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setLocation("/activity")} data-testid="nav-activity">
                <FileText className="w-4 h-4 mr-2" />
                <span>{t('nav.activity')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/unpassed-bills")} data-testid="nav-unpassed-bills">
                <FileText className="w-4 h-4 mr-2" />
                <span>Unpassed Bills</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/attendance")} data-testid="nav-attendance">
                <UserCheck className="w-4 h-4 mr-2" />
                <span>{t('nav.attendance')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/hansard-analysis")} data-testid="nav-hansard-analysis">
                <BarChart3 className="w-4 h-4 mr-2" />
                <span>{t('nav.hansardAnalysis')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/hansard-questions")} data-testid="nav-hansard-questions">
                <MessageSquare className="w-4 h-4 mr-2" />
                <span>{t('nav.hansardQuestions')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/parliamentary-answers")} data-testid="nav-parliamentary-answers">
                <MessageSquare className="w-4 h-4 mr-2" />
                <span>{t('nav.parliamentaryAnswers')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/analytics")} data-testid="nav-analytics">
                <TrendingUp className="w-4 h-4 mr-2" />
                <span>{t('nav.visitorAnalytics')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/allowances")} data-testid="nav-allowances">
                <Calculator className="w-4 h-4 mr-2" />
                <span>{t('nav.allowances')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/disclaimer")} data-testid="nav-disclaimer">
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>{t('nav.disclaimer')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <a href="https://open.dosm.gov.my/ms-MY/dashboard/kawasanku" target="_blank" rel="noopener noreferrer">
            <NavButton data-testid="nav-kawanku">
              <NavIcon><ExternalLink /></NavIcon>
              <NavLabel>{t('nav.kawanku')}</NavLabel>
            </NavButton>
          </a>
        </nav>

        <div className="flex justify-end items-center gap-1 md:gap-2 ml-auto shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            className="h-9 w-9"
            data-testid="button-search"
          >
            <Search className="h-5 w-5" />
          </Button>
          <FeedbackModal>
            <Button variant="ghost" size="icon" className="h-9 w-9" data-testid="button-feedback">
              <MessageSquareText className="h-5 w-5" />
            </Button>
          </FeedbackModal>
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
