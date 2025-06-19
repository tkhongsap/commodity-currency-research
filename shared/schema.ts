import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Price data schemas
export const PriceDataSchema = z.object({
  symbol: z.string(),
  name: z.string(),
  type: z.enum(['commodity', 'currency']),
  price: z.number(),
  change: z.number(),
  changePercent: z.number(),
  unit: z.string(),
  pair: z.string().optional(),
  lastUpdated: z.string(),
});

export type PriceData = z.infer<typeof PriceDataSchema>;

// News data schemas
export const NewsItemSchema = z.object({
  title: z.string(),
  description: z.string(),
  url: z.string(),
  publishedAt: z.string(),
  source: z.string(),
  // New optional fields for intelligent news triage
  region: z.string().optional(),
  riskScore: z.number().min(1).max(10).optional(),
  impactReason: z.string().optional(),
});

export const NewsResponseSchema = z.object({
  items: z.array(NewsItemSchema),
  query: z.string(),
});

// Enhanced news ranking response schema
export const RankedNewsItemSchema = NewsItemSchema.extend({
  riskScore: z.number().min(1).max(10),
  impactReason: z.string(),
});

export const NewsRankingResponseSchema = z.object({
  items: z.array(RankedNewsItemSchema),
  fallbackUsed: z.boolean(),
});

export type NewsItem = z.infer<typeof NewsItemSchema>;
export type NewsResponse = z.infer<typeof NewsResponseSchema>;
export type RankedNewsItem = z.infer<typeof RankedNewsItemSchema>;
export type NewsRankingResponse = z.infer<typeof NewsRankingResponseSchema>;

// AI Insights schemas
export const AIInsightsSchema = z.object({
  symbol: z.string(),
  marketOverview: z.string(),
  priceEstimates: z.object({
    threeMonths: z.number(),
    sixMonths: z.number(),
    twelveMonths: z.number(),
    twentyFourMonths: z.number(),
  }),
  macroAnalysis: z.string(),
  regionalImpact: z.string(),
  thailandImpact: z.string(),
  futureOutlook: z.string(),
});

export type AIInsights = z.infer<typeof AIInsightsSchema>;

// Search request schema
export const SearchRequestSchema = z.object({
  query: z.string(),
});

export type SearchRequest = z.infer<typeof SearchRequestSchema>;
