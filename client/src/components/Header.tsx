import { Search, Menu, Home, FileText, BookOpen, UserCheck, Calculator, BarChart3, ExternalLink, ChevronDown, AlertCircle, GraduationCap, LogIn, LogOut, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface HeaderProps {
  onMenuClick?: () => void;
  onSearchClick?: () => void;
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();

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
                Malaysian Parliament
              </h1>
              <p className="text-xs text-muted-foreground hidden sm:block">
                Dewan Rakyat Dashboard
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
              <span>MPs</span>
            </Button>
          </Link>
          <Link href="/activity">
            <Button
              variant={location === "/activity" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-activity"
              className="gap-2"
            >
              <FileText className="w-4 h-4" />
              <span>Activity</span>
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
              <span>Hansard</span>
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
              <span>How It Works</span>
            </Button>
          </Link>
          <Link href="/attendance">
            <Button
              variant={location === "/attendance" ? "secondary" : "ghost"}
              size="sm"
              data-testid="nav-attendance"
              className="gap-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Attendance</span>
            </Button>
          </Link>
          {user && (
            <Link href="/hansard-admin">
              <Button
                variant={location === "/hansard-admin" ? "secondary" : "ghost"}
                size="sm"
                data-testid="nav-hansard-admin"
                className="gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>Admin</span>
              </Button>
            </Link>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant={location === "/hansard-analysis" || location === "/allowances" || location === "/disclaimer" || location === "/analytics" ? "secondary" : "ghost"}
                size="sm"
                data-testid="nav-analysis-dropdown"
                className="gap-2"
              >
                <BarChart3 className="w-4 h-4" />
                <span>Analysis</span>
                <ChevronDown className="w-3 h-3 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem 
                onSelect={() => setLocation("/hansard-analysis")}
                data-testid="nav-hansard-analysis"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                <span>Hansard Analysis</span>
              </DropdownMenuItem>
              {user && (
                <DropdownMenuItem 
                  onSelect={() => setLocation("/analytics")}
                  data-testid="nav-analytics"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  <span>Visitor Analytics</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem 
                onSelect={() => setLocation("/allowances")}
                data-testid="nav-allowances"
              >
                <Calculator className="w-4 h-4 mr-2" />
                <span>Allowances</span>
              </DropdownMenuItem>
              <DropdownMenuItem 
                onSelect={() => setLocation("/disclaimer")}
                data-testid="nav-disclaimer"
              >
                <AlertCircle className="w-4 h-4 mr-2" />
                <span>Disclaimer</span>
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
              <span>KAWANKU</span>
            </Button>
          </a>
        </nav>

        {onSearchClick && (
          <div className="flex-1 flex justify-end">
            <Button
              variant="outline"
              onClick={onSearchClick}
              className="gap-2 max-w-xs w-full justify-start text-muted-foreground"
              data-testid="button-search"
            >
              <Search className="h-4 w-4" />
              <span className="hidden sm:inline">Search MPs...</span>
              <kbd className="hidden md:inline-flex ml-auto h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                <span className="text-xs">⌘</span>K
              </kbd>
            </Button>
          </div>
        )}

        <div className="ml-auto md:ml-4 flex items-center gap-2">
          {user ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-logout"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          ) : (
            <Link href="/auth">
              <Button
                variant="ghost"
                size="sm"
                data-testid="button-login"
                className="gap-2"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Login</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
