import { useQuery } from "@tanstack/react-query";
import { AIInsights } from "@shared/schema";

export function useAIInsights(symbol: string) {
  return useQuery<AIInsights>({
    queryKey: [`/api/insights/${encodeURIComponent(symbol)}`],
    enabled: !!symbol,
    staleTime: 5 * 60 * 1000, // 5 minutes - insights don't change frequently
  });
}
