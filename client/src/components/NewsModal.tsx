import { NewsResponse, NewsRankingResponse, RankedNewsItem } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ExternalLink, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  news: NewsResponse | NewsRankingResponse | null;
  isLoading: boolean;
  error: string | null;
}

// Type guard to check if news is ranked
function isRankedNews(news: NewsResponse | NewsRankingResponse | null): news is NewsRankingResponse {
  return news !== null && news !== undefined && typeof news === 'object' && 'fallbackUsed' in news;
}

// Type guard to check if item is ranked
function isRankedItem(item: any): item is RankedNewsItem {
  return 'riskScore' in item && 'impactReason' in item;
}

export function NewsModal({ isOpen, onClose, title, news, isLoading, error }: NewsModalProps) {
  const formatTimeAgo = (dateString: string) => {
    // Handle already relative dates from the API
    if (dateString.includes('ago') || dateString.includes('hour') || dateString.includes('day') || dateString.includes('minute')) {
      return dateString;
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return "Recently";
      }
      
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return "Just now";
      if (diffInHours < 24) return `${diffInHours} hours ago`;
      
      const diffInDays = Math.floor(diffInHours / 24);
      if (diffInDays === 1) return "1 day ago";
      return `${diffInDays} days ago`;
    } catch {
      return "Recently";
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 8) return "destructive"; // Red for high risk
    if (score >= 6) return "secondary"; // Orange/amber for medium risk
    return "outline"; // Gray for lower risk
  };

  const getRiskScoreIcon = (score: number) => {
    if (score >= 8) return AlertTriangle;
    if (score >= 6) return TrendingUp;
    return Info;
  };

  const isIntelligentNews = isRankedNews(news);
  const modalTitle = isIntelligentNews ? "Top 5 Risk Impact News" : title;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-2xl max-h-[80vh] overflow-hidden"
        aria-describedby="news-modal-description"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            {modalTitle}
            {isIntelligentNews && news.fallbackUsed && (
              <Badge variant="outline" className="text-xs">
                Fallback Mode
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div id="news-modal-description" className="sr-only">
          News articles and market impact analysis for commodities and currencies
        </div>
        
        <div className="overflow-y-auto max-h-[60vh] space-y-6">
          {isLoading && (
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              ))}
            </div>
          )}
          
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-500" />
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
          
          {news && news.items.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-600 dark:text-slate-400">
                No news articles found for this search.
              </p>
            </div>
          )}
          
          {news && news.items.map((item, index) => {
            const isRanked = isRankedItem(item);
            const RiskIcon = isRanked ? getRiskScoreIcon(item.riskScore) : null;
            
            return (
              <article
                key={index}
                className="border-b border-slate-200 dark:border-slate-600 pb-6 last:border-b-0"
              >
                <div className="flex items-start gap-3 mb-2">
                  {isIntelligentNews && (
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-slate-500 dark:text-slate-400">
                        #{index + 1}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="text-base font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer flex-1">
                        <a 
                          href={item.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          {item.title}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </h4>
                      {isRanked && (
                        <div className="flex items-center gap-1">
                          <Badge 
                            variant={getRiskScoreColor(item.riskScore)}
                            className="flex items-center gap-1 text-xs"
                          >
                            {RiskIcon && <RiskIcon className="w-3 h-3" />}
                            {item.riskScore}/10
                          </Badge>
                          {item.region && (
                            <Badge variant="outline" className="text-xs">
                              {item.region.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      {item.description}
                    </p>
                    
                    {isRanked && item.impactReason && (
                      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md p-3 mb-3">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium text-amber-800 dark:text-amber-200 mb-1">
                              Impact Analysis
                            </p>
                            <p className="text-xs text-amber-700 dark:text-amber-300">
                              {item.impactReason}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        {formatTimeAgo(item.publishedAt)}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500">
                        {item.source}
                      </div>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
