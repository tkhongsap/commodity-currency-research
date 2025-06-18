import { useQuery } from "@tanstack/react-query";
import { PriceData } from "@shared/schema";

export function usePriceData(autoRefresh = true) {
  return useQuery<PriceData[]>({
    queryKey: ["/api/prices"],
    refetchInterval: autoRefresh ? 60000 : false, // 60 seconds
    staleTime: 30000, // Consider data stale after 30 seconds
  });
}

export function useSpecificPrice(symbol: string) {
  return useQuery<PriceData>({
    queryKey: ["/api/prices", symbol],
    enabled: !!symbol,
  });
}
