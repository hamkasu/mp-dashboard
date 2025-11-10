import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import Home from "@/pages/Home";
import MPProfile from "@/pages/MPProfile";
import ParliamentaryActivity from "@/pages/ParliamentaryActivity";
import Hansard from "@/pages/hansard";
import HansardAdmin from "@/pages/HansardAdmin";
import Attendance from "@/pages/attendance";
import Allowances from "@/pages/Allowances";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/mp/:id" component={MPProfile} />
      <Route path="/activity" component={ParliamentaryActivity} />
      <Route path="/hansard" component={Hansard} />
      <Route path="/attendance" component={Attendance} />
      <Route path="/allowances" component={Allowances} />
      <Route path="/login" component={Login} />
      <Route path="/hansard-admin" component={HansardAdmin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
