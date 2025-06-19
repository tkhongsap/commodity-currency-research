import { AIInsights } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Brain, TrendingUp, Shield } from "lucide-react";

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

function getForecastSources(forecast: number | { value: number | null; sources?: Array<{name: string; confidence: string; url?: string}>; [key: string]: any }): { display: string; sources: Array<{name: string; confidence: string; url?: string}> } | null {
  if (typeof forecast === 'number') {
    return null; // Old format has no sources
  }
  
  if (forecast && typeof forecast === 'object' && 'sources' in forecast && forecast.sources) {
    const sources = forecast.sources;
    if (sources.length > 0) {
      const sourceNames = sources.slice(0, 2).map((s: any) => s.name).join(', ');
      const moreCount = sources.length > 2 ? ` +${sources.length - 2} more` : '';
      return {
        display: sourceNames + moreCount,
        sources: sources
      };
    }
  }
  
  return null;
}

function getConfidenceColor(confidence: string): string {
  switch (confidence?.toLowerCase()) {
    case 'high': return 'text-green-600 dark:text-green-400';
    case 'medium': return 'text-yellow-600 dark:text-yellow-400';
    case 'low': return 'text-orange-600 dark:text-orange-400';
    default: return 'text-slate-500 dark:text-slate-400';
  }
}

function getConfidenceVariant(confidence: string): "default" | "secondary" | "destructive" | "outline" {
  switch (confidence?.toLowerCase()) {
    case 'high': return 'default';
    case 'medium': return 'secondary';
    case 'low': return 'outline';
    default: return 'secondary';
  }
}

export function AIInsightsModal({ isOpen, onClose, title, insights, isLoading, error }: AIInsightsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-4xl max-h-[85vh] overflow-hidden"
        aria-describedby="ai-insights-description"
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div id="ai-insights-description" className="sr-only">
          AI-powered market analysis and price forecasts for commodities and currencies
        </div>
        
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
                    {(() => {
                      const sourceInfo = getForecastSources(insights.priceEstimates.threeMonths);
                      if (sourceInfo && sourceInfo.sources.length > 0) {
                        const source = sourceInfo.sources[0];
                        return (
                          <div className="mt-2 space-y-1">
                            <a 
                              href={source.url || `https://www.google.com/search?q=${encodeURIComponent(source.name + ' forecast')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer"
                            >
                              {source.name}
                            </a>
                            <div className="flex justify-center">
                              <Badge variant={getConfidenceVariant(source.confidence)} className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {source.confidence || 'medium'} confidence
                              </Badge>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* 6 Months */}
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">6 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {getForecastDisplay(insights.priceEstimates.sixMonths)}
                    </div>
                    {(() => {
                      const sourceInfo = getForecastSources(insights.priceEstimates.sixMonths);
                      if (sourceInfo && sourceInfo.sources.length > 0) {
                        const source = sourceInfo.sources[0];
                        return (
                          <div className="mt-2 space-y-1">
                            <a 
                              href={source.url || `https://www.google.com/search?q=${encodeURIComponent(source.name + ' forecast')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer"
                            >
                              {source.name}
                            </a>
                            <div className="flex justify-center">
                              <Badge variant={getConfidenceVariant(source.confidence)} className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {source.confidence || 'medium'} confidence
                              </Badge>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* 12 Months */}
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">12 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {getForecastDisplay(insights.priceEstimates.twelveMonths)}
                    </div>
                    {(() => {
                      const sourceInfo = getForecastSources(insights.priceEstimates.twelveMonths);
                      if (sourceInfo && sourceInfo.sources.length > 0) {
                        const source = sourceInfo.sources[0];
                        return (
                          <div className="mt-2 space-y-1">
                            <a 
                              href={source.url || `https://www.google.com/search?q=${encodeURIComponent(source.name + ' forecast')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer"
                            >
                              {source.name}
                            </a>
                            <div className="flex justify-center">
                              <Badge variant={getConfidenceVariant(source.confidence)} className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {source.confidence || 'medium'} confidence
                              </Badge>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  
                  {/* 24 Months */}
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">24 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {getForecastDisplay(insights.priceEstimates.twentyFourMonths)}
                    </div>
                    {(() => {
                      const sourceInfo = getForecastSources(insights.priceEstimates.twentyFourMonths);
                      if (sourceInfo && sourceInfo.sources.length > 0) {
                        const source = sourceInfo.sources[0];
                        return (
                          <div className="mt-2 space-y-1">
                            <a 
                              href={source.url || `https://www.google.com/search?q=${encodeURIComponent(source.name + ' forecast')}`} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline cursor-pointer"
                            >
                              {source.name}
                            </a>
                            <div className="flex justify-center">
                              <Badge variant={getConfidenceVariant(source.confidence)} className="text-xs">
                                <Shield className="w-3 h-3 mr-1" />
                                {source.confidence || 'medium'} confidence
                              </Badge>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })()}
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

              {/* Data Sources & Methodology Section */}
              <section className="border-t border-slate-200 dark:border-slate-700 pt-6">
                <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Data Sources & Methodology
                </h4>
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <h5 className="font-medium text-blue-900 dark:text-blue-200 mb-2">Price Estimates</h5>
                    <p className="text-sm text-blue-700 dark:text-blue-300 leading-relaxed">
                      Our price forecasts aggregate research from major financial institutions including Goldman Sachs, JPMorgan, Deutsche Bank, and UBS. 
                      We also incorporate central bank guidance, commodity research from the IEA and World Bank, and consensus forecasts from trusted sources.
                    </p>
                  </div>
                  
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <h5 className="font-medium text-green-900 dark:text-green-200 mb-2">Confidence Levels</h5>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          High Confidence
                        </Badge>
                        <span className="text-green-700 dark:text-green-300">Goldman Sachs, JPMorgan, Central Banks, Bloomberg</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Medium Confidence
                        </Badge>
                        <span className="text-green-700 dark:text-green-300">Deutsche Bank, UBS, World Bank, Trading Economics</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Shield className="w-3 h-3 mr-1" />
                          Low Confidence
                        </Badge>
                        <span className="text-green-700 dark:text-green-300">General market analysis, web search results</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-4">
                    <h5 className="font-medium text-slate-900 dark:text-slate-200 mb-2">Disclaimer</h5>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Forecasts are based on institutional research and web search aggregation. Past performance does not guarantee future results. 
                      This information is for research purposes only and should not be considered investment advice. Always consult with qualified financial professionals before making investment decisions.
                    </p>
                  </div>
                </div>
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
