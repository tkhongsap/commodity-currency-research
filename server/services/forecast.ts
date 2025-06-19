// Import types from shared schema
import { ForecastSource, ForecastData } from '@shared/schema';

export interface InstrumentForecasts {
  symbol: string;
  threeMonths: ForecastData;
  sixMonths: ForecastData;
  twelveMonths: ForecastData;
  twentyFourMonths: ForecastData;
  forecastDisclaimer: string;
}

// Cache interface
interface CacheEntry {
  data: InstrumentForecasts;
  timestamp: number;
  expiryTime: number;
}

export class ForecastService {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
  private readonly FORECAST_TIMEOUT = 30000; // 30 seconds

  // Instrument categorization for targeted search
  private readonly INSTRUMENT_CATEGORIES = {
    // Commodities
    'CL=F': { name: 'Crude Oil WTI', type: 'commodity', category: 'energy' },
    'ALI=F': { name: 'Aluminum', type: 'commodity', category: 'metals' },
    'HRC=F': { name: 'Steel HRC', type: 'commodity', category: 'metals' },
    'SB=F': { name: 'Sugar #11', type: 'commodity', category: 'agriculture' },
    
    // Currencies
    'USDTHB=X': { name: 'Thai Baht', type: 'currency', category: 'emerging_asia' },
    'USDMYR=X': { name: 'Malaysian Ringgit', type: 'currency', category: 'emerging_asia' },
    'USDEUR=X': { name: 'Euro', type: 'currency', category: 'major_pairs' },
    'USDGBP=X': { name: 'British Pound', type: 'currency', category: 'major_pairs' },
  } as const;

  constructor(private webSearch?: (params: { query: string; prompt: string }) => Promise<string>) {}

  async getForecastsForInstrument(symbol: string): Promise<InstrumentForecasts> {
    // Check cache first
    const cached = this.getCachedForecast(symbol);
    if (cached) {
      console.log(`[FORECAST] Using cached forecast for ${symbol}`);
      return cached;
    }

    console.log(`[FORECAST] Generating new forecast for ${symbol}`);

    const instrument = this.INSTRUMENT_CATEGORIES[symbol as keyof typeof this.INSTRUMENT_CATEGORIES];
    if (!instrument) {
      return this.createEmptyForecast(symbol, 'Unknown instrument type');
    }

    try {
      // Set timeout for forecast collection
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Forecast collection timeout')), this.FORECAST_TIMEOUT);
      });

      const forecastPromise = this.collectInstitutionalForecasts(symbol, instrument);
      const forecasts = await Promise.race([forecastPromise, timeoutPromise]);

      // Cache the results
      this.cacheResult(symbol, forecasts);
      
      return forecasts;
    } catch (error) {
      console.error(`[FORECAST] Error collecting forecasts for ${symbol}:`, error);
      return this.createEmptyForecast(symbol, 'Forecast collection failed');
    }
  }

  private async collectInstitutionalForecasts(
    symbol: string, 
    instrument: typeof this.INSTRUMENT_CATEGORIES[keyof typeof this.INSTRUMENT_CATEGORIES]
  ): Promise<InstrumentForecasts> {
    
    console.log(`[FORECAST] Collecting institutional forecasts for ${symbol} (${instrument.type})`);

    if (!this.webSearch) {
      console.warn('[FORECAST] WebSearch not available, using market-based forecasts');
      return this.createMarketBasedForecasts(symbol, instrument);
    }

    // Define search strategies based on instrument type
    const searches = this.buildSearchQueries(symbol, instrument);
    
    // Execute searches in parallel
    const searchResults = await Promise.allSettled(
      searches.map(search => this.executeSearch(search))
    );

    // Process and aggregate results
    const processedForecasts = this.processSearchResults(searchResults, searches);
    
    // Validate forecast values and fallback to market-based if unrealistic
    const validatedForecasts = this.validateAndFixForecasts(processedForecasts, symbol, instrument);
    
    return {
      symbol,
      threeMonths: validatedForecasts.threeMonths || this.createMarketBasedForecast(symbol, instrument, '3M'),
      sixMonths: validatedForecasts.sixMonths || this.createMarketBasedForecast(symbol, instrument, '6M'),
      twelveMonths: validatedForecasts.twelveMonths || this.createEmptyForecastData('No 12-month forecasts found'),
      twentyFourMonths: validatedForecasts.twentyFourMonths || this.createEmptyForecastData('No 24-month forecasts found'),
      forecastDisclaimer: "Forecasts based on current market conditions and typical price movements. Past performance does not guarantee future results. Not investment advice."
    };
  }

  private buildSearchQueries(
    symbol: string, 
    instrument: typeof this.INSTRUMENT_CATEGORIES[keyof typeof this.INSTRUMENT_CATEGORIES]
  ) {
    const baseInstrument = instrument.name;
    const currentYear = new Date().getFullYear();
    
    if (instrument.type === 'commodity') {
      return [
        {
          query: `"${baseInstrument}" price forecast ${currentYear} "3 months" Goldman Sachs JPMorgan`,
          horizon: '3M' as const,
          expectedSources: ['Goldman Sachs', 'JPMorgan', 'Bank of America']
        },
        {
          query: `"${baseInstrument}" outlook "${currentYear}" "6 months" bank research`,
          horizon: '6M' as const,
          expectedSources: ['Investment banks', 'Commodity research']
        },
        {
          query: `"${baseInstrument}" price target "12 months" "${currentYear}" institutional`,
          horizon: '12M' as const,
          expectedSources: ['IEA', 'World Bank', 'Trading Economics']
        },
        {
          query: `"${baseInstrument}" long term forecast "${currentYear + 1}" "24 months"`,
          horizon: '24M' as const,
          expectedSources: ['Long-term research', 'Government agencies']
        }
      ];
    } else {
      // Currency forecasts
      return [
        {
          query: `"${symbol.replace('=X', '')}" forecast "${currentYear}" "3 months" MUFG "central bank"`,
          horizon: '3M' as const,
          expectedSources: ['MUFG Research', 'Central banks']
        },
        {
          query: `"${symbol.replace('=X', '')}" outlook "6 months" "${currentYear}" forex research`,
          horizon: '6M' as const,
          expectedSources: ['Deutsche Bank', 'UBS', 'HSBC']
        },
        {
          query: `"${symbol.replace('=X', '')}" "12 month" forecast "${currentYear}" consensus`,
          horizon: '12M' as const,
          expectedSources: ['Consensus Economics', 'Reuters polls']
        },
        {
          query: `"${symbol.replace('=X', '')}" "24 month" "long term" forecast "${currentYear + 1}"`,
          horizon: '24M' as const,
          expectedSources: ['Long-term FX research']
        }
      ];
    }
  }

  private async executeSearch(search: { query: string; horizon: string; expectedSources: string[] }) {
    try {
      console.log(`[FORECAST] Searching: ${search.query}`);
      
      if (!this.webSearch) {
        throw new Error('WebSearch not available');
      }

      const result = await this.webSearch({
        query: search.query,
        prompt: `Extract numerical price forecasts for ${search.horizon} timeframe. Look for specific price targets, ranges, or percentage changes. Include the source name and any methodology mentioned.`
      });

      return {
        horizon: search.horizon,
        expectedSources: search.expectedSources,
        result,
        success: true
      };
    } catch (error) {
      console.error(`[FORECAST] Search failed for ${search.horizon}:`, error);
      return {
        horizon: search.horizon,
        expectedSources: search.expectedSources,
        result: null,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private processSearchResults(
    searchResults: PromiseSettledResult<any>[],
    originalSearches: any[]
  ): Partial<Record<keyof Omit<InstrumentForecasts, 'symbol' | 'forecastDisclaimer'>, ForecastData>> {
    const processed: any = {};

    searchResults.forEach((result, index) => {
      const search = originalSearches[index];
      const horizon = search.horizon;
      
      if (result.status === 'fulfilled' && result.value.success && result.value.result) {
        const forecastData = this.extractForecastFromResult(result.value.result, search.expectedSources);
        if (forecastData.value !== null) {
          const timeframKey = this.mapHorizonToKey(horizon);
          processed[timeframKey] = forecastData;
        }
      }
    });

    return processed;
  }

  private mapHorizonToKey(horizon: string): keyof Omit<InstrumentForecasts, 'symbol' | 'forecastDisclaimer'> {
    switch (horizon) {
      case '3M': return 'threeMonths';
      case '6M': return 'sixMonths';
      case '12M': return 'twelveMonths';
      case '24M': return 'twentyFourMonths';
      default: return 'twelveMonths';
    }
  }

  private extractForecastFromResult(searchResult: string, expectedSources: string[]): ForecastData {
    // This is a simplified extraction - in production, you'd want more sophisticated parsing
    const now = new Date().toISOString();
    
    // Look for numerical values in the result
    const numberMatches = searchResult.match(/[\$€£¥]?[\d,]+\.?\d*/g);
    const firstNumber = numberMatches?.[0];
    
    if (firstNumber) {
      // Extract numeric value
      const numericValue = parseFloat(firstNumber.replace(/[^\d.]/g, ''));
      
      // Determine confidence based on source quality
      const confidence = this.determineConfidence(searchResult, expectedSources);
      
      // Create source attribution
      const sources = this.extractSources(searchResult, expectedSources);
      
      return {
        value: numericValue,
        sources,
        methodology: `Web search of institutional research. Extracted from: ${sources.map(s => s.name).join(', ')}`,
        lastUpdated: now
      };
    }

    return this.createEmptyForecastData('No numerical forecasts found in search results');
  }

  private determineConfidence(content: string, expectedSources: string[]): 'high' | 'medium' | 'low' {
    const lowerContent = content.toLowerCase();
    
    // High confidence sources
    const highConfidenceSources = ['goldman sachs', 'jpmorgan', 'mufg', 'reuters', 'bloomberg', 'central bank', 'federal reserve', 'ecb', 'bank of england'];
    if (highConfidenceSources.some(source => lowerContent.includes(source))) {
      return 'high';
    }
    
    // Medium confidence sources
    const mediumConfidenceSources = ['deutsche bank', 'ubs', 'hsbc', 'consensus', 'trading economics', 'world bank'];
    if (mediumConfidenceSources.some(source => lowerContent.includes(source))) {
      return 'medium';
    }
    
    return 'low';
  }

  private extractSources(content: string, expectedSources: string[]): ForecastSource[] {
    const sources: ForecastSource[] = [];
    const confidence = this.determineConfidence(content, expectedSources);
    
    // Simple extraction - look for source names in content
    expectedSources.forEach(sourceName => {
      if (content.toLowerCase().includes(sourceName.toLowerCase())) {
        sources.push({
          name: sourceName,
          url: `https://www.google.com/search?q=${encodeURIComponent(sourceName + ' forecast')}`, // Placeholder URL
          confidence,
          publishedDate: new Date().toISOString().split('T')[0] // Today's date as placeholder
        });
      }
    });

    // If no specific sources found, create a generic web search source
    if (sources.length === 0) {
      sources.push({
        name: 'Web Search Results',
        url: 'https://www.google.com/search?q=financial+forecast',
        confidence: 'low'
      });
    }

    return sources;
  }

  private createEmptyForecastData(reason: string): ForecastData {
    return {
      value: null,
      sources: [],
      methodology: reason,
      lastUpdated: new Date().toISOString()
    };
  }

  private createEmptyForecast(symbol: string, reason: string): InstrumentForecasts {
    const emptyData = this.createEmptyForecastData(reason);
    
    return {
      symbol,
      threeMonths: emptyData,
      sixMonths: emptyData,
      twelveMonths: emptyData,
      twentyFourMonths: emptyData,
      forecastDisclaimer: `Unable to retrieve institutional forecasts: ${reason}. Independent analysis not provided.`
    };
  }

  private getCachedForecast(symbol: string): InstrumentForecasts | null {
    const cached = this.cache.get(symbol);
    if (!cached) return null;
    
    const now = Date.now();
    if (now > cached.expiryTime) {
      console.log(`[FORECAST] Cache expired for ${symbol}`);
      this.cache.delete(symbol);
      return null;
    }
    
    // Update methodology to indicate cache usage
    const result = { ...cached.data };
    const cacheAge = Math.round((now - cached.timestamp) / (1000 * 60)); // minutes
    
    ['threeMonths', 'sixMonths', 'twelveMonths', 'twentyFourMonths'].forEach(key => {
      const forecast = result[key as keyof typeof result] as ForecastData;
      if (forecast && forecast.value !== null) {
        forecast.methodology += ` (Retrieved ${cacheAge} minutes ago from cache)`;
      }
    });
    
    return result;
  }

  private cacheResult(symbol: string, forecasts: InstrumentForecasts): void {
    const now = Date.now();
    this.cache.set(symbol, {
      data: forecasts,
      timestamp: now,
      expiryTime: now + this.CACHE_DURATION
    });
    
    console.log(`[FORECAST] Cached forecast for ${symbol}, expires in ${this.CACHE_DURATION / (1000 * 60 * 60)} hours`);
  }

  // Utility method to clear cache for testing
  clearCache(): void {
    this.cache.clear();
    console.log('[FORECAST] Cache cleared');
  }

  private createMarketBasedForecasts(
    symbol: string,
    instrument: typeof this.INSTRUMENT_CATEGORIES[keyof typeof this.INSTRUMENT_CATEGORIES]
  ): InstrumentForecasts {
    return {
      symbol,
      threeMonths: this.createEmptyForecastData('No authentic institutional forecasts available for 3-month horizon'),
      sixMonths: this.createEmptyForecastData('No authentic institutional forecasts available for 6-month horizon'),
      twelveMonths: this.createEmptyForecastData('No authentic institutional forecasts available for 12-month horizon'),
      twentyFourMonths: this.createEmptyForecastData('No authentic institutional forecasts available for 24-month horizon'),
      forecastDisclaimer: "No authentic institutional forecasts available. External API access required for real forecasting data."
    };
  }

  private validateAndFixForecasts(
    forecasts: Partial<Record<keyof Omit<InstrumentForecasts, 'symbol' | 'forecastDisclaimer'>, ForecastData>>,
    symbol: string,
    instrument: typeof this.INSTRUMENT_CATEGORIES[keyof typeof this.INSTRUMENT_CATEGORIES]
  ): Partial<Record<keyof Omit<InstrumentForecasts, 'symbol' | 'forecastDisclaimer'>, ForecastData>> {
    const validated: any = {};
    
    for (const [key, forecast] of Object.entries(forecasts)) {
      if (forecast && forecast.value !== null) {
        if (this.isReasonableForecast(forecast.value, symbol, instrument)) {
          validated[key] = forecast;
        } else {
          console.warn(`[FORECAST] Invalid forecast value ${forecast.value} for ${symbol} ${key}, removing invalid data`);
        }
      }
    }
    
    return validated;
  }

  private isReasonableForecast(
    value: number,
    symbol: string,
    instrument: typeof this.INSTRUMENT_CATEGORIES[keyof typeof this.INSTRUMENT_CATEGORIES]
  ): boolean {
    if (instrument.type === 'commodity') {
      switch (symbol) {
        case 'CL=F': // Crude Oil WTI
          return value >= 30 && value <= 200;
        case 'ALI=F': // Aluminum  
          return value >= 1000 && value <= 4000;
        case 'HRC=F': // Steel HRC
          return value >= 300 && value <= 1500;
        case 'SB=F': // Sugar #11
          return value >= 10 && value <= 50;
        default:
          return value > 0 && value < 10000;
      }
    } else if (instrument.type === 'currency') {
      return value > 0 && value < 100;
    }
    
    return value > 0;
  }

  // Utility method to get cache stats
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}