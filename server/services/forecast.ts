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
      throw new Error('Web search is required for production forecasts. Please ensure OpenAI API key is configured.');
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
      threeMonths: validatedForecasts.threeMonths || this.createEmptyForecastData('No 3-month forecasts found'),
      sixMonths: validatedForecasts.sixMonths || this.createEmptyForecastData('No 6-month forecasts found'),
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
          query: `WTI crude oil price forecast ${currentYear} Q3 Q4 September October November three month target Goldman Sachs JPMorgan Morgan Stanley Citibank analyst price forecast near term outlook`,
          horizon: '3M' as const,
          expectedSources: ['Goldman Sachs', 'JPMorgan', 'Bank of America', 'Morgan Stanley', 'Citibank', 'Wells Fargo']
        },
        {
          query: `WTI crude oil 6 month price forecast ${currentYear} ${currentYear + 1} first half next year institutional research Reuters Bloomberg IEA EIA analyst target`,
          horizon: '6M' as const,
          expectedSources: ['Investment banks', 'Commodity research', 'Reuters', 'Bloomberg', 'IEA', 'EIA']
        },
        {
          query: `WTI crude oil 12 month price forecast ${currentYear + 1} annual outlook analyst consensus EIA IEA OPEC World Bank energy price target one year`,
          horizon: '12M' as const,
          expectedSources: ['IEA', 'World Bank', 'Trading Economics', 'EIA', 'OPEC']
        },
        {
          query: `WTI crude oil long term price forecast ${currentYear + 1} ${currentYear + 2} 24 month two year outlook IMF World Bank energy transition analyst research`,
          horizon: '24M' as const,
          expectedSources: ['Long-term research', 'Government agencies', 'IMF', 'World Bank']
        }
      ];
    } else {
      // Currency forecasts - remove =X suffix for better search results
      const currencyPair = symbol.replace('=X', '');
      return [
        {
          query: `${currencyPair} exchange rate forecast ${currentYear} 3 month target central bank research`,
          horizon: '3M' as const,
          expectedSources: ['MUFG Research', 'Central banks', 'Bank of Thailand', 'Federal Reserve']
        },
        {
          query: `${currencyPair} currency forecast ${currentYear} 6 month outlook forex research institutional`,
          horizon: '6M' as const,
          expectedSources: ['Deutsche Bank', 'UBS', 'HSBC', 'Citibank']
        },
        {
          query: `${currencyPair} currency target 12 month ${currentYear} ${currentYear + 1} consensus forecast`,
          horizon: '12M' as const,
          expectedSources: ['Consensus Economics', 'Reuters polls', 'FX research']
        },
        {
          query: `${currencyPair} long term currency forecast ${currentYear + 1} ${currentYear + 2} 24 month outlook`,
          horizon: '24M' as const,
          expectedSources: ['Long-term FX research', 'Central bank projections']
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
    const now = new Date().toISOString();
    
    console.log(`[FORECAST-DEBUG] Extracting forecast from result: ${searchResult.slice(0, 200)}...`);
    
    // Enhanced pattern matching for various price formats from real web search results
    const patterns = [
      // Specific institutional forecast patterns
      /(?:Goldman Sachs|JPMorgan|Morgan Stanley|Bank of America|Citibank|Wells Fargo)\s+(?:forecasts?|projects?|expects?|targets?|sees?)\s+(?:WTI|crude oil|oil)\s+(?:at|to|around|near)?\s*\$?([\d,]+\.?\d*)/gi,
      /(?:IEA|EIA|OPEC|IMF|World Bank|Reuters|Bloomberg)\s+(?:forecasts?|projects?|expects?|targets?|sees?)\s+(?:WTI|crude oil|oil)\s+(?:at|to|around|near)?\s*\$?([\d,]+\.?\d*)/gi,
      
      // Commodity price formats with units
      /\$?([\d,]+\.?\d*)\s*(?:per\s+)?(?:barrel|bbl|\/barrel|\/bbl)/gi,
      /(?:WTI|crude oil|oil)\s+(?:price|prices)\s+(?:at|of|around|near)\s*\$?([\d,]+\.?\d*)/gi,
      
      // Forecast and target patterns
      /(?:target|targets|forecast|forecasts|project|projects|expect|expects|see|sees|estimate|estimates)\s+(?:WTI|crude oil|oil)?\s*(?:at\s+)?\$?([\d,]+\.?\d*)/gi,
      /(?:reach|reaching|hit|hitting|touch|touching)\s+\$?([\d,]+\.?\d*)/gi,
      /(?:around|near|about|approximately)\s+\$?([\d,]+\.?\d*)/gi,
      
      // Timeframe-specific patterns
      /(?:Q3|Q4|third quarter|fourth quarter|near term|short term)\s+(?:forecast|target|outlook|price)\s+(?:of\s+)?\$?([\d,]+\.?\d*)/gi,
      /(?:three month|3-month|90 day|quarterly|six month|6-month|twelve month|12-month|annual|yearly)\s+(?:forecast|target|outlook|price)\s+(?:of\s+)?\$?([\d,]+\.?\d*)/gi,
      
      // Currency pair formats
      /[A-Z]{3}\/[A-Z]{3}\s+(?:at|to|near|around)\s+([\d,]+\.?\d*)/gi,
      /(?:exchange\s+rate|rate)\s+(?:of\s+)?([\d,]+\.?\d*)/gi,
      
      // Price level indicators
      /(?:price|priced|pricing)\s+(?:at|of|around|near)\s+\$?([\d,]+\.?\d*)/gi,
      /(?:level|levels)\s+(?:of|at|around|near)\s+\$?([\d,]+\.?\d*)/gi,
      
      // Analyst/institutional targets
      /(?:consensus|average|mean)\s+(?:target|forecast|estimate)\s+(?:of\s+)?\$?([\d,]+\.?\d*)/gi,
      /(?:analyst|analysts)\s+(?:expect|see|forecast|target)\s+\$?([\d,]+\.?\d*)/gi,
      
      // Generic price mentions with context
      /([\d,]+\.?\d*)\s*(?:dollars?|USD|cents)/gi,
      /\$\s*([\d,]+\.?\d*)/gi,
      
      // Last resort - any number in reasonable range
      /([\d,]+\.?\d*)/g
    ];
    
    let numericValue: number | null = null;
    let matchedPattern = '';
    
    for (const pattern of patterns) {
      const matches = searchResult.match(pattern);
      console.log(`[FORECAST-DEBUG] Pattern ${pattern} found matches:`, matches);
      
      if (matches && matches.length > 0) {
        // Try each match to find the first valid number
        for (const match of matches) {
          const numberMatch = match.match(/([\d,]+\.?\d*)/);
          if (numberMatch) {
            const rawValue = numberMatch[1].replace(/,/g, '');
            const parsed = parseFloat(rawValue);
            
            if (!isNaN(parsed) && parsed > 0) {
              numericValue = parsed;
              matchedPattern = pattern.toString();
              console.log(`[FORECAST-DEBUG] Successfully extracted value: ${numericValue} using pattern: ${matchedPattern} from match: "${match}"`);
              break;
            }
          }
        }
        if (numericValue !== null) break;
      }
    }
    
    if (numericValue !== null) {
      // Determine confidence based on source quality
      const confidence = this.determineConfidence(searchResult, expectedSources);
      
      // Create source attribution
      const sources = this.extractSources(searchResult, expectedSources);
      
      console.log(`[FORECAST-DEBUG] Created forecast data - Value: ${numericValue}, Sources: ${sources.length}, Confidence: ${confidence}`);
      
      return {
        value: numericValue,
        sources,
        methodology: `Web search of institutional research. Extracted from: ${sources.map(s => s.name).join(', ')} using pattern matching.`,
        lastUpdated: now
      };
    }

    console.log(`[FORECAST-DEBUG] No numerical forecasts found in search results`);
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
    const lowerContent = content.toLowerCase();
    
    // Enhanced institution mapping with priority levels and official URLs
    const institutionMap = {
      'goldman sachs': { name: 'Goldman Sachs', confidence: 'high' as const, priority: 1, url: 'https://www.goldmansachs.com/intelligence/pages/gs-research/' },
      'jpmorgan': { name: 'JPMorgan', confidence: 'high' as const, priority: 1, url: 'https://www.jpmorgan.com/insights/research/outlook' },
      'jp morgan': { name: 'JPMorgan', confidence: 'high' as const, priority: 1, url: 'https://www.jpmorgan.com/insights/research/outlook' },
      'morgan stanley': { name: 'Morgan Stanley', confidence: 'high' as const, priority: 1, url: 'https://www.morganstanley.com/ideas/global-economic-outlook' },
      'bank of america': { name: 'Bank of America', confidence: 'high' as const, priority: 1, url: 'https://business.bofa.com/en-us/content/global-research.html' },
      'citibank': { name: 'Citibank', confidence: 'high' as const, priority: 1, url: 'https://www.citi.com/citi/research.html' },
      'citigroup': { name: 'Citibank', confidence: 'high' as const, priority: 1, url: 'https://www.citi.com/citi/research.html' },
      'wells fargo': { name: 'Wells Fargo', confidence: 'high' as const, priority: 1, url: 'https://www.wellsfargo.com/com/insights/' },
      'deutsche bank': { name: 'Deutsche Bank', confidence: 'high' as const, priority: 1, url: 'https://www.db.com/newsroom_news/research-outlook.htm' },
      'ubs': { name: 'UBS', confidence: 'high' as const, priority: 1, url: 'https://www.ubs.com/global/en/investment-bank/in-focus/' },
      
      'reuters': { name: 'Reuters', confidence: 'high' as const, priority: 2, url: 'https://www.reuters.com/markets/commodities/' },
      'bloomberg': { name: 'Bloomberg', confidence: 'high' as const, priority: 2, url: 'https://www.bloomberg.com/energy' },
      
      'eia': { name: 'U.S. Energy Information Administration', confidence: 'high' as const, priority: 2, url: 'https://www.eia.gov/outlooks/steo/' },
      'energy information administration': { name: 'U.S. Energy Information Administration', confidence: 'high' as const, priority: 2, url: 'https://www.eia.gov/outlooks/steo/' },
      'iea': { name: 'International Energy Agency', confidence: 'high' as const, priority: 2, url: 'https://www.iea.org/reports/oil-market-report' },
      'international energy agency': { name: 'International Energy Agency', confidence: 'high' as const, priority: 2, url: 'https://www.iea.org/reports/oil-market-report' },
      'opec': { name: 'OPEC', confidence: 'high' as const, priority: 2, url: 'https://www.opec.org/opec_web/en/publications/338.htm' },
      
      'world bank': { name: 'World Bank', confidence: 'medium' as const, priority: 3, url: 'https://www.worldbank.org/en/publication/commodity-markets-outlook' },
      'imf': { name: 'International Monetary Fund', confidence: 'medium' as const, priority: 3, url: 'https://www.imf.org/en/Publications/WEO' },
      'international monetary fund': { name: 'International Monetary Fund', confidence: 'medium' as const, priority: 3, url: 'https://www.imf.org/en/Publications/WEO' },
      'bank of thailand': { name: 'Bank of Thailand', confidence: 'medium' as const, priority: 3, url: 'https://www.bot.or.th/english/monetary-policy/mp-outlook.html' },
      'federal reserve': { name: 'Federal Reserve', confidence: 'high' as const, priority: 2, url: 'https://www.federalreserve.gov/monetarypolicy/' },
      'trading economics': { name: 'Trading Economics', confidence: 'medium' as const, priority: 4, url: 'https://tradingeconomics.com/forecast' }
    };

    // Check for specific institutions mentioned in content and collect all matches
    const foundSources: Array<{institution: any, priority: number}> = [];
    
    for (const [key, institution] of Object.entries(institutionMap)) {
      if (lowerContent.includes(key)) {
        foundSources.push({ institution, priority: institution.priority });
      }
    }

    // Sort by priority (lower number = higher priority) and take the best source
    foundSources.sort((a, b) => a.priority - b.priority);
    
    if (foundSources.length > 0) {
      const bestSource = foundSources[0].institution;
      sources.push({
        name: bestSource.name,
        url: bestSource.url,
        confidence: bestSource.confidence,
        publishedDate: new Date().toISOString().split('T')[0]
      });
    } else {
      // If no specific sources found, create a generic financial research source
      sources.push({
        name: 'Financial Research',
        url: 'https://www.google.com/search?q=commodity+price+forecast+institutional+research',
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
      switch (symbol) {
        case 'USDTHB=X': // USD to Thai Baht
          return value >= 25 && value <= 45; // Realistic range for USD/THB
        case 'USDMYR=X': // USD to Malaysian Ringgit  
          return value >= 3.5 && value <= 5.5; // Realistic range for USD/MYR
        case 'USDEUR=X': // USD to Euro
          return value >= 0.80 && value <= 1.40; // Realistic range for USD/EUR
        case 'USDGBP=X': // USD to British Pound
          return value >= 0.6 && value <= 1.0; // Realistic range for USD/GBP
        default:
          return value > 0 && value < 100;
      }
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