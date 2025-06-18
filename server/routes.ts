import type { Express } from "express";
import { createServer, type Server } from "http";
import { YahooFinanceService } from "./services/yahoo-finance";
import { SerperService } from "./services/serper";
import { OpenAIService } from "./services/openai";
import { SearchRequestSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const yahooFinanceService = new YahooFinanceService();
  const serperService = new SerperService();
  const openaiService = new OpenAIService();

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

  // Search news
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

  // Get instrument-specific news
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

  // Get AI insights
  app.get("/api/insights/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      
      // First get current price data
      const priceData = await yahooFinanceService.getPrice(symbol);
      if (!priceData) {
        return res.status(404).json({ error: "Price data not found for insights generation" });
      }
      
      const insights = await openaiService.generateInsights(
        symbol,
        priceData.name,
        priceData.price
      );
      
      res.json(insights);
    } catch (error) {
      console.error(`Error generating insights for ${req.params.symbol}:`, error);
      res.status(500).json({ 
        error: "Failed to generate AI insights",
        message: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
