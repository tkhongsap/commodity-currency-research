import { NewsResponse } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, ExternalLink } from "lucide-react";

interface NewsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  news: NewsResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function NewsModal({ isOpen, onClose, title, news, isLoading, error }: NewsModalProps) {
  const formatTimeAgo = (dateString: string) => {
    try {
      const date = new Date(dateString);
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">
            {title}
          </DialogTitle>
        </DialogHeader>
        
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
          
          {news && news.items.map((item, index) => (
            <article
              key={index}
              className="border-b border-slate-200 dark:border-slate-600 pb-6 last:border-b-0"
            >
              <h4 className="text-base font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer mb-2">
                <a 
                  href={item.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-1"
                >
                  {item.title}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </h4>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                {item.description}
              </p>
              <div className="flex justify-between items-center">
                <div className="text-xs text-slate-500 dark:text-slate-500">
                  {formatTimeAgo(item.publishedAt)}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500">
                  {item.source}
                </div>
              </div>
            </article>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
