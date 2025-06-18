import { NewsResponse, NewsItem } from '@shared/schema';

export class SerperService {
  private apiKey: string;
  
  constructor() {
    this.apiKey = process.env.SERPER_API_KEY || process.env.SERPER_KEY || '';
    if (!this.apiKey) {
      throw new Error('SERPER_API_KEY is required');
    }
  }
  
  async searchNews(query: string): Promise<NewsResponse> {
    try {
      const response = await fetch('https://google.serper.dev/news', {
        method: 'POST',
        headers: {
          'X-API-KEY': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          q: query,
          num: 10,
          gl: 'us',
          hl: 'en',
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      const items: NewsItem[] = (data.news || []).map((item: any) => ({
        title: item.title || '',
        description: item.snippet || '',
        url: item.link || '',
        publishedAt: item.date || new Date().toISOString(),
        source: item.source || 'Unknown',
      }));
      
      return {
        items,
        query,
      };
    } catch (error) {
      console.error('Error fetching news from Serper:', error);
      throw new Error('Failed to fetch news data');
    }
  }
  
  async getInstrumentNews(instrumentName: string): Promise<NewsResponse> {
    const searchQuery = `${instrumentName} commodity currency market news Southeast Asia Thailand`;
    return this.searchNews(searchQuery);
  }
}
