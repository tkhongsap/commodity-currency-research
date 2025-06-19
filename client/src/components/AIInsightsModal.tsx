import { AIInsights } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Brain } from "lucide-react";

interface AIInsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  insights: AIInsights | null;
  isLoading: boolean;
  error: string | null;
}

// Helper functions to handle both old number format and new ForecastData format
function getForecastDisplay(forecast: number | { value: number | null; [key: string]: any }): string {
  if (typeof forecast === 'number') {
    return forecast.toFixed(2);
  }
  
  if (forecast && typeof forecast === 'object' && 'value' in forecast) {
    return forecast.value !== null ? forecast.value.toFixed(2) : 'N/A';
  }
  
  return 'N/A';
}

function getForecastSources(forecast: number | { value: number | null; sources?: Array<{name: string; confidence: string}>; [key: string]: any }): string | null {
  if (typeof forecast === 'number') {
    return null; // Old format has no sources
  }
  
  if (forecast && typeof forecast === 'object' && 'sources' in forecast && forecast.sources) {
    const sources = forecast.sources;
    if (sources.length > 0) {
      const sourceNames = sources.slice(0, 2).map((s: any) => s.name).join(', ');
      const moreCount = sources.length > 2 ? ` +${sources.length - 2} more` : '';
      return sourceNames + moreCount;
    }
  }
  
  return null;
}

export function AIInsightsModal({ isOpen, onClose, title, insights, isLoading, error }: AIInsightsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[75vh] space-y-8">
          {isLoading && (
            <div className="space-y-8">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-6 w-1/3" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
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
          
          {insights && (
            <>
              {/* Market Overview Section */}
              <section>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  Market Overview
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {insights.marketOverview}
                </p>
              </section>

              {/* Price Estimates Section */}
              <section>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  Price Estimates
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* 3 Months */}
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">3 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {getForecastDisplay(insights.priceEstimates.threeMonths)}
                    </div>
                    {getForecastSources(insights.priceEstimates.threeMonths) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {getForecastSources(insights.priceEstimates.threeMonths)}
                      </div>
                    )}
                  </div>
                  
                  {/* 6 Months */}
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">6 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {getForecastDisplay(insights.priceEstimates.sixMonths)}
                    </div>
                    {getForecastSources(insights.priceEstimates.sixMonths) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {getForecastSources(insights.priceEstimates.sixMonths)}
                      </div>
                    )}
                  </div>
                  
                  {/* 12 Months */}
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">12 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {getForecastDisplay(insights.priceEstimates.twelveMonths)}
                    </div>
                    {getForecastSources(insights.priceEstimates.twelveMonths) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {getForecastSources(insights.priceEstimates.twelveMonths)}
                      </div>
                    )}
                  </div>
                  
                  {/* 24 Months */}
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">24 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {getForecastDisplay(insights.priceEstimates.twentyFourMonths)}
                    </div>
                    {getForecastSources(insights.priceEstimates.twentyFourMonths) && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {getForecastSources(insights.priceEstimates.twentyFourMonths)}
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* Macro Analysis Section */}
              <section>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  Macro Analysis
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {insights.macroAnalysis}
                </p>
              </section>

              {/* Regional Impact Section */}
              <section>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  Regional Impact
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {insights.regionalImpact}
                </p>
              </section>

              {/* Thailand Impact Section */}
              <section>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  Thailand Impact
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {insights.thailandImpact}
                </p>
              </section>

              {/* Future Outlook Section */}
              <section>
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4">
                  Future Outlook
                </h4>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {insights.futureOutlook}
                </p>
              </section>

              {/* Forecast Disclaimer Section */}
              {insights.forecastDisclaimer && (
                <section className="border-t border-slate-200 dark:border-slate-700 pt-4">
                  <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <h5 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                        Forecast Transparency
                      </h5>
                      <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                        {insights.forecastDisclaimer}
                      </p>
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
