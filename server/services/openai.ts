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

        Risk Categories to Consider:
        1. Geopolitical risks and conflicts
        2. Supply chain disruptions  
        3. Economic policy changes
        4. Market volatility events
        5. Natural disasters affecting trade
        6. Central bank decisions
        7. Trade war developments
        8. Commodity supply/production changes

        Rank each article by business risk impact on a scale of 1-10 (where 10 is highest impact) and provide reasoning.

        Respond with JSON in this exact format:
        {
          "rankings": [
            {
              "id": number,
              "riskScore": number (1-10),
              "impactReason": "Brief explanation of why this article is considered high/medium/low impact"
            }
          ]
        }

        Focus on:
        - Market-moving events that could affect commodity/currency prices
        - Regional events that specifically impact Southeast Asian economies
        - Breaking news that requires immediate attention
        - Policy changes that affect trade and market sentiment
        
        Sort rankings by risk score (highest first). Only include articles with risk scores of 4 or higher.
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
              "You are a financial risk analyst specializing in commodity and currency markets. Your job is to quickly assess news articles for their potential market impact, particularly focusing on Southeast Asian markets. Be concise and actionable in your analysis.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        response_format: { type: "json_object" },
        temperature: 0.3, // Lower temperature for more consistent scoring
        max_tokens: 1000,
      });

      const response = await Promise.race([openaiPromise, timeoutPromise]);
      const result = JSON.parse(response.choices[0].message.content || "{}");

      // Process AI rankings and merge with original news items
      const rankedItems: RankedNewsItem[] = [];

      if (result.rankings && Array.isArray(result.rankings)) {
        for (const ranking of result.rankings) {
          const originalItem = newsItems[ranking.id];
          if (originalItem && ranking.riskScore >= 4) {
            rankedItems.push({
              ...originalItem,
              riskScore: Math.min(Math.max(ranking.riskScore, 1), 10), // Ensure score is 1-10
              impactReason:
                ranking.impactReason || "Impact assessment unavailable",
            });
          }
        }
      }

      // Sort by risk score (highest first) and limit to top 5
      rankedItems.sort((a, b) => b.riskScore - a.riskScore);
      const top5Items = rankedItems.slice(0, 5);

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
    // Sort by publication date (most recent first) and take top 5
    const sortedItems = newsItems
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
      )
      .slice(0, 5)
      .map((item) => ({
        ...item,
        riskScore: 5, // Default medium risk score
        impactReason: "Chronological fallback - AI ranking unavailable",
      }));

    return {
      items: sortedItems,
      fallbackUsed: true,
    };
  }
}
