import { useQuery } from "@tanstack/react-query";
import type { Constituency } from "@shared/schema";

async function fetchConstituencies(): Promise<Constituency[]> {
  const response = await fetch("/api/constituencies");
  if (!response.ok) {
    throw new Error("Failed to fetch constituencies");
  }
  return response.json();
}

export function useConstituencies() {
  return useQuery({
    queryKey: ["constituencies"],
    queryFn: fetchConstituencies,
    staleTime: 1000 * 60 * 60, // 1 hour - this data doesn't change often
  });
}

export function useConstituencyByCode(code: string | undefined) {
  return useQuery({
    queryKey: ["constituency", code],
    queryFn: async () => {
      if (!code) return null;
      const response = await fetch(`/api/constituencies/code/${code}`);
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error("Failed to fetch constituency");
      }
      return response.json();
    },
    enabled: !!code,
    staleTime: 1000 * 60 * 60, // 1 hour
  });
}
