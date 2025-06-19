import OpenAI from "openai";
import {
  AIInsights,
  NewsItem,
  RankedNewsItem,
  NewsRankingResponse,
  ForecastData,
} from "@shared/schema";
import { ForecastService } from "./forecast";

export class OpenAIService {
  private openai: OpenAI;
  private forecastService: ForecastService;

  constructor(webSearchFunction?: (params: { query: string; prompt: string }) => Promise<string>) {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required");
    }

    this.openai = new OpenAI({ apiKey });
    this.forecastService = new ForecastService(webSearchFunction);
  }

  async generateInsights(
    symbol: string,
    instrumentName: string,
    currentPrice: number,
  ): Promise<AIInsights> {
    try {
      console.log(`[AI-INSIGHTS] Starting enhanced insights generation for ${symbol}`);
      
      // First, collect institutional forecasts
      const forecasts = await this.forecastService.getForecastsForInstrument(symbol);
      console.log(`[AI-INSIGHTS] Forecasts collected for ${symbol}`);
      
      // Build enhanced prompt with forecast context
      const forecastContext = this.buildForecastContext(forecasts);
      
      const prompt = `
        Analyze ${instrumentName} (${symbol}) with current price ${currentPrice}. 
        
        ${forecastContext}
        
        Provide comprehensive market analysis focusing on Southeast Asia and Thailand impact.
        Consider the institutional forecasts above when making your analysis.
        
        Respond with JSON in this exact format:
        {
          "symbol": "${symbol}",
          "marketOverview": "Brief overview of current market conditions, referencing available forecasts",
          "priceEstimates": "DO_NOT_INCLUDE_THIS_FIELD",
          "macroAnalysis": "Analysis of macro economic factors",
          "regionalImpact": "Impact on Southeast Asian economies",
          "thailandImpact": "Specific impact on Thailand",
          "futureOutlook": "Future market outlook based on institutional forecasts and analysis"
        }
        
        IMPORTANT: Do not include priceEstimates in your response as they will be handled separately.
      `;

      // Create timeout promise to limit OpenAI API call duration
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("OpenAI API timeout")), 20000);
      });

      // Using gpt-4.1-mini as requested by the user
      const openaiPromise = this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a financial market analyst specializing in commodities and currencies with expertise in Southeast Asian markets. Provide accurate, actionable insights based on real market data and economic fundamentals.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500,
      });

      const response = await Promise.race([openaiPromise, timeoutPromise]);

      const result = JSON.parse(response.choices[0].message.content || "{}");

      // Combine AI analysis with institutional forecasts
      return {
        symbol: result.symbol || symbol,
        marketOverview: result.marketOverview || "Market analysis unavailable",
        priceEstimates: {
          threeMonths: forecasts.threeMonths,
          sixMonths: forecasts.sixMonths,
          twelveMonths: forecasts.twelveMonths,
          twentyFourMonths: forecasts.twentyFourMonths,
        },
        macroAnalysis: result.macroAnalysis || "Macro analysis unavailable",
        regionalImpact:
          result.regionalImpact || "Regional impact analysis unavailable",
        thailandImpact:
          result.thailandImpact || "Thailand impact analysis unavailable",
        futureOutlook: result.futureOutlook || "Future outlook unavailable",
        forecastDisclaimer: forecasts.forecastDisclaimer,
      };
    } catch (error) {
      console.error("Error generating AI insights:", error);

      // Try to get forecasts even if AI analysis fails
      let fallbackForecasts;
      try {
        fallbackForecasts = await this.forecastService.getForecastsForInstrument(symbol);
      } catch (forecastError) {
        console.error("Error getting fallback forecasts:", forecastError);
        fallbackForecasts = this.createEmptyForecasts(symbol);
      }

      // Return a fallback response with institutional forecasts (if available)
      return {
        symbol,
        marketOverview: `Current market analysis for ${instrumentName} is temporarily unavailable. The instrument is trading at ${currentPrice}.`,
        priceEstimates: {
          threeMonths: fallbackForecasts.threeMonths,
          sixMonths: fallbackForecasts.sixMonths,
          twelveMonths: fallbackForecasts.twelveMonths,
          twentyFourMonths: fallbackForecasts.twentyFourMonths,
        },
        macroAnalysis:
          "Detailed macro analysis is temporarily unavailable. Please try again later.",
        regionalImpact:
          "Regional impact analysis for Southeast Asia is temporarily unavailable.",
        thailandImpact:
          "Thailand-specific impact analysis is temporarily unavailable.",
        futureOutlook:
          "Future outlook analysis is temporarily unavailable. Please try again later.",
        forecastDisclaimer: fallbackForecasts.forecastDisclaimer,
      };
    }
  }

  async rankNewsByImpact(
    newsItems: NewsItem[],
    instrumentContext?: string,
  ): Promise<NewsRankingResponse> {
    try {
      // Test OpenAI connection first
      console.log(`[NEWS-TRIAGE] Testing OpenAI connection...`);
      if (!process.env.OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY not found in environment variables");
      }
      console.log(`[NEWS-TRIAGE] OpenAI API key found, length: ${process.env.OPENAI_API_KEY.length}`);
      
      // Quick connection test
      try {
        await this.openai.models.list();
        console.log(`[NEWS-TRIAGE] OpenAI connection test successful`);
      } catch (testError) {
        console.error(`[NEWS-TRIAGE] OpenAI connection test failed:`, testError);
        throw new Error(`OpenAI connection failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
      }
      // Prepare news items for AI analysis - limit to 8 most recent articles for faster processing
      const recentNewsItems = newsItems
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .slice(0, 8);
        
      const newsForAnalysis = recentNewsItems.map((item, index) => ({
        id: index,
        title: item.title,
        description: item.description,
        source: item.source,
        publishedAt: item.publishedAt,
      }));

      const prompt = `Rank these ${newsForAnalysis.length} news articles by market impact on ${instrumentContext || "commodities"} (1-10 scale):

${newsForAnalysis.map((article, index) => `${index}: "${article.title}" - ${article.description.slice(0, 80)}...`).join('\n')}

Risk levels: Supply disruption (6-9), Geopolitics (5-8), Policy (4-7), Economics (3-6), Sentiment (2-5).

JSON response:
{
  "rankings": [
    {"id": number, "riskScore": number, "impactReason": "brief reason"}
  ]
}

Include ALL articles. Prioritize Southeast Asia relevance.`;

      // Create timeout promise for AI ranking - increased to 30 seconds for better reliability
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("AI ranking timeout")), 30000);
      });

      // Using GPT-4.1-mini for cost-effective news ranking
      const openaiPromise = this.openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a financial risk analyst specializing in commodity and currency markets with focus on Southeast Asian economies. Your role is to provide consistent, objective risk scoring based on market impact potential. Use the provided scoring guidelines strictly and be specific about risk categories. Your scores will be enhanced by algorithmic factors including recency, source credibility, and keyword analysis.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.4, // Slightly higher temperature for nuanced scoring
        max_tokens: 1200,
      });

      console.log(`[NEWS-TRIAGE] Sending ${newsForAnalysis.length} articles to OpenAI for ranking...`);
      const response = await Promise.race([openaiPromise, timeoutPromise]);
      console.log(`[NEWS-TRIAGE] OpenAI response received successfully`);
      const rawContent = response.choices[0].message.content || "{}";
      console.log(`[NEWS-TRIAGE] Raw OpenAI response: ${rawContent.slice(0, 500)}...`);
      const result = JSON.parse(rawContent);

      // Process AI rankings with enhanced hybrid scoring
      const rankedItems: RankedNewsItem[] = [];
      const scoringDebugInfo: string[] = [];

      console.log(`[NEWS-TRIAGE] Processing AI rankings: ${result.rankings ? result.rankings.length : 0} items`);
      
      if (result.rankings && Array.isArray(result.rankings)) {
        console.log(`[NEWS-TRIAGE] AI rankings structure validated, processing ${result.rankings.length} rankings`);
        for (const ranking of result.rankings) {
          console.log(`[NEWS-TRIAGE] Processing ranking: ID ${ranking.id}, Score ${ranking.riskScore}`);
          const originalItem = recentNewsItems[ranking.id];
          if (originalItem) {
            const baseAiScore = Math.min(Math.max(ranking.riskScore, 1), 10);
            
            // Apply hybrid scoring system
            const { finalScore, breakdown } = this.calculateHybridRiskScore(
              baseAiScore,
              originalItem
            );

            // Use dynamic threshold: accept articles with enhanced score ≥ 3.0
            if (finalScore >= 3.0) {
              rankedItems.push({
                ...originalItem,
                riskScore: finalScore,
                impactReason: `${ranking.impactReason || "Impact assessment unavailable"} [${breakdown}]`,
              });

              scoringDebugInfo.push(
                `${originalItem.title.slice(0, 50)}... - ${breakdown}`
              );
            }
          }
        }
      }

      // Sort by enhanced risk score (highest first) and limit to top 5
      rankedItems.sort((a, b) => b.riskScore - a.riskScore);
      const top5Items = rankedItems.slice(0, 5);

      // Log enhanced scoring details for monitoring
      if (top5Items.length > 0) {
        const stats = this.getEnhancedScoringStats(top5Items);
        console.log(`[NEWS-TRIAGE] Enhanced scoring results: ${top5Items.length} articles, avg score: ${stats.avgScore}, high-risk: ${stats.scoreDistribution.high}`);
        console.log(`[NEWS-TRIAGE] Enhancement factors - Recency: ${stats.enhancementFactors.recency}x, Source: ${stats.enhancementFactors.source}x, Keywords: ${stats.enhancementFactors.keywords}x, Geo: ${stats.enhancementFactors.geo}x`);
        
        if (scoringDebugInfo.length > 0) {
          console.log(`[NEWS-TRIAGE] Top scoring articles:`);
          scoringDebugInfo.slice(0, 3).forEach(info => console.log(`[NEWS-TRIAGE] ${info}`));
        }
      }

      if (top5Items.length === 0) {
        // Fallback to chronological sorting if AI ranking fails
        return this.fallbackToChronological(newsItems);
      }

      return {
        items: top5Items,
        fallbackUsed: false,
      };
    } catch (error) {
      console.error("Error ranking news by impact:", error);
      if (error instanceof Error) {
        console.error(`[NEWS-TRIAGE] Error details: ${error.message}`);
        console.error(`[NEWS-TRIAGE] Error stack: ${error.stack}`);
      }
      return this.fallbackToChronological(newsItems);
    }
  }

  private fallbackToChronological(newsItems: NewsItem[]): NewsRankingResponse {
    // Apply enhanced scoring even in fallback mode
    const enhancedItems = newsItems.map((item) => {
      const baseScore = 5; // Default AI score for fallback
      const { finalScore, breakdown } = this.calculateHybridRiskScore(baseScore, item);
      
      return {
        ...item,
        riskScore: finalScore,
        impactReason: `Chronological fallback - AI ranking unavailable [${breakdown}]`,
      };
    });

    // Sort by enhanced score first, then by recency, and take top 5
    const sortedItems = enhancedItems
      .sort((a, b) => {
        if (Math.abs(a.riskScore - b.riskScore) < 0.1) {
          // If scores are very close, prefer more recent
          return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
        }
        return b.riskScore - a.riskScore;
      })
      .slice(0, 5);

    console.log(`[NEWS-TRIAGE] Fallback mode: Enhanced scoring applied to ${sortedItems.length} articles`);

    return {
      items: sortedItems,
      fallbackUsed: true,
    };
  }

  // Enhanced scoring utilities for multi-factor risk assessment
  private calculateRecencyMultiplier(publishedAt: string): number {
    const now = new Date();
    const publishTime = new Date(publishedAt);
    
    // Check for invalid dates
    if (isNaN(publishTime.getTime()) || isNaN(now.getTime())) {
      console.warn(`[NEWS-TRIAGE] Invalid date format: ${publishedAt}, using default multiplier`);
      return 1.0; // Default multiplier for invalid dates
    }
    
    const hoursAgo = (now.getTime() - publishTime.getTime()) / (1000 * 60 * 60);
    
    // Check for negative or unreasonable time differences
    if (hoursAgo < 0 || hoursAgo > 8760) { // More than a year
      console.warn(`[NEWS-TRIAGE] Unreasonable time difference: ${hoursAgo} hours, using default multiplier`);
      return 1.0;
    }

    if (hoursAgo < 2) return 1.5;    // Breaking news
    if (hoursAgo < 6) return 1.3;    // Very recent
    if (hoursAgo < 24) return 1.1;   // Recent
    if (hoursAgo < 72) return 1.0;   // Normal
    return Math.max(0.8, 1.0 - (hoursAgo - 72) / 168); // Exponential decay over week
  }

  private calculateSourceCredibilityWeight(source: string): number {
    const normalizedSource = source.toLowerCase();
    
    // Tier 1: Premium financial sources
    const tier1Sources = ['reuters', 'bloomberg', 'wall street journal', 'wsj', 'financial times', 'ft'];
    if (tier1Sources.some(s => normalizedSource.includes(s))) return 1.3;
    
    // Tier 2: Established news sources
    const tier2Sources = ['associated press', 'ap news', 'cnn', 'bbc', 'cnbc', 'marketwatch', 'yahoo finance'];
    if (tier2Sources.some(s => normalizedSource.includes(s))) return 1.1;
    
    // Tier 3: Regional/specialized sources
    const tier3Sources = ['nikkei', 'south china morning post', 'straits times', 'bangkok post', 'the nation'];
    if (tier3Sources.some(s => normalizedSource.includes(s))) return 1.05;
    
    // Unknown sources get slight penalty
    return 0.9;
  }

  private calculateKeywordImpactBoost(title: string, description: string): number {
    const text = `${title} ${description}`.toLowerCase();
    let boost = 1.0;

    // Critical keywords (+30%)
    const criticalKeywords = ['breaking', 'emergency', 'halt', 'halted', 'suspend', 'suspended', 'banned', 'embargo'];
    if (criticalKeywords.some(keyword => text.includes(keyword))) boost *= 1.3;

    // High-impact keywords (+20%)
    const highImpactKeywords = ['crisis', 'disruption', 'sanctions', 'conflict', 'war', 'invasion', 'shortage', 'collapse'];
    if (highImpactKeywords.some(keyword => text.includes(keyword))) boost *= 1.2;

    // Market-moving keywords (+15%)
    const marketKeywords = ['central bank', 'interest rate', 'fed decision', 'supply chain', 'inflation', 'recession'];
    if (marketKeywords.some(keyword => text.includes(keyword))) boost *= 1.15;

    // Policy keywords (+10%)
    const policyKeywords = ['regulation', 'policy', 'government', 'tariff', 'trade deal', 'agreement'];
    if (policyKeywords.some(keyword => text.includes(keyword))) boost *= 1.1;

    return Math.min(boost, 1.8); // Cap total keyword boost at 80%
  }

  private calculateGeographicRelevance(title: string, description: string, source: string): number {
    const text = `${title} ${description} ${source}`.toLowerCase();
    let relevance = 1.0;

    // Southeast Asian countries/regions
    const seaKeywords = ['thailand', 'singapore', 'malaysia', 'vietnam', 'philippines', 'indonesia', 'southeast asia', 'asean'];
    if (seaKeywords.some(keyword => text.includes(keyword))) relevance *= 1.25;

    // Thailand-specific boost
    const thailandKeywords = ['thailand', 'thai', 'bangkok', 'bank of thailand', 'bot'];
    if (thailandKeywords.some(keyword => text.includes(keyword))) relevance *= 1.3;

    // Regional trade/economic terms
    const regionalEconKeywords = ['asia pacific', 'regional trade', 'asian markets', 'emerging markets'];
    if (regionalEconKeywords.some(keyword => text.includes(keyword))) relevance *= 1.2;

    return Math.min(relevance, 1.6); // Cap geographic boost at 60%
  }

  private calculateHybridRiskScore(
    baseAiScore: number,
    newsItem: NewsItem
  ): { finalScore: number; breakdown: string } {
    const recencyMultiplier = this.calculateRecencyMultiplier(newsItem.publishedAt);
    const sourceWeight = this.calculateSourceCredibilityWeight(newsItem.source);
    const keywordBoost = this.calculateKeywordImpactBoost(newsItem.title, newsItem.description);
    const geoRelevance = this.calculateGeographicRelevance(newsItem.title, newsItem.description, newsItem.source);

    const finalScore = Math.min(
      Math.max(baseAiScore * recencyMultiplier * sourceWeight * keywordBoost * geoRelevance, 1),
      10
    );

    const breakdown = `AI:${baseAiScore} × Recency:${recencyMultiplier.toFixed(2)} × Source:${sourceWeight.toFixed(2)} × Keywords:${keywordBoost.toFixed(2)} × Geo:${geoRelevance.toFixed(2)} = ${finalScore.toFixed(1)}`;

    return { finalScore: Math.round(finalScore * 10) / 10, breakdown };
  }

  // Method to get enhanced scoring statistics for monitoring
  public getEnhancedScoringStats(rankedItems: RankedNewsItem[]): {
    avgScore: number;
    scoreDistribution: { low: number; medium: number; high: number };
    enhancementFactors: { recency: number; source: number; keywords: number; geo: number };
  } {
    if (rankedItems.length === 0) {
      return {
        avgScore: 0,
        scoreDistribution: { low: 0, medium: 0, high: 0 },
        enhancementFactors: { recency: 0, source: 0, keywords: 0, geo: 0 }
      };
    }

    const avgScore = rankedItems.reduce((sum, item) => sum + item.riskScore, 0) / rankedItems.length;
    
    const scoreDistribution = rankedItems.reduce(
      (dist, item) => {
        if (item.riskScore <= 4) dist.low++;
        else if (item.riskScore <= 7) dist.medium++;
        else dist.high++;
        return dist;
      },
      { low: 0, medium: 0, high: 0 }
    );

    // Extract enhancement factors from breakdown strings
    const factorStats = rankedItems.reduce(
      (stats, item) => {
        const breakdown = item.impactReason.match(/\[(.*?)\]/)?.[1] || "";
        const recencyMatch = breakdown.match(/Recency:([\d.]+)/);
        const sourceMatch = breakdown.match(/Source:([\d.]+)/);
        const keywordsMatch = breakdown.match(/Keywords:([\d.]+)/);
        const geoMatch = breakdown.match(/Geo:([\d.]+)/);

        if (recencyMatch) stats.recency += parseFloat(recencyMatch[1]);
        if (sourceMatch) stats.source += parseFloat(sourceMatch[1]);
        if (keywordsMatch) stats.keywords += parseFloat(keywordsMatch[1]);
        if (geoMatch) stats.geo += parseFloat(geoMatch[1]);
        stats.count++;
        
        return stats;
      },
      { recency: 0, source: 0, keywords: 0, geo: 0, count: 0 }
    );

    return {
      avgScore: Math.round(avgScore * 100) / 100,
      scoreDistribution,
      enhancementFactors: {
        recency: Math.round((factorStats.recency / factorStats.count) * 100) / 100,
        source: Math.round((factorStats.source / factorStats.count) * 100) / 100,
        keywords: Math.round((factorStats.keywords / factorStats.count) * 100) / 100,
        geo: Math.round((factorStats.geo / factorStats.count) * 100) / 100
      }
    };
  }

  // Helper method to build forecast context for AI prompt
  private buildForecastContext(forecasts: any): string {
    const forecastLines: string[] = [
      "\n=== INSTITUTIONAL FORECASTS AVAILABLE ===",
    ];

    // Check each timeframe and add to context if available
    if (forecasts.threeMonths.value !== null) {
      const sources = forecasts.threeMonths.sources.map((s: any) => s.name).join(", ");
      forecastLines.push(`3-Month Forecast: ${forecasts.threeMonths.value} (Sources: ${sources})`);
    } else {
      forecastLines.push("3-Month Forecast: Not available");
    }

    if (forecasts.sixMonths.value !== null) {
      const sources = forecasts.sixMonths.sources.map((s: any) => s.name).join(", ");
      forecastLines.push(`6-Month Forecast: ${forecasts.sixMonths.value} (Sources: ${sources})`);
    } else {
      forecastLines.push("6-Month Forecast: Not available");
    }

    if (forecasts.twelveMonths.value !== null) {
      const sources = forecasts.twelveMonths.sources.map((s: any) => s.name).join(", ");
      forecastLines.push(`12-Month Forecast: ${forecasts.twelveMonths.value} (Sources: ${sources})`);
    } else {
      forecastLines.push("12-Month Forecast: Not available");
    }

    if (forecasts.twentyFourMonths.value !== null) {
      const sources = forecasts.twentyFourMonths.sources.map((s: any) => s.name).join(", ");
      forecastLines.push(`24-Month Forecast: ${forecasts.twentyFourMonths.value} (Sources: ${sources})`);
    } else {
      forecastLines.push("24-Month Forecast: Not available");
    }

    forecastLines.push("=== END FORECASTS ===\n");

    return forecastLines.join("\n");
  }

  // Helper method to create empty forecasts for fallback
  private createEmptyForecasts(symbol: string) {
    const emptyForecast: ForecastData = {
      value: null,
      sources: [],
      methodology: "Forecast unavailable",
      lastUpdated: new Date().toISOString(),
    };

    return {
      symbol,
      threeMonths: emptyForecast,
      sixMonths: emptyForecast,
      twelveMonths: emptyForecast,
      twentyFourMonths: emptyForecast,
      forecastDisclaimer: "No institutional forecasts available. Independent analysis not provided.",
    };
  }
}
