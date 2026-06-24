/**
 * Copyright by Calmic Sdn Bhd
 *
 * useAuth — lightweight hook for public user auth + subscription state.
 * Wraps GET /api/auth/me which returns { user, isPremium }.
 * Uses returnNull on 401 so unauthenticated users get a clean null state.
 */

import { useQuery } from "@tanstack/react-query";

interface AuthUser {
  id: string;
  email: string;
  name: string;
  emailVerified: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface AuthState {
  user: AuthUser | null;
  isPremium: boolean;
}

async function fetchAuthState(): Promise<AuthState> {
  const res = await fetch("/api/auth/me", { credentials: "include" });
  if (!res.ok) return { user: null, isPremium: false };
  return res.json();
}

export function useAuth() {
  const { data, isLoading } = useQuery<AuthState>({
    queryKey: ["/api/auth/me"],
    queryFn: fetchAuthState,
    staleTime: 5 * 60 * 1000, // 5 minutes — re-check after navigating
    retry: false,
  });

  return {
    user: data?.user ?? null,
    isPremium: data?.isPremium ?? false,
    isLoading,
  };
}
