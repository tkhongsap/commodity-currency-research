import { NewsResponse, NewsItem, NewsRankingResponse } from "@shared/schema";
import { OpenAIService } from "./openai";

// Multi-region constants for global news collection
export const NEWS_REGIONS = {
  US: { code: "us", name: "United States" },
  UK: { code: "gb", name: "United Kingdom" },
  DE: { code: "de", name: "Germany" },
  JP: { code: "jp", name: "Japan" },
  CN: { code: "cn", name: "China" },
  TH: { code: "th", name: "Thailand" },
  SG: { code: "sg", name: "Singapore" },
  MY: { code: "my", name: "Malaysia" },
} as const;

// Time filter for past week news
export const NEWS_TIME_FILTER = "qdr:w"; // Past week

export type RegionCode =
  (typeof NEWS_REGIONS)[keyof typeof NEWS_REGIONS]["code"];

export class SerperService {
  private apiKey: string;
  private openaiService: OpenAIService;

  constructor() {
    this.apiKey = process.env.SERPER_API_KEY || process.env.SERPER_KEY || "";
    if (!this.apiKey) {
      throw new Error("SERPER_API_KEY is required");
    }
    this.openaiService = new OpenAIService();
  }

  // Helper method to deduplicate news items based on title and source similarity
  private deduplicateNews(items: NewsItem[]): NewsItem[] {
    const seen = new Map<string, NewsItem>();

    for (const item of items) {
      // Create a normalized key based on title and source
      const titleKey = this.normalizeString(item.title);
      const sourceKey = this.normalizeString(item.source);
      const compositeKey = `${titleKey}-${sourceKey}`;

      // Check for similar titles (even from different sources)
      let isDuplicate = false;
      const seenEntries = Array.from(seen.entries());
      for (const [key, existingItem] of seenEntries) {
        const existingTitleKey = key.split("-")[0];
        if (this.isSimilar(titleKey, existingTitleKey)) {
          // Keep the more recent article
          if (new Date(item.publishedAt) > new Date(existingItem.publishedAt)) {
            seen.set(compositeKey, item);
            seen.delete(key);
          }
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        seen.set(compositeKey, item);
      }
    }

    return Array.from(seen.values());
  }

  // Normalize string for comparison
  private normalizeString(str: string): string {
    return str
      .toLowerCase()
      .replace(/[^\w\s]/g, "") // Remove punctuation
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();
  }

  // Check if two normalized strings are similar (simple similarity check)
  private isSimilar(str1: string, str2: string): boolean {
    // Check if strings are identical
    if (str1 === str2) return true;

    // Check if one string contains the other (for different length titles)
    if (str1.includes(str2) || str2.includes(str1)) return true;

    // Check word overlap (at least 70% of words match)
    const words1 = new Set(str1.split(" "));
    const words2 = new Set(str2.split(" "));
    const words1Array = Array.from(words1);
    const words2Array = Array.from(words2);
    const intersection = new Set(words1Array.filter((x) => words2.has(x)));
    const union = new Set([...words1Array, ...words2Array]);

    return intersection.size / union.size >= 0.7;
  }

  async searchNewsByRegion(
    query: string,
    region: RegionCode,
    timeFilter?: string,
  ): Promise<NewsResponse> {
    try {
      const response = await fetch("https://google.serper.dev/news", {
        method: "POST",
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          num: 10,
          gl: region,
          hl: "en",
          ...(timeFilter && { tbs: timeFilter }),
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Serper API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      const items: NewsItem[] = (data.news || []).map((item: any) => ({
        title: item.title || "",
        description: item.snippet || "",
        url: item.link || "",
        publishedAt: item.date || new Date().toISOString(),
        source: item.source || "Unknown",
      }));

      return {
        items,
        query,
      };
    } catch (error) {
      console.error(
        `Error fetching news from Serper for region ${region}:`,
        error,
      );
      throw new Error(`Failed to fetch news data for region ${region}`);
    }
  }

  async collectGlobalNews(
    query: string,
    timeFilter: string = NEWS_TIME_FILTER,
  ): Promise<NewsResponse> {
    const regionCodes = Object.values(NEWS_REGIONS).map((r) => r.code);

    try {
      // Fetch news from all regions in parallel
      const regionalNewsPromises = regionCodes.map((region) =>
        this.searchNewsByRegion(query, region, timeFilter).catch((error) => {
          console.error(`Failed to fetch news for region ${region}:`, error);
          return { items: [], query }; // Return empty result for failed regions
        }),
      );

      const regionalResults = await Promise.all(regionalNewsPromises);

      // Combine all news items from different regions
      const allItems = regionalResults.flatMap((result) => result.items);

      // Deduplicate news items
      const deduplicatedItems = this.deduplicateNews(allItems);

      return {
        items: deduplicatedItems,
        query,
      };
    } catch (error) {
      console.error("Error collecting global news:", error);
      throw new Error("Failed to collect global news data");
    }
  }

  async searchNews(query: string): Promise<NewsResponse> {
    try {
      const response = await fetch("https://google.serper.dev/news", {
        method: "POST",
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          num: 10,
          gl: "us",
          hl: "en",
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Serper API error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();

      const items: NewsItem[] = (data.news || []).map((item: any) => ({
        title: item.title || "",
        description: item.snippet || "",
        url: item.link || "",
        publishedAt: item.date || new Date().toISOString(),
        source: item.source || "Unknown",
      }));

      return {
        items,
        query,
      };
    } catch (error) {
      console.error("Error fetching news from Serper:", error);
      throw new Error("Failed to fetch news data");
    }
  }

  // Build general impact query for search terms
  public buildGeneralImpactQuery(searchTerm: string): string {
    // If it looks like an instrument/commodity name, use quoted search
    const isInstrumentName =
      /^[A-Z]{2,6}[=\-\.]?[FX]?$/i.test(searchTerm.trim()) ||
      [
        "gold",
        "silver", 
        "oil",
        "copper",
        "aluminum",
        "sugar",
        "coffee",
        "wheat",
        "corn",
        "bitcoin",
        "ethereum",
        "steel",
        "baht",
        "ringgit",
        "euro",
        "pound",
        "gbp",
        "thb",
        "myr",
        "eur"
      ].some((commodity) => searchTerm.toLowerCase().includes(commodity));

    const queryTerm = isInstrumentName ? `"${searchTerm}"` : searchTerm;

    return `${queryTerm} (breaking OR urgent OR crisis OR disruption OR sanctions OR conflict OR shortage OR supply chain)`;
  }

  async triageAndRankNews(
    query: string,
    instrumentContext?: string,
  ): Promise<NewsRankingResponse> {
    try {
      // First collect global news from all regions
      const globalNews = await this.collectGlobalNews(query);

      if (globalNews.items.length === 0) {
        return {
          items: [],
          fallbackUsed: true,
        };
      }

      // Use OpenAI to rank the news by impact
      const rankedNews = await this.openaiService.rankNewsByImpact(
        globalNews.items,
        instrumentContext,
      );

      return rankedNews;
    } catch (error) {
      console.error("Error in news triage and ranking:", error);

      // Fallback to basic global news collection without AI ranking
      try {
        const globalNews = await this.collectGlobalNews(query);
        const fallbackItems = globalNews.items
          .sort(
            (a, b) =>
              new Date(b.publishedAt).getTime() -
              new Date(a.publishedAt).getTime(),
          )
          .slice(0, 5)
          .map((item) => ({
            ...item,
            riskScore: 5,
            impactReason: "Fallback mode - AI ranking unavailable",
          }));

        return {
          items: fallbackItems,
          fallbackUsed: true,
        };
      } catch (fallbackError) {
        console.error("Error in fallback news collection:", fallbackError);
        return {
          items: [],
          fallbackUsed: true,
        };
      }
    }
  }

  // Build optimized search query for high-impact news
  private buildImpactQuery(
    instrumentName: string,
    queryType: "primary" | "policy" | "market" | "regional" = "primary",
  ): string {
    const quotedInstrument = `"${instrumentName}"`;

    // Use simplified keyword list for all query types
    return `${quotedInstrument} (breaking OR urgent OR crisis OR disruption OR sanctions OR conflict OR shortage OR supply chain)`;
  }

  async getInstrumentNews(instrumentName: string): Promise<NewsResponse> {
    // Legacy method - keep basic query for backward compatibility
    const searchQuery = `${instrumentName} commodity or currency market news Southeast Asia Thailand`;
    return this.collectGlobalNews(searchQuery);
  }

  // Map display names to optimal search terms for news
  private getOptimalSearchTerm(instrumentName: string): string {
    const searchTermMappings: Record<string, string> = {
      // Commodities - use simpler, more searchable terms
      "Crude Oil (WTI)": "crude oil",
      "Steel (HRC)": "steel prices",
      "Sugar #11": "sugar commodity",
      Aluminum: "aluminum",

      // Currencies - use common market terms
      "Thai Baht": "Thai baht THB",
      "Malaysian Ringgit": "Malaysian ringgit MYR",
      Euro: "euro EUR",
      "British Pound": "British pound GBP",
    };

    return searchTermMappings[instrumentName] || instrumentName;
  }

  async getInstrumentNewsWithRanking(
    instrumentName: string,
  ): Promise<NewsRankingResponse> {
    // Use optimized search term and high-impact query for intelligent ranking
    const optimizedSearchTerm = this.getOptimalSearchTerm(instrumentName);
    const primaryQuery = this.buildImpactQuery(optimizedSearchTerm, "primary");

    try {
      console.log(
        `[NEWS-TRIAGE] Using optimized query for ${instrumentName} (search term: "${optimizedSearchTerm}"): "${primaryQuery}"`,
      );

      // Try primary high-impact query first
      const result = await this.triageAndRankNews(primaryQuery, instrumentName);

      // If we get fewer than 3 results, try fallback queries
      if (result.items.length < 3) {
        console.log(
          `[NEWS-TRIAGE] Primary query returned ${result.items.length} items, trying fallback queries`,
        );

        const fallbackQueries = [
          this.buildImpactQuery(optimizedSearchTerm, "policy"),
          this.buildImpactQuery(optimizedSearchTerm, "market"),
          this.buildImpactQuery(optimizedSearchTerm, "regional"),
        ];

        for (const fallbackQuery of fallbackQueries) {
          try {
            const fallbackResult = await this.triageAndRankNews(
              fallbackQuery,
              instrumentName,
            );
            if (fallbackResult.items.length >= 3) {
              console.log(
                `[NEWS-TRIAGE] Fallback query successful with ${fallbackResult.items.length} items`,
              );
              return fallbackResult;
            }
          } catch (error) {
            console.warn(`[NEWS-TRIAGE] Fallback query failed:`, error);
            continue;
          }
        }
      }

      return result;
    } catch (error) {
      console.error(
        `[NEWS-TRIAGE] Optimized query failed, falling back to basic query:`,
        error,
      );

      // Final fallback to basic query using optimized search term
      const basicQuery = `${optimizedSearchTerm} commodity currency market news Southeast Asia Thailand`;
      return this.triageAndRankNews(basicQuery, instrumentName);
    }
  }
}
