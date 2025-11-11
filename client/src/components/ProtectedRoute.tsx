import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";

interface AuthResponse {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
}

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery<AuthResponse>({
    queryKey: ["/api/auth/check"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!data?.authenticated || !data?.user?.isAdmin) {
    setLocation("/login");
    return null;
  }

  return <>{children}</>;
}
