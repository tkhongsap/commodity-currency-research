import { useMutation } from "@tanstack/react-query";
import { useQuery } from "@tanstack/react-query";
import { NewsResponse } from "@shared/schema";
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
    queryKey: ["/api/news", instrument],
    enabled: !!instrument,
  });
}
