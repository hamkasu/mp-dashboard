/**
 * Copyright by Calmic Sdn Bhd
 * Updated: Consolidated Navigation Menu with Submenus
 */

import { Search, Menu, FileText, BookOpen, UserCheck, Calculator, BarChart3, ExternalLink, AlertCircle, GraduationCap, Scale, Shield, MessageSquare, Gavel, Building2, MessageSquareText, Award, Handshake, ChevronDown, Users, Activity, LayoutDashboard, Settings, UserPlus, UserX, Upload, TrendingUp, Heart, ScrollText, Eye, Briefcase, LogIn, UserCircle, Sparkles, LogOut } from "lucide-react";
import { useState } from "react";
import { FeedbackModal } from "@/components/FeedbackModal";
import { FundamentalRightsPopup } from "@/components/FundamentalRightsPopup";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Link, useLocation } from "wouter";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLanguage } from "@/i18n/LanguageContext";

interface HeaderProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

// ── Auth button ───────────────────────────────────────────────────────────────
// Shows "Sign in" when logged out; user name + account/logout dropdown when logged in.

function AuthButton() {
  const { user, isPremium, isLoading } = useAuth();
  const qc = useQueryClient();
  const [, setLocation] = useLocation();

  if (isLoading) return null;

  if (!user) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-1"
        onClick={() => setLocation("/login")}
        data-testid="button-signin"
      >
        <LogIn className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    qc.clear();
    setLocation("/");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1 max-w-[160px]" data-testid="button-account">
          <UserCircle className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline truncate">{user.name.split(" ")[0]}</span>
          {isPremium && <Sparkles className="h-3 w-3 text-primary shrink-0" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel className="truncate text-xs text-muted-foreground font-normal">
          {user.email}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => setLocation("/account")}>
          <UserCircle className="h-4 w-4 mr-2" />
          My Account
        </DropdownMenuItem>
        {!isPremium && (
          <DropdownMenuItem onSelect={() => setLocation("/pricing")} className="text-primary">
            <Sparkles className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [, setLocation] = useLocation();
  const { t, language } = useLanguage();
  const [donateOpen, setDonateOpen] = useState(false);

  const donateContent = {
    en: {
      buttonText: "Donate",
      modalTitle: "Support MyParliament Dashboard",
      modalDescription: "Scan the QR code below to make a donation via DuitNow",
      thankYou: "Thank you for your support!"
    },
    ms: {
      buttonText: "Derma",
      modalTitle: "Sokong Papan Pemuka MyParliament",
      modalDescription: "Imbas kod QR di bawah untuk membuat sumbangan melalui DuitNow",
      thankYou: "Terima kasih atas sokongan anda!"
    }
  };

  const currentDonateContent = donateContent[language as keyof typeof donateContent] || donateContent.en;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="flex h-16 items-center justify-between gap-4 px-4 max-w-7xl mx-auto">
        {/* Left: Logo + Main Menu Dropdown */}
        <div className="flex items-center gap-2">
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

          {/* Main Navigation Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 hidden md:flex" data-testid="button-main-nav">
                <LayoutDashboard className="w-4 h-4" />
                Menu
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
              {/* Parliament Section */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Parliament</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setLocation("/")} data-testid="menu-mps">
                <img src="/parlimen-malaysia.svg" alt="" className="w-4 h-4 mr-2" />
                {t('nav.mps')}
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-hansard-submenu">
                  <BookOpen className="w-4 h-4 mr-2" />
                  {t('nav.hansard')}
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => setLocation("/hansard")} data-testid="submenu-hansard-main">
                      <BookOpen className="w-4 h-4 mr-2" />
                      View Hansard
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/hansard-analysis")} data-testid="submenu-hansard-analysis">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      {t('nav.hansardAnalysis')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/constituency-analysis")} data-testid="submenu-constituency-analysis">
                      <Sparkles className="w-4 h-4 mr-2 text-primary" />
                      Constituency Intelligence
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/parliamentary-answers")} data-testid="submenu-parliamentary-answers">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      {t('nav.parliamentaryAnswers')}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={() => setLocation("/parliament-guide")} data-testid="menu-parliament-guide">
                <GraduationCap className="w-4 h-4 mr-2" />
                {t('nav.parliamentGuide')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/report-card")} data-testid="menu-report-card">
                <Award className="w-4 h-4 mr-2" />
                {t('nav.reportCard')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* MP Analysis Section */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">MP Analysis</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-activity-submenu">
                  <Activity className="w-4 h-4 mr-2" />
                  Performance
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => setLocation("/activity")} data-testid="submenu-activity">
                      <FileText className="w-4 h-4 mr-2" />
                      {t('nav.activity')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/attendance")} data-testid="submenu-attendance">
                      <UserCheck className="w-4 h-4 mr-2" />
                      {t('nav.attendance')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/allowances")} data-testid="submenu-allowances">
                      <Calculator className="w-4 h-4 mr-2" />
                      {t('nav.allowances')}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={() => setLocation("/analytics")} data-testid="menu-analytics">
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Legal & Constitution Section */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Legal & Constitution</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-legal-submenu">
                  <Scale className="w-4 h-4 mr-2" />
                  Legal Framework
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => setLocation("/constitution")} data-testid="submenu-constitution">
                      <Scale className="w-4 h-4 mr-2" />
                      {t('nav.constitution')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/fundamental-rights")} data-testid="submenu-fundamental-rights">
                      <Shield className="w-4 h-4 mr-2" />
                      {t('nav.fundamentalRights')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/courts")} data-testid="submenu-courts">
                      <Gavel className="w-4 h-4 mr-2" />
                      {t('nav.courts')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/bills")} data-testid="submenu-bills">
                      <FileText className="w-4 h-4 mr-2" />
                      {t('nav.bills')}
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* State Assemblies Section */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">State Assemblies</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-dun-submenu">
                  <Building2 className="w-4 h-4 mr-2" />
                  DUN
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => setLocation("/dun/sabah")} data-testid="submenu-dun-sabah">
                      <Building2 className="w-4 h-4 mr-2" />
                      DUN Sabah
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/dun/sarawak")} data-testid="submenu-dun-sarawak">
                      <Building2 className="w-4 h-4 mr-2" />
                      DUN Sarawak
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuItem onSelect={() => window.open("https://myparliament.calmic.com.my/ma63", "_blank")} data-testid="menu-ma63">
                <Handshake className="w-4 h-4 mr-2" />
                MA63 Dashboard
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* External Links */}
              <DropdownMenuItem onSelect={() => window.open("https://gighala.calmic.com.my?utm_source=myparliament&utm_medium=header_menu&utm_campaign=cross_promo", "_blank")} data-testid="menu-gighala">
                <Briefcase className="w-4 h-4 mr-2" />
                {t('nav.gigHala')}
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open("https://open.dosm.gov.my/ms-MY/dashboard/kawasanku", "_blank")} data-testid="menu-kawanku">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('nav.kawanku')}
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/external/lumi-news")} data-testid="menu-lumi-news">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('nav.lumiNews')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/external/mcchr")} data-testid="menu-mcchr">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('nav.mcchr')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/disclaimer")} data-testid="menu-disclaimer">
                <AlertCircle className="w-4 h-4 mr-2" />
                {t('nav.disclaimer')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Admin Section */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Admin</DropdownMenuLabel>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger data-testid="menu-admin-submenu">
                  <Settings className="w-4 h-4 mr-2" />
                  Administration
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem onSelect={() => setLocation("/add-mp-admin")} data-testid="submenu-add-mp">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add New MP
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/mp-status-admin")} data-testid="submenu-mp-status">
                      <UserX className="w-4 h-4 mr-2" />
                      MP Status
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setLocation("/hansard-admin")} data-testid="submenu-hansard-admin">
                      <Upload className="w-4 h-4 mr-2" />
                      Hansard Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/court-cases-admin")} data-testid="submenu-court-cases-admin">
                      <Gavel className="w-4 h-4 mr-2" />
                      Court Cases Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/parliamentary-answers-admin")} data-testid="submenu-parliamentary-answers-admin">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Parliamentary Answers Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/report-card-admin")} data-testid="submenu-report-card-admin">
                      <Award className="w-4 h-4 mr-2" />
                      Report Card Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/feedback-admin")} data-testid="submenu-feedback-admin">
                      <MessageSquareText className="w-4 h-4 mr-2" />
                      Feedback Admin
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setLocation("/bills-to-watch-admin")} data-testid="submenu-bills-to-watch-admin">
                      <ScrollText className="w-4 h-4 mr-2" />
                      Bills to Watch Admin
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setLocation("/visitor-data-admin")} data-testid="submenu-visitor-data-admin">
                      <Eye className="w-4 h-4 mr-2" />
                      Visitor Data
                    </DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Fundamental Rights Quick-View */}
          <FundamentalRightsPopup>
            <Button variant="outline" size="sm" className="gap-1 hidden md:flex" data-testid="button-rights-popup">
              <Shield className="w-4 h-4" />
              {t('nav.fundamentalRights')}
            </Button>
          </FundamentalRightsPopup>

          {/* Audit Reports */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 hidden md:flex" data-testid="button-audit-reports">
                <FileText className="w-4 h-4" />
                {t('nav.auditReports')}
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={() => setLocation("/audit-summary")} data-testid="menu-audit-summary">
                <AlertCircle className="w-4 h-4 mr-2" />
                LKAN 1/2026 - Audit Summary
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => window.open("/LKAN-1-2026-AKTIVITI-KEM-JAB-BDN-BERKANUN-PENGURUSAN-SYRKT-KERAJAAN-compressed.pdf", "_blank")}>
                <FileText className="w-4 h-4 mr-2" />
                LKAN 1/2026 - Aktiviti
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open("/LKAN-1-2026-Penyata-Kewangan-Agensi-Persekutuan-Tahun-2024-Bookmark.pdf", "_blank")}>
                <FileText className="w-4 h-4 mr-2" />
                LKAN 1/2026 - Penyata Kewangan
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right: Mobile Menu + Search + Feedback + Language */}
        <div className="flex items-center gap-1">
          {/* Mobile Hamburger Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="md:hidden" data-testid="button-mobile-menu">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 max-h-[80vh] overflow-y-auto">
              {/* Parliament */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Parliament</DropdownMenuLabel>
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

              {/* Analysis */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Analysis</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setLocation("/activity")}>
                <FileText className="w-4 h-4 mr-2" />
                {t('nav.activity')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/attendance")}>
                <UserCheck className="w-4 h-4 mr-2" />
                {t('nav.attendance')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/hansard-analysis")}>
                <BarChart3 className="w-4 h-4 mr-2" />
                {t('nav.hansardAnalysis')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/constituency-analysis")}>
                <Sparkles className="w-4 h-4 mr-2 text-primary" />
                Constituency Intelligence
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/parliamentary-answers")}>
                <MessageSquare className="w-4 h-4 mr-2" />
                {t('nav.parliamentaryAnswers')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/allowances")}>
                <Calculator className="w-4 h-4 mr-2" />
                {t('nav.allowances')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/analytics")}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Analytics
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Legal */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Legal</DropdownMenuLabel>
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

              {/* Audit Reports */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">{t('nav.auditReports')}</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setLocation("/audit-summary")}>
                <AlertCircle className="w-4 h-4 mr-2" />
                LKAN 1/2026 - Audit Summary
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open("/LKAN-1-2026-AKTIVITI-KEM-JAB-BDN-BERKANUN-PENGURUSAN-SYRKT-KERAJAAN-compressed.pdf", "_blank")}>
                <FileText className="w-4 h-4 mr-2" />
                LKAN 1/2026 - Aktiviti
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open("/LKAN-1-2026-Penyata-Kewangan-Agensi-Persekutuan-Tahun-2024-Bookmark.pdf", "_blank")}>
                <FileText className="w-4 h-4 mr-2" />
                LKAN 1/2026 - Penyata Kewangan
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* DUN */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">State Assemblies</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setLocation("/dun/sabah")}>
                <Building2 className="w-4 h-4 mr-2" />
                DUN Sabah
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/dun/sarawak")}>
                <Building2 className="w-4 h-4 mr-2" />
                DUN Sarawak
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open("https://myparliament.calmic.com.my/ma63", "_blank")}>
                <Handshake className="w-4 h-4 mr-2" />
                MA63 Dashboard
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem onSelect={() => window.open("https://gighala.calmic.com.my?utm_source=myparliament&utm_medium=mobile_menu&utm_campaign=cross_promo", "_blank")}>
                <Briefcase className="w-4 h-4 mr-2" />
                {t('nav.gigHala')}
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => window.open("https://open.dosm.gov.my/ms-MY/dashboard/kawasanku", "_blank")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('nav.kawanku')}
                <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/external/lumi-news")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('nav.lumiNews')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/external/mcchr")}>
                <ExternalLink className="w-4 h-4 mr-2" />
                {t('nav.mcchr')}
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/disclaimer")}>
                <AlertCircle className="w-4 h-4 mr-2" />
                {t('nav.disclaimer')}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Admin */}
              <DropdownMenuLabel className="text-xs text-muted-foreground">Admin</DropdownMenuLabel>
              <DropdownMenuItem onSelect={() => setLocation("/add-mp-admin")}>
                <UserPlus className="w-4 h-4 mr-2" />
                Add New MP
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/mp-status-admin")}>
                <UserX className="w-4 h-4 mr-2" />
                MP Status
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/hansard-admin")}>
                <Upload className="w-4 h-4 mr-2" />
                Hansard Admin
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/court-cases-admin")}>
                <Gavel className="w-4 h-4 mr-2" />
                Court Cases Admin
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setLocation("/bills-to-watch-admin")}>
                <ScrollText className="w-4 h-4 mr-2" />
                Bills to Watch Admin
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
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-800 dark:hover:bg-emerald-950"
            data-testid="button-gighala"
            onClick={() => window.open("https://gighala.calmic.com.my?utm_source=myparliament&utm_medium=header_button&utm_campaign=cross_promo", "_blank", "noopener,noreferrer")}
            title={t('nav.gigHalaTagline')}
          >
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">{t('nav.gigHala')}</span>
          </Button>
          <Dialog open={donateOpen} onOpenChange={setDonateOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-rose-600 border-rose-200 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:border-rose-800 dark:hover:bg-rose-950"
                data-testid="button-donate"
              >
                <Heart className="h-4 w-4" />
                <span className="hidden sm:inline">{currentDonateContent.buttonText}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-center text-xl">
                  {currentDonateContent.modalTitle}
                </DialogTitle>
                <DialogDescription className="text-center">
                  {currentDonateContent.modalDescription}
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center space-y-4 py-4">
                <div className="bg-white p-4 rounded-lg shadow-md">
                  <img
                    src="/duitnow-qr.png"
                    alt="DuitNow QR Code - CALMIC SDN. BHD."
                    className="w-[36rem] h-[36rem] object-contain"
                  />
                </div>
                <p className="text-sm text-center text-muted-foreground font-medium">
                  CALMIC SDN. BHD.
                </p>
                <p className="text-sm text-center text-primary font-semibold">
                  {currentDonateContent.thankYou}
                </p>
              </div>
            </DialogContent>
          </Dialog>
          <AuthButton />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}
