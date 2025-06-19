import yahooFinance from 'yahoo-finance2';
import { PriceData } from '@shared/schema';

// Symbol mappings for Yahoo Finance
const SYMBOL_MAPPINGS = {
  // Commodities
  'CL=F': { name: 'Crude Oil (WTI)', type: 'commodity' as const, unit: 'USD per barrel' },
  'ALI=F': { name: 'Aluminum', type: 'commodity' as const, unit: 'USD per ton' },
  'HRC=F': { name: 'Steel (HRC)', type: 'commodity' as const, unit: 'USD per ton' },
  'SB=F': { name: 'Sugar #11', type: 'commodity' as const, unit: 'USD cents per pound' },
  
  // Currencies - showing how much of each currency you get for 1 USD
  'USDTHB=X': { name: 'Thai Baht', type: 'currency' as const, unit: 'THB per USD', pair: 'USD/THB' },
  'USDMYR=X': { name: 'Malaysian Ringgit', type: 'currency' as const, unit: 'MYR per USD', pair: 'USD/MYR' },
  'EURUSD=X': { name: 'Euro', type: 'currency' as const, unit: 'USD per EUR', pair: 'EUR/USD' },
  'GBPUSD=X': { name: 'British Pound', type: 'currency' as const, unit: 'USD per GBP', pair: 'GBP/USD' },
} as const;

export class YahooFinanceService {
  async getAllPrices(): Promise<PriceData[]> {
    try {
      const symbols = Object.keys(SYMBOL_MAPPINGS);
      const quotes = await yahooFinance.quote(symbols);
      
      const priceData: PriceData[] = [];
      
      for (const symbol of symbols) {
        const quote = Array.isArray(quotes) ? quotes.find(q => q.symbol === symbol) : quotes;
        if (!quote) continue;
        
        const mapping = SYMBOL_MAPPINGS[symbol as keyof typeof SYMBOL_MAPPINGS];
        const price = (quote as any).regularMarketPrice || 0;
        const previousClose = (quote as any).regularMarketPreviousClose || price;
        const change = price - previousClose;
        const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
        
        priceData.push({
          symbol,
          name: mapping.name,
          type: mapping.type,
          price: Number(price.toFixed(2)),
          change: Number(change.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          unit: mapping.unit,
          pair: 'pair' in mapping ? mapping.pair : undefined,
          lastUpdated: new Date().toLocaleString('en-US', {
            month: 'numeric',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }),
        });
      }
      
      return priceData;
    } catch (error) {
      console.error('Error fetching Yahoo Finance data:', error);
      throw new Error('Failed to fetch price data from Yahoo Finance');
    }
  }
  
  async getPrice(symbol: string): Promise<PriceData | null> {
    try {
      const mapping = SYMBOL_MAPPINGS[symbol as keyof typeof SYMBOL_MAPPINGS];
      if (!mapping) {
        throw new Error(`Unknown symbol: ${symbol}`);
      }
      
      const quote = await yahooFinance.quote(symbol);
      if (!quote) return null;
      
      const price = (quote as any).regularMarketPrice || 0;
      const previousClose = (quote as any).regularMarketPreviousClose || price;
      const change = price - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;
      
      return {
        symbol,
        name: mapping.name,
        type: mapping.type,
        price: Number(price.toFixed(2)),
        change: Number(change.toFixed(2)),
        changePercent: Number(changePercent.toFixed(2)),
        unit: mapping.unit,
        pair: mapping.pair,
        lastUpdated: new Date().toLocaleString('en-US', {
          month: 'numeric',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }),
      };
    } catch (error) {
      console.error(`Error fetching price for ${symbol}:`, error);
      return null;
    }
  }
}
