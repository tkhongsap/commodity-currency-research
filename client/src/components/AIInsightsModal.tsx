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
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">3 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {insights.priceEstimates.threeMonths.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">6 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {insights.priceEstimates.sixMonths.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">12 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {insights.priceEstimates.twelveMonths.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-center p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                    <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">24 months</div>
                    <div className="text-xl font-bold text-slate-800 dark:text-slate-200">
                      {insights.priceEstimates.twentyFourMonths.toFixed(2)}
                    </div>
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
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
