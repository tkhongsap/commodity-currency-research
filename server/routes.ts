import type { Express } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { YahooFinanceService } from "./services/yahoo-finance";
import { SerperService } from "./services/serper";
import { OpenAIService } from "./services/openai";
import { SearchRequestSchema } from "@shared/schema";

// Production setup using OpenAI's web search capabilities
// No mock data or external WebSearch dependencies required

export async function registerRoutes(app: Express): Promise<Server> {
  const yahooFinanceService = new YahooFinanceService();
  const serperService = new SerperService();
  
  // Create OpenAI WebSearch wrapper for production use
  const webSearchWrapper = async (params: { query: string; prompt: string }): Promise<string> => {
    console.log(`[FORECAST-WEB-SEARCH] Executing web search with query: "${params.query}"`);
    console.log(`[FORECAST-WEB-SEARCH] Search context: "${params.prompt}"`);
    
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_KEY || "";
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is required for web search functionality");
    }

    const openai = new OpenAI({ apiKey });
    
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-search-preview",
        web_search_options: {},
        messages: [
          {
            role: "system",
            content: `You are a financial market research assistant. ${params.prompt}. Focus on finding specific numerical price forecasts, analyst targets, and institutional research. Always include source names and publication dates when available.`
          },
          {
            role: "user",
            content: params.query
          }
        ],
        max_tokens: 1500
      });

      const result = completion.choices[0].message.content || "";
      console.log(`[FORECAST-WEB-SEARCH] Search completed, result length: ${result.length}`);
      console.log(`[FORECAST-WEB-SEARCH] Result preview: ${result.slice(0, 200)}...`);
      
      return result;
    } catch (error) {
      console.error('[FORECAST-WEB-SEARCH] OpenAI web search error:', error);
      throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  
  const openaiService = new OpenAIService(webSearchWrapper);

  // Admin endpoint to clear forecast cache
  app.post("/api/admin/clear-cache", (req, res) => {
    try {
      openaiService.clearForecastCache();
      res.json({ success: true, message: "Forecast cache cleared" });
    } catch (error) {
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // Admin debug endpoint to test forecast functionality
  app.get("/api/admin/debug-forecast/:symbol", async (req, res) => {
    const { symbol } = req.params;
    console.log(`[FORECAST-DEBUG] Admin debug request for symbol: ${symbol}`);
    
    try {
      // Test OpenAI web search wrapper directly
      const testQuery = `"Crude Oil WTI" price forecast 2025 "3 months" Goldman Sachs`;
      console.log(`[FORECAST-DEBUG] Testing OpenAI web search with query: ${testQuery}`);
      
      const webSearchResult = await webSearchWrapper({
        query: testQuery,
        prompt: "Extract numerical price forecasts for 3M timeframe."
      });
      
      console.log(`[FORECAST-DEBUG] OpenAI web search test result: ${webSearchResult}`);
      
      // Get forecast stats
      const forecastService = (openaiService as any).forecastService;
      const cacheStats = forecastService ? forecastService.getCacheStats() : { size: 0, keys: [] };
      
      res.json({
        success: true,
        debug: {
          symbol,
          openaiWebSearchAvailable: true,
          webSearchTest: {
            query: testQuery,
            result: webSearchResult,
            resultLength: webSearchResult?.length || 0
          },
          cacheStats,
          timestamp: new Date().toISOString()
        }
      });
      
    } catch (error) {
      console.error(`[FORECAST-DEBUG] Debug endpoint error:`, error);
      res.status(500).json({ 
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        debug: {
          symbol,
          openaiWebSearchAvailable: true,
          timestamp: new Date().toISOString()
        }
      });
    }
  });

  // Admin endpoint to test forecast extraction for a specific symbol
  app.get("/api/admin/test-forecast/:symbol", async (req, res) => {
    const { symbol } = req.params;
    console.log(`[FORECAST-DEBUG] Testing forecast extraction for: ${symbol}`);
    
    try {
      // Clear cache first to get fresh results
      openaiService.clearForecastCache();
      
      // Get current price for context
      const priceData = await yahooFinanceService.getPrice(symbol);
      
      // Generate insights which will trigger forecast collection
      const insights = await openaiService.generateInsights(
        symbol,
        priceData?.name || symbol,
        priceData?.price || 100
      );
      
      res.json({
        success: true,
        symbol,
        currentPrice: priceData?.price || 100,
        forecasts: insights.priceEstimates,
        disclaimer: insights.forecastDisclaimer,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`[FORECAST-DEBUG] Test forecast error:`, error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        symbol,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Get all price data
  app.get("/api/prices", async (req, res) => {
    try {
      const prices = await yahooFinanceService.getAllPrices();
      res.json(prices);
    } catch (error) {
      console.error("Error fetching prices:", error);
      res.status(500).json({ 
        error: "Failed to fetch price data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get specific price data
  app.get("/api/prices/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const price = await yahooFinanceService.getPrice(symbol);
      
      if (!price) {
        return res.status(404).json({ error: "Price data not found" });
      }
      
      res.json(price);
    } catch (error) {
      console.error(`Error fetching price for ${req.params.symbol}:`, error);
      res.status(500).json({ 
        error: "Failed to fetch price data",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Search news (legacy route - basic search)
  app.post("/api/news/search", async (req, res) => {
    try {
      const { query } = SearchRequestSchema.parse(req.body);
      const news = await serperService.searchNews(query);
      res.json(news);
    } catch (error) {
      console.error("Error searching news:", error);
      res.status(500).json({ 
        error: "Failed to search news",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Intelligent news search with AI ranking (15 second timeout)
  app.post("/api/news/intelligent-search", async (req, res) => {
    const startTime = Date.now();
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.warn(`[NEWS-TRIAGE] Intelligent search timeout after 15s for query: ${req.body.query}`);
        res.status(504).json({ 
          error: "Request timeout",
          message: "Intelligent news search took too long. Please try again."
        });
      }
    }, 15000);

    try {
      const { query } = SearchRequestSchema.parse(req.body);
      console.log(`[NEWS-TRIAGE] Starting intelligent search for query: "${query}"`);
      
      // Use enhanced query building for better impact detection
      const optimizedQuery = serperService.buildGeneralImpactQuery ? 
        serperService.buildGeneralImpactQuery(query) : query;
      
      console.log(`[NEWS-TRIAGE] Optimized query: "${optimizedQuery}"`);
      const rankedNews = await serperService.triageAndRankNews(optimizedQuery);
      const duration = Date.now() - startTime;
      
      // Log performance metrics
      console.log(`[NEWS-TRIAGE] Intelligent search completed in ${duration}ms`);
      console.log(`[NEWS-TRIAGE] Query: "${query}", Articles: ${rankedNews.items.length}, Fallback: ${rankedNews.fallbackUsed}`);
      
      if (rankedNews.fallbackUsed) {
        console.warn(`[NEWS-TRIAGE] Fallback mode used for query: "${query}"`);
      }
      
      clearTimeout(timeoutId);
      if (!res.headersSent) {
        res.json(rankedNews);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      clearTimeout(timeoutId);
      console.error(`[NEWS-TRIAGE] Error in intelligent news search after ${duration}ms:`, error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to perform intelligent news search",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Get instrument-specific news (legacy route - basic search)
  app.get("/api/news/:instrument", async (req, res) => {
    try {
      const { instrument } = req.params;
      const news = await serperService.getInstrumentNews(instrument);
      res.json(news);
    } catch (error) {
      console.error(`Error fetching news for ${req.params.instrument}:`, error);
      res.status(500).json({ 
        error: "Failed to fetch news",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Get instrument-specific news with intelligent ranking (15 second timeout)
  app.get("/api/news/intelligent/:instrument", async (req, res) => {
    const startTime = Date.now();
    const timeoutId = setTimeout(() => {
      if (!res.headersSent) {
        console.warn(`[NEWS-TRIAGE] Intelligent instrument news timeout after 15s for instrument: ${req.params.instrument}`);
        res.status(504).json({ 
          error: "Request timeout",
          message: "Intelligent news analysis took too long. Please try again."
        });
      }
    }, 15000);

    try {
      const { instrument } = req.params;
      console.log(`[NEWS-TRIAGE] Starting intelligent news fetch for instrument: "${instrument}"`);
      
      const rankedNews = await serperService.getInstrumentNewsWithRanking(instrument);
      const duration = Date.now() - startTime;
      
      // Log performance metrics
      console.log(`[NEWS-TRIAGE] Intelligent instrument news completed in ${duration}ms`);
      console.log(`[NEWS-TRIAGE] Instrument: "${instrument}", Articles: ${rankedNews.items.length}, Fallback: ${rankedNews.fallbackUsed}`);
      
      if (rankedNews.fallbackUsed) {
        console.warn(`[NEWS-TRIAGE] Fallback mode used for instrument: "${instrument}"`);
      }
      
      clearTimeout(timeoutId);
      if (!res.headersSent) {
        res.json(rankedNews);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      clearTimeout(timeoutId);
      console.error(`[NEWS-TRIAGE] Error fetching intelligent news for "${req.params.instrument}" after ${duration}ms:`, error);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to fetch intelligent news",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  // Get AI insights
  app.get("/api/insights/:symbol", async (req, res) => {
    const startTime = Date.now();
    try {
      const { symbol } = req.params;
      console.log(`Generating insights for symbol: ${symbol}`);
      
      // First get current price data
      const priceData = await yahooFinanceService.getPrice(symbol);
      if (!priceData) {
        return res.status(404).json({ error: "Price data not found for insights generation" });
      }
      
      console.log(`Price data retrieved for ${symbol}: ${priceData.price}`);
      
      // Set a response timeout of 40 seconds to accommodate forecast collection
      const timeoutId = setTimeout(() => {
        if (!res.headersSent) {
          res.status(504).json({ 
            error: "Request timeout",
            message: "AI insights with forecast generation took too long. Please try again."
          });
        }
      }, 40000);
      
      const insights = await openaiService.generateInsights(
        symbol,
        priceData.name,
        priceData.price
      );
      
      clearTimeout(timeoutId);
      
      if (!res.headersSent) {
        const duration = Date.now() - startTime;
        console.log(`Insights generated for ${symbol} in ${duration}ms`);
        res.json(insights);
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Error generating insights for ${req.params.symbol} after ${duration}ms:`, error);
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to generate AI insights",
          message: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
