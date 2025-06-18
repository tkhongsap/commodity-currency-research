import OpenAI from "openai";
import { AIInsights } from '@shared/schema';

export class OpenAIService {
  private openai: OpenAI;
  
  constructor() {
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || '';
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }
    
    this.openai = new OpenAI({ apiKey });
  }
  
  async generateInsights(symbol: string, instrumentName: string, currentPrice: number): Promise<AIInsights> {
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
        setTimeout(() => reject(new Error('OpenAI API timeout')), 20000);
      });
      
      // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      const openaiPromise = this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a financial market analyst specializing in commodities and currencies with expertise in Southeast Asian markets. Provide accurate, actionable insights based on real market data and economic fundamentals."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 1500,
      });
      
      const response = await Promise.race([openaiPromise, timeoutPromise]);
      
      const result = JSON.parse(response.choices[0].message.content || '{}');
      
      // Validate and format the response
      return {
        symbol: result.symbol || symbol,
        marketOverview: result.marketOverview || 'Market analysis unavailable',
        priceEstimates: {
          threeMonths: Number(result.priceEstimates?.threeMonths || currentPrice),
          sixMonths: Number(result.priceEstimates?.sixMonths || currentPrice),
          twelveMonths: Number(result.priceEstimates?.twelveMonths || currentPrice),
          twentyFourMonths: Number(result.priceEstimates?.twentyFourMonths || currentPrice),
        },
        macroAnalysis: result.macroAnalysis || 'Macro analysis unavailable',
        regionalImpact: result.regionalImpact || 'Regional impact analysis unavailable',
        thailandImpact: result.thailandImpact || 'Thailand impact analysis unavailable',
        futureOutlook: result.futureOutlook || 'Future outlook unavailable',
      };
    } catch (error) {
      console.error('Error generating AI insights:', error);
      
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
        macroAnalysis: 'Detailed macro analysis is temporarily unavailable. Please try again later.',
        regionalImpact: 'Regional impact analysis for Southeast Asia is temporarily unavailable.',
        thailandImpact: 'Thailand-specific impact analysis is temporarily unavailable.',
        futureOutlook: 'Future outlook analysis is temporarily unavailable. Please try again later.',
      };
    }
  }
}
