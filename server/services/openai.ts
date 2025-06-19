import OpenAI from "openai";
import {
  AIInsights,
  NewsItem,
  RankedNewsItem,
  NewsRankingResponse,
} from "@shared/schema";

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required");
    }

    this.openai = new OpenAI({ apiKey });
  }

  async generateInsights(
    symbol: string,
    instrumentName: string,
    currentPrice: number,
  ): Promise<AIInsights> {
    try {
      const prompt = `
        Analyze ${instrumentName} (${symbol}) with current price ${currentPrice}. 
        Provide comprehensive market analysis focusing on Southeast Asia and Thailand impact.
        
        Respond with JSON in this exact format:
        {
          "symbol": "${symbol}",
          "marketOverview": "Brief overview of current market conditions",
          "priceEstimates": {
            "threeMonths": number,
            "sixMonths": number,
            "twelveMonths": number,
            "twentyFourMonths": number
          },
          "macroAnalysis": "Analysis of macro economic factors",
          "regionalImpact": "Impact on Southeast Asian economies",
          "thailandImpact": "Specific impact on Thailand",
          "futureOutlook": "Future market outlook"
        }
        
        Make estimates realistic based on current market conditions. Focus on actionable insights.
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

      // Validate and format the response
      return {
        symbol: result.symbol || symbol,
        marketOverview: result.marketOverview || "Market analysis unavailable",
        priceEstimates: {
          threeMonths: Number(
            result.priceEstimates?.threeMonths || currentPrice,
          ),
          sixMonths: Number(result.priceEstimates?.sixMonths || currentPrice),
          twelveMonths: Number(
            result.priceEstimates?.twelveMonths || currentPrice,
          ),
          twentyFourMonths: Number(
            result.priceEstimates?.twentyFourMonths || currentPrice,
          ),
        },
        macroAnalysis: result.macroAnalysis || "Macro analysis unavailable",
        regionalImpact:
          result.regionalImpact || "Regional impact analysis unavailable",
        thailandImpact:
          result.thailandImpact || "Thailand impact analysis unavailable",
        futureOutlook: result.futureOutlook || "Future outlook unavailable",
      };
    } catch (error) {
      console.error("Error generating AI insights:", error);

      // Return a fallback response with current price estimates if OpenAI fails
      return {
        symbol,
        marketOverview: `Current market analysis for ${instrumentName} is temporarily unavailable. The instrument is trading at ${currentPrice}.`,
        priceEstimates: {
          threeMonths: currentPrice * 1.02,
          sixMonths: currentPrice * 1.05,
          twelveMonths: currentPrice * 1.08,
          twentyFourMonths: currentPrice * 1.12,
        },
        macroAnalysis:
          "Detailed macro analysis is temporarily unavailable. Please try again later.",
        regionalImpact:
          "Regional impact analysis for Southeast Asia is temporarily unavailable.",
        thailandImpact:
          "Thailand-specific impact analysis is temporarily unavailable.",
        futureOutlook:
          "Future outlook analysis is temporarily unavailable. Please try again later.",
      };
    }
  }

  async rankNewsByImpact(
    newsItems: NewsItem[],
    instrumentContext?: string,
  ): Promise<NewsRankingResponse> {
    try {
      // Prepare news items for AI analysis
      const newsForAnalysis = newsItems.map((item, index) => ({
        id: index,
        title: item.title,
        description: item.description,
        source: item.source,
        publishedAt: item.publishedAt,
      }));

      const prompt = `
        Analyze the following news articles and rank them by their potential business risk impact on commodities and currencies, particularly focusing on Southeast Asian markets${instrumentContext ? ` related to ${instrumentContext}` : ""}.

        News Articles:
        ${JSON.stringify(newsForAnalysis, null, 2)}

        SCORING GUIDELINES - Use these criteria for consistent 1-10 scoring:
        
        Score 8-10 (CRITICAL): Market-halting events, major geopolitical crises, central bank emergency actions, supply chain collapse, natural disasters affecting major trade routes, sanctions on key commodities/currencies
        
        Score 6-7 (HIGH): Policy changes affecting trade, significant supply disruptions, regional conflicts, major economic data releases, corporate earnings affecting commodity sectors, interest rate decisions
        
        Score 4-5 (MEDIUM): Routine policy announcements, moderate supply/demand shifts, corporate news, regional economic updates, trade negotiations progress
        
        Score 1-3 (LOW): General economic commentary, minor corporate updates, routine market analysis, historical perspectives

        Risk Categories to Evaluate:
        1. Geopolitical risks and conflicts 
        2. Supply chain disruptions
        3. Economic policy changes
        4. Market volatility events  
        5. Natural disasters affecting trade
        6. Central bank decisions
        7. Trade war developments
        8. Commodity supply/production changes

        Respond with JSON in this exact format:
        {
          "rankings": [
            {
              "id": number,
              "riskScore": number (1-10),
              "impactReason": "Concise explanation citing specific risk category and market impact potential"
            }
          ]
        }

        IMPORTANT: 
        - Score conservatively but don't underestimate breaking news or policy changes
        - Include ALL articles (not just 4+) - the enhanced system will handle filtering
        - Be specific about which risk category applies
        - Consider regional relevance to Southeast Asia
      `;

      // Create timeout promise for AI ranking
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("AI ranking timeout")), 10000);
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

      const response = await Promise.race([openaiPromise, timeoutPromise]);
      const result = JSON.parse(response.choices[0].message.content || "{}");

      // Process AI rankings with enhanced hybrid scoring
      const rankedItems: RankedNewsItem[] = [];
      const scoringDebugInfo: string[] = [];

      if (result.rankings && Array.isArray(result.rankings)) {
        for (const ranking of result.rankings) {
          const originalItem = newsItems[ranking.id];
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
    const hoursAgo = (now.getTime() - publishTime.getTime()) / (1000 * 60 * 60);

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
}
