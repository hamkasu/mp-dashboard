import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

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

  useEffect(() => {
    if (!isLoading && (!data?.authenticated || !data?.user?.isAdmin)) {
      setLocation("/login");
    }
  }, [isLoading, data, setLocation]);

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
    return null;
  }

  return <>{children}</>;
}
