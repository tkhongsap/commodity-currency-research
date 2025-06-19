import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { NewsResponse, NewsRankingResponse } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

export function useNewsSearch() {
  return useMutation({
    mutationFn: async (query: string): Promise<NewsResponse> => {
      const response = await apiRequest("POST", "/api/news/search", { query });
      return response.json();
    },
  });
}

export function useInstrumentNews(instrument: string) {
  return useQuery<NewsResponse>({
    queryKey: [`/api/news/${encodeURIComponent(instrument)}`],
    enabled: !!instrument,
  });
}

export function useIntelligentNewsSearch() {
  return useMutation({
    mutationFn: async (query: string): Promise<NewsRankingResponse> => {
      const response = await apiRequest("POST", "/api/news/intelligent-search", { query });
      return response.json();
    },
  });
}

export function useInstrumentIntelligentNews(instrument: string) {
  return useQuery<NewsRankingResponse>({
    queryKey: [`/api/news/intelligent/${encodeURIComponent(instrument)}`],
    enabled: !!instrument,
  });
}
