import { PriceData } from "@shared/schema";
import { ArrowUp, ArrowDown, ArrowRight, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface PriceCardProps {
  data: PriceData;
  onViewNews: () => void;
  onViewInsights: () => void;
}

export function PriceCard({ data, onViewNews, onViewInsights }: PriceCardProps) {
  const getChangeIcon = () => {
    if (data.change > 0) return <ArrowUp className="w-4 h-4 text-green-500" />;
    if (data.change < 0) return <ArrowDown className="w-4 h-4 text-red-500" />;
    return <ArrowRight className="w-4 h-4 text-slate-500" />;
  };

  const getChangeColor = () => {
    if (data.change > 0) return "text-green-500";
    if (data.change < 0) return "text-red-500";
    return "text-slate-500";
  };

  const formatChange = () => {
    const sign = data.change >= 0 ? "+" : "";
    return `${sign}${data.change.toFixed(2)} (${sign}${data.changePercent.toFixed(2)}%)`;
  };

  return (
    <Card className="bg-white dark:bg-slate-700 hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="font-medium text-slate-800 dark:text-slate-200">
              {data.name}
            </h3>
            <Badge 
              variant="secondary" 
              className={`mt-1 text-xs ${
                data.type === 'commodity' 
                  ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200' 
                  : 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
              }`}
            >
              {data.type === 'commodity' ? 'Commodity' : 'Currency'}
            </Badge>
          </div>
        </div>
        
        <div className="mb-4">
          <div className="text-3xl font-bold text-slate-800 dark:text-slate-200">
            {data.price.toLocaleString()}
          </div>
          <div className="text-sm text-slate-600 dark:text-slate-400">
            {data.unit}
          </div>
        </div>
        
        <div className="flex items-center mb-4">
          {getChangeIcon()}
          <span className={`font-medium ml-1 ${getChangeColor()}`}>
            {formatChange()}
          </span>
        </div>
        
        <div className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Last updated: {data.lastUpdated}
        </div>
        
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewNews}
            className="flex-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
          >
            View News
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewInsights}
            className="flex-1 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300"
          >
            <Brain className="w-4 h-4 mr-1" />
            AI Insights
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
