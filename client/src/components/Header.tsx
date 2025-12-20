/**
 * Copyright by Calmic Sdn Bhd
 * Updated: Parliamentary Answers Navigation (2025-12-02)
 */

import { Search, Menu, Home, FileText, BookOpen, UserCheck, Calculator, BarChart3, ExternalLink, ChevronDown, AlertCircle, GraduationCap, TrendingUp, Scale, Shield, MessageSquare, Edit, Gavel, UserX, Building2, MessageSquareText } from "lucide-react";
import { FeedbackModal } from "@/components/FeedbackModal";
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
          <div className="flex items-center gap-2 md:gap-4 cursor-pointer hover-elevate px-1 md:px-2 py-1 rounded-md">
            <img
              src="/calmic-logo.png"
              alt="Calmic Logo"
              className="h-10 w-10 md:h-14 md:w-14 rounded-full object-cover shrink-0"
              data-testid="img-calmic-logo"
            />
            <div className="flex flex-col min-w-0 flex-1">
              <h1 className="text-sm md:text-lg font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
                {t('nav.malayParliament')}
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap overflow-hidden text-ellipsis">
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={location === "/constitution" || location === "/fundamental-rights" || location === "/courts" || location === "/bills" ? "secondary" : "ghost"}
                size="sm"
                data-testid="nav-legal-dropdown"
                className="gap-2"
              >
                <Scale className="w-4 h-4" />
                <span>{t('nav.legal')}</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onSelect={() => setLocation("/constitution")}
                data-testid="nav-constitution"
              >
                <Scale className="w-4 h-4 mr-2" />
                <span>{t('nav.constitution')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/fundamental-rights")}
                data-testid="nav-fundamental-rights"
              >
                <Shield className="w-4 h-4 mr-2" />
                <span>{t('nav.fundamentalRights')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/courts")}
                data-testid="nav-courts"
              >
                <Gavel className="w-4 h-4 mr-2" />
                <span>{t('nav.courts')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/bills")}
                data-testid="nav-bills"
              >
                <FileText className="w-4 h-4 mr-2" />
                <span>{t('nav.bills')}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => window.open("/Penal_Code_ACT_574.pdf", "_blank")}
                data-testid="nav-penal-code"
              >
                <Scale className="w-4 h-4 mr-2" />
                <span>Penal Code</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={location.startsWith("/dun") ? "secondary" : "ghost"}
                size="sm"
                data-testid="nav-dun-dropdown"
                className="gap-2"
              >
                <Building2 className="w-4 h-4" />
                <span>{t('nav.dun')}</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="max-h-80 overflow-y-auto">
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/johor")}
                data-testid="nav-dun-johor"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Johor</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/kedah")}
                data-testid="nav-dun-kedah"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Kedah</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/kelantan")}
                data-testid="nav-dun-kelantan"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Kelantan</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/melaka")}
                data-testid="nav-dun-melaka"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Melaka</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/negeri-sembilan")}
                data-testid="nav-dun-negeri-sembilan"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Negeri Sembilan</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/pahang")}
                data-testid="nav-dun-pahang"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Pahang</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/perak")}
                data-testid="nav-dun-perak"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Perak</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/perlis")}
                data-testid="nav-dun-perlis"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Perlis</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/pulau-pinang")}
                data-testid="nav-dun-pulau-pinang"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Pulau Pinang</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/sabah")}
                data-testid="nav-dun-sabah"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Sabah</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/sarawak")}
                data-testid="nav-dun-sarawak"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Sarawak</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/selangor")}
                data-testid="nav-dun-selangor"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Selangor</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setLocation("/dun/terengganu")}
                data-testid="nav-dun-terengganu"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Terengganu</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {authStatus?.isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant={location === "/hansard-admin" || location === "/blog-admin" || location === "/court-cases-admin" || location === "/parliamentary-answers-admin" ? "secondary" : "ghost"}
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
                  onSelect={() => setLocation("/parliamentary-answers-admin")}
                  data-testid="nav-parliamentary-answers-admin"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  <span>Parliamentary Answers Admin</span>
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
                variant={location === "/activity" || location === "/unpassed-bills" || location === "/attendance" || location === "/hansard-analysis" || location === "/hansard-questions" || location === "/parliamentary-answers" || location === "/allowances" || location === "/disclaimer" || location === "/analytics" ? "secondary" : "ghost"}
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
                onSelect={() => setLocation("/parliamentary-answers")}
                data-testid="nav-parliamentary-answers"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                <span>{t('nav.parliamentaryAnswers')}</span>
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
