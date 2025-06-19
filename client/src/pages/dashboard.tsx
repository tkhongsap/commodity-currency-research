import { useState } from "react";
import { PriceCard } from "@/components/PriceCard";
import { NewsModal } from "@/components/NewsModal";
import { AIInsightsModal } from "@/components/AIInsightsModal";
import { SearchBar } from "@/components/SearchBar";
import { AutoRefreshIndicator } from "@/components/AutoRefreshIndicator";
import { useTheme } from "@/components/ThemeProvider";
import { usePriceData } from "@/hooks/usePriceData";
import { useIntelligentNewsSearch, useInstrumentIntelligentNews } from "@/hooks/useNews";
import { useAIInsights } from "@/hooks/useAIInsights";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  const { toast } = useToast();
  
  // Price data
  const { data: priceData, isLoading: pricesLoading, error: pricesError, refetch: refetchPrices } = usePriceData();
  
  // Modal states
  const [newsModal, setNewsModal] = useState<{
    isOpen: boolean;
    title: string;
    instrument?: string;
    searchQuery?: string;
  }>({
    isOpen: false,
    title: "",
  });
  
  const [insightsModal, setInsightsModal] = useState<{
    isOpen: boolean;
    title: string;
    symbol?: string;
  }>({
    isOpen: false,
    title: "",
  });
  
  // News and insights hooks
  const intelligentNewsSearchMutation = useIntelligentNewsSearch();
  const { data: instrumentNews, isLoading: instrumentNewsLoading, error: instrumentNewsError } = 
    useInstrumentIntelligentNews(newsModal.instrument || "");
  
  const { data: insights, isLoading: insightsLoading, error: insightsError } = 
    useAIInsights(insightsModal.symbol || "");

  // Handlers
  const handleRefresh = async () => {
    try {
      await refetchPrices();
    } catch (error) {
      toast({
        title: "Refresh Failed",
        description: "Failed to refresh price data. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleGlobalSearch = async (query: string) => {
    try {
      const result = await intelligentNewsSearchMutation.mutateAsync(query);
      setNewsModal({
        isOpen: true,
        title: `Top 5 Risk Impact News for "${query}"`,
        searchQuery: query,
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Failed to search news. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewNews = (instrument: string) => {
    setNewsModal({
      isOpen: true,
      title: `${instrument} - Top 5 Risk Impact News (Global and Southeast Asia)`,
      instrument,
    });
  };

  const handleViewInsights = (symbol: string, name: string) => {
    setInsightsModal({
      isOpen: true,
      title: `${name} - Market Analysis & Budgeting Insights`,
      symbol,
    });
  };

  const closeNewsModal = () => {
    setNewsModal({ isOpen: false, title: "" });
  };

  const closeInsightsModal = () => {
    setInsightsModal({ isOpen: false, title: "" });
  };

  // Separate commodities and currencies
  const commodities = priceData?.filter(item => item.type === 'commodity') || [];
  const currencies = priceData?.filter(item => item.type === 'currency') || [];

  if (pricesError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-4">
            Failed to Load Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {pricesError instanceof Error ? pricesError.message : "Unknown error occurred"}
          </p>
          <Button onClick={() => window.location.reload()}>
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-4">
              Commodity & Currency Research Dashboard
            </h1>
            <SearchBar onSearch={handleGlobalSearch} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Commodity Futures Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">
            Commodity Futures
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricesLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-700 rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded mb-4"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded flex-1"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded flex-1"></div>
                  </div>
                </div>
              ))
            ) : (
              commodities.map((commodity) => (
                <PriceCard
                  key={commodity.symbol}
                  data={commodity}
                  onViewNews={() => handleViewNews(commodity.name)}
                  onViewInsights={() => handleViewInsights(commodity.symbol, commodity.name)}
                />
              ))
            )}
          </div>
        </section>

        {/* Currencies Section */}
        <section>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-6">
            Currencies
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {pricesLoading ? (
              [...Array(4)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-slate-700 rounded-xl p-6 animate-pulse">
                  <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded mb-4"></div>
                  <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded mb-2"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded mb-4"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded mb-4"></div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded flex-1"></div>
                    <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded flex-1"></div>
                  </div>
                </div>
              ))
            ) : (
              currencies.map((currency) => (
                <PriceCard
                  key={currency.symbol}
                  data={currency}
                  onViewNews={() => handleViewNews(currency.name)}
                  onViewInsights={() => handleViewInsights(currency.symbol, currency.name)}
                />
              ))
            )}
          </div>
        </section>
      </main>

      {/* Auto-refresh indicator */}
      <AutoRefreshIndicator onRefresh={handleRefresh} />

      {/* Dark mode toggle */}
      <Button
        onClick={toggleTheme}
        className="fixed top-4 right-4 p-2 rounded-lg shadow-lg"
        variant="outline"
        size="sm"
      >
        {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
      </Button>

      {/* Modals */}
      <NewsModal
        isOpen={newsModal.isOpen}
        onClose={closeNewsModal}
        title={newsModal.title}
        news={newsModal.searchQuery ? (intelligentNewsSearchMutation.data || null) : (instrumentNews || null)}
        isLoading={newsModal.searchQuery ? intelligentNewsSearchMutation.isPending : instrumentNewsLoading}
        error={
          newsModal.searchQuery 
            ? (intelligentNewsSearchMutation.error?.message || null)
            : (instrumentNewsError instanceof Error ? instrumentNewsError.message : null)
        }
      />

      <AIInsightsModal
        isOpen={insightsModal.isOpen}
        onClose={closeInsightsModal}
        title={insightsModal.title}
        insights={insights || null}
        isLoading={insightsLoading}
        error={insightsError instanceof Error ? insightsError.message : null}
      />
    </div>
  );
}
