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
        <Route path="/court-cases-admin" component={CourtCasesAdmin} />
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
          <Toaster />
          <Router />
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
}

export default App;
