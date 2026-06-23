/**
 * Copyright by Calmic Sdn Bhd
 */

import { Switch, Route } from "wouter";
import { lazy, Suspense } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import { PWAInstallPrompt } from "@/components/PWAInstallPrompt";
import { CNYFestiveBanner } from "@/components/CNYFestiveBanner";
import { HariRayaBanner } from "@/components/HariRayaBanner";

// Eager load only the most critical pages
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";

// Lazy load all other pages to reduce initial bundle size
const MPProfile = lazy(() => import("@/pages/MPProfile"));
const ParliamentaryActivity = lazy(() => import("@/pages/ParliamentaryActivity"));
const Hansard = lazy(() => import("@/pages/hansard"));
const ParliamentGuide = lazy(() => import("@/pages/parliament-guide"));
const Constitution = lazy(() => import("@/pages/Constitution"));
const FundamentalRights = lazy(() => import("@/pages/FundamentalRights"));
const HansardAdmin = lazy(() => import("@/pages/HansardAdmin"));
const HansardAnalysis = lazy(() => import("@/pages/hansard-analysis"));
const ConstituencyAnalysis = lazy(() => import("@/pages/ConstituencyAnalysis"));
const HansardQuestions = lazy(() => import("@/pages/hansard-questions"));
const Attendance = lazy(() => import("@/pages/attendance"));
const Allowances = lazy(() => import("@/pages/Allowances"));
const Disclaimer = lazy(() => import("@/pages/Disclaimer"));
const Analytics = lazy(() => import("@/pages/analytics"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const Blog = lazy(() => import("@/pages/Blog"));
const BlogPost = lazy(() => import("@/pages/BlogPost"));
const BlogAdmin = lazy(() => import("@/pages/BlogAdmin"));
const UnpassedBills = lazy(() => import("@/pages/UnpassedBills"));
const CourtCasesAdmin = lazy(() => import("@/pages/CourtCasesAdmin"));
const Courts = lazy(() => import("@/pages/Courts"));
const Bills = lazy(() => import("@/pages/Bills"));
const ParliamentaryAnswers = lazy(() => import("@/pages/ParliamentaryAnswers"));
const ParliamentaryAnswersAdmin = lazy(() => import("@/pages/ParliamentaryAnswersAdmin"));
const MPStatusAdmin = lazy(() => import("@/pages/MPStatusAdmin"));
const AddMPAdmin = lazy(() => import("@/pages/AddMPAdmin"));
const DunSarawak = lazy(() => import("@/pages/DunSarawak"));
const DunSelangor = lazy(() => import("@/pages/DunSelangor"));
const ReportCard = lazy(() => import("@/pages/ReportCard"));
const ReportCardAdmin = lazy(() => import("@/pages/ReportCardAdmin"));
const CoalitionComparison = lazy(() => import("@/pages/CoalitionComparison"));
const StateLeaderboards = lazy(() => import("@/pages/StateLeaderboards"));
const MPDetailWithPercentiles = lazy(() => import("@/pages/MPDetailWithPercentiles"));
const AllowanceAnalysisDashboard = lazy(() => import("@/pages/AllowanceAnalysisDashboard"));
const MPAllowanceBreakdown = lazy(() => import("@/pages/MPAllowanceBreakdown"));
const AllowanceEfficiencyPage = lazy(() => import("@/pages/AllowanceEfficiencyPage"));
const MPMessagesAdmin = lazy(() => import("@/pages/MPMessagesAdmin"));
const AIAgentsAdmin = lazy(() => import("@/pages/AIAgentsAdmin"));
const MA63Dashboard = lazy(() => import("@/pages/MA63Dashboard"));
const MYMPImportAdmin = lazy(() => import("@/pages/MYMPImportAdmin"));
const FeedbackAdmin = lazy(() => import("@/pages/FeedbackAdmin"));
const VisitorDataAdmin = lazy(() => import("@/pages/VisitorDataAdmin"));
const BillsToWatchAdmin = lazy(() => import("@/pages/BillsToWatchAdmin"));
const ExternalFrame = lazy(() => import("@/pages/ExternalFrame"));
const GigRegister = lazy(() => import("@/pages/GigRegister"));
const AuditSummary = lazy(() => import("@/pages/AuditSummary"));
const Login = lazy(() => import("@/pages/Login"));
const Pricing = lazy(() => import("@/pages/Pricing"));
const Account = lazy(() => import("@/pages/Account"));

// Loading component
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent"></div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/mp/:id" component={MPProfile} />
        <Route path="/activity" component={ParliamentaryActivity} />
        <Route path="/unpassed-bills" component={UnpassedBills} />
        <Route path="/hansard" component={Hansard} />
        <Route path="/parliament-guide" component={ParliamentGuide} />
        <Route path="/constitution" component={Constitution} />
        <Route path="/fundamental-rights" component={FundamentalRights} />
        <Route path="/blog" component={Blog} />
        <Route path="/blog/:slug" component={BlogPost} />
        <Route path="/courts" component={Courts} />
        <Route path="/bills" component={Bills} />
        <Route path="/parliamentary-answers" component={ParliamentaryAnswers} />
        <Route path="/parliamentary-answers-admin" component={ParliamentaryAnswersAdmin} />
        <Route path="/blog-admin" component={BlogAdmin} />
        <Route path="/attendance" component={Attendance} />
        <Route path="/allowances" component={Allowances} />
        <Route path="/disclaimer" component={Disclaimer} />
        <Route path="/hansard-admin" component={HansardAdmin} />
        <Route path="/hansard-analysis" component={HansardAnalysis} />
        <Route path="/hansard-questions" component={HansardQuestions} />
        <Route path="/constituency-analysis" component={ConstituencyAnalysis} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/admin-login" component={AdminLogin} />
        <Route path="/admin/login" component={AdminLogin} />
        <Route path="/court-cases-admin" component={CourtCasesAdmin} />
        <Route path="/mp-status-admin" component={MPStatusAdmin} />
        <Route path="/add-mp-admin" component={AddMPAdmin} />
        <Route path="/dun/sarawak" component={DunSarawak} />
        <Route path="/dun/selangor" component={DunSelangor} />
        <Route path="/ma63" component={MA63Dashboard} />
        <Route path="/report-card" component={ReportCard} />
        <Route path="/report-card-admin" component={ReportCardAdmin} />
        {/* Phase 4: Coalition and State Percentiles */}
        <Route path="/coalition-comparison" component={CoalitionComparison} />
        <Route path="/state-leaderboards" component={StateLeaderboards} />
        <Route path="/mp/:mpId/percentiles" component={MPDetailWithPercentiles} />
        {/* Phase 5: Allowance-per-Output ROI Analysis */}
        <Route path="/allowance-analysis" component={AllowanceAnalysisDashboard} />
        <Route path="/mp/:mpId/allowance-breakdown" component={MPAllowanceBreakdown} />
        <Route path="/allowance-efficiency" component={AllowanceEfficiencyPage} />
        <Route path="/mp-messages-admin" component={MPMessagesAdmin} />
        <Route path="/ai-agents-admin" component={AIAgentsAdmin} />
        <Route path="/mymp-import-admin" component={MYMPImportAdmin} />
        <Route path="/feedback-admin" component={FeedbackAdmin} />
        <Route path="/visitor-data-admin" component={VisitorDataAdmin} />
        <Route path="/bills-to-watch-admin" component={BillsToWatchAdmin} />
        <Route path="/external/:site" component={ExternalFrame} />
        {/* GigHalal registration/login */}
        <Route path="/daftar" component={GigRegister} />
        <Route path="/gig/register" component={GigRegister} />
        <Route path="/audit-summary" component={AuditSummary} />
        {/* Subscription & auth */}
        <Route path="/login" component={Login} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/account" component={Account} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <CNYFestiveBanner />
          <HariRayaBanner />
          <Toaster />
          <PWAInstallPrompt />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
