import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LanguageProvider } from "@/i18n/LanguageContext";
import Home from "@/pages/Home";
import MPProfile from "@/pages/MPProfile";
import ParliamentaryActivity from "@/pages/ParliamentaryActivity";
import Hansard from "@/pages/hansard";
import ParliamentGuide from "@/pages/parliament-guide";
import Constitution from "@/pages/Constitution";
import HansardAdmin from "@/pages/HansardAdmin";
import HansardAnalysis from "@/pages/hansard-analysis";
import ConstituencyAnalysis from "@/pages/ConstituencyAnalysis";
import Attendance from "@/pages/attendance";
import Allowances from "@/pages/Allowances";
import Disclaimer from "@/pages/Disclaimer";
import Analytics from "@/pages/analytics";
import AdminLogin from "@/pages/AdminLogin";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/mp/:id" component={MPProfile} />
      <Route path="/activity" component={ParliamentaryActivity} />
      <Route path="/hansard" component={Hansard} />
      <Route path="/parliament-guide" component={ParliamentGuide} />
      <Route path="/constitution" component={Constitution} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/allowances" component={Allowances} />
      <Route path="/disclaimer" component={Disclaimer} />
      <Route path="/hansard-admin" component={HansardAdmin} />
      <Route path="/hansard-analysis" component={HansardAnalysis} />
      <Route path="/constituency-analysis" component={ConstituencyAnalysis} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/admin-login" component={AdminLogin} />
      <Route component={NotFound} />
    </Switch>
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
