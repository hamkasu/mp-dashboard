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
      // Normalize code format: P210 -> P.210, P001 -> P.001
      const normalizedCode = code.replace(/^P(\d+)$/, (_, num) => `P.${num.padStart(3, '0')}`);
      const response = await fetch(`/api/constituencies/code/${normalizedCode}`);
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
