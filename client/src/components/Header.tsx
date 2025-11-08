import { Search, Menu, Home, FileText, BookOpen } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onMenuClick?: () => void;
}

export function Header({ searchQuery, onSearchChange, onMenuClick }: HeaderProps) {
  const [location] = useLocation();

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
        </nav>

        <div className="flex-1 flex justify-end">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search MPs..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9"
              data-testid="input-search"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
