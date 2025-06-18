import { useState, useEffect } from "react";

interface AutoRefreshIndicatorProps {
  onRefresh: () => void;
  intervalMs?: number;
}

export function AutoRefreshIndicator({ onRefresh, intervalMs = 60000 }: AutoRefreshIndicatorProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const interval = setInterval(async () => {
      setIsRefreshing(true);
      await onRefresh();
      setTimeout(() => setIsRefreshing(false), 1000);
    }, intervalMs);

    return () => clearInterval(interval);
  }, [onRefresh, intervalMs]);

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-slate-800 rounded-full shadow-lg px-4 py-2 flex items-center space-x-2 border border-slate-200 dark:border-slate-600">
      <div className={`w-2 h-2 bg-green-500 rounded-full ${isRefreshing ? 'animate-pulse' : 'animate-pulse'}`}></div>
      <span className="text-xs text-slate-600 dark:text-slate-400">Auto-refresh: 60s</span>
    </div>
  );
}
