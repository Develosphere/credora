"use client";

import { useState, useEffect } from "react";
import { 
  Users, 
  Search, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Eye,
  EyeOff,
  Clock,
  Sparkles,
  Target,
  Zap
} from "lucide-react";
import { 
  BUSINESS_CATEGORIES, 
  PAKISTANI_CITIES,
  type CompetitorAnalysisRequest,
} from "@/lib/api/competitor";
import { useCompetitorAnalysis, formatBusinessType, getEstimatedDuration } from "@/lib/hooks/useCompetitor";
import { CompetitorResults } from "@/components/competitor/CompetitorResults";

interface FormData {
  businessName: string;
  businessType: string;
  city: string;
  maxCompetitors: number;
  generateReport: boolean;
  visibleBrowser: boolean;
}

export default function CompetitorAnalysisPage() {
  const [formData, setFormData] = useState<FormData>({
    businessName: "",
    businessType: "",
    city: "Karachi",
    maxCompetitors: 5,
    generateReport: true,
    visibleBrowser: false,
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const { isLoading, error, result, analyze, reset: resetAnalysis } = useCompetitorAnalysis();

  useEffect(() => {
    setIsAnimating(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.businessName.trim() || !formData.businessType) {
      return;
    }

    const request: CompetitorAnalysisRequest = {
      business_type: formatBusinessType(formData.businessType),
      city: formData.city,
      max_competitors: formData.maxCompetitors,
      generate_report: formData.generateReport,
      visible_browser: formData.visibleBrowser,
    };

    await analyze(request);
  };

  const handleReset = () => {
    setFormData({
      businessName: "",
      businessType: "",
      city: "Karachi",
      maxCompetitors: 5,
      generateReport: true,
      visibleBrowser: false,
    });
    resetAnalysis();
  };

  const estimatedDuration = getEstimatedDuration(formData.maxCompetitors);
  const isFormValid = formData.businessName.trim() && formData.businessType;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className={`${isAnimating ? 'animate-slide-in-left' : 'opacity-0'}`}>
          <h1 className="text-2xl font-bold text-white">Competitor Analysis</h1>
          <p className="text-gray-400 mt-1">
            Discover and analyze your competitors with AI-powered insights
          </p>
        </div>
        <div className={`flex items-center gap-2 ${isAnimating ? 'animate-scale-in' : 'opacity-0'}`}>
          <div className="p-3 rounded-xl bg-gradient-to-br from-credora-orange to-credora-red">
            <Users className="h-6 w-6 text-white" />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Analysis Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Form Card */}
          <div className="rounded-2xl bg-[#1e1e1e] border border-[#2a2a2a] p-6 transition-all duration-300 hover:border-credora-orange/30">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-credora-orange/10">
                <Search className="h-5 w-5 text-credora-orange" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Business Information</h2>
                <p className="text-sm text-gray-500">Enter your business details to find competitors</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Business Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Business Name <span className="text-credora-orange">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g., Scents & Stories"
                  value={formData.businessName}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-[#282828] border border-[#333] text-white rounded-xl placeholder-gray-500 focus:outline-none focus:border-credora-orange/50 focus:ring-2 focus:ring-credora-orange/20 transition-all duration-200 disabled:opacity-50"
                />
              </div>

              {/* Business Category */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-300">
                  Business Category <span className="text-credora-orange">*</span>
                </label>
                <select
                  value={formData.businessType}
                  onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
                  disabled={isLoading}
                  className="w-full px-4 py-3 bg-[#282828] border border-[#333] text-white rounded-xl focus:outline-none focus:border-credora-orange/50 focus:ring-2 focus:ring-credora-orange/20 transition-all duration-200 disabled:opacity-50"
                >
                  <option value="">Select your business category</option>
                  {BUSINESS_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>

              {/* City & Max Competitors Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Target City</label>
                  <select
                    value={formData.city}
                    onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-[#282828] border border-[#333] text-white rounded-xl focus:outline-none focus:border-credora-orange/50 focus:ring-2 focus:ring-credora-orange/20 transition-all duration-200 disabled:opacity-50"
                  >
                    {PAKISTANI_CITIES.map((city) => (
                      <option key={city} value={city}>{city}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-300">Competitors to Analyze</label>
                  <select
                    value={formData.maxCompetitors.toString()}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxCompetitors: parseInt(e.target.value) }))}
                    disabled={isLoading}
                    className="w-full px-4 py-3 bg-[#282828] border border-[#333] text-white rounded-xl focus:outline-none focus:border-credora-orange/50 focus:ring-2 focus:ring-credora-orange/20 transition-all duration-200 disabled:opacity-50"
                  >
                    {[3, 5, 7, 10].map((num) => (
                      <option key={num} value={num}>{num} competitors</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-[#2a2a2a] my-6"></div>

              {/* Options */}
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-credora-orange" />
                  Analysis Options
                </h3>
                
                {/* Generate Report */}
                <label className="flex items-center gap-3 p-4 rounded-xl bg-[#282828] border border-[#333] cursor-pointer hover:border-credora-orange/30 transition-all duration-200 group">
                  <input
                    type="checkbox"
                    checked={formData.generateReport}
                    onChange={(e) => setFormData(prev => ({ ...prev, generateReport: e.target.checked }))}
                    disabled={isLoading}
                    className="w-5 h-5 rounded border-[#444] bg-[#1e1e1e] text-credora-orange focus:ring-2 focus:ring-credora-orange/20 transition-all"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <FileText className="h-4 w-4 text-gray-400 group-hover:text-credora-orange transition-colors" />
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Generate comprehensive report
                    </span>
                  </div>
                </label>

                {/* Visible Browser */}
                <label className="flex items-center gap-3 p-4 rounded-xl bg-[#282828] border border-[#333] cursor-pointer hover:border-credora-orange/30 transition-all duration-200 group">
                  <input
                    type="checkbox"
                    checked={formData.visibleBrowser}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibleBrowser: e.target.checked }))}
                    disabled={isLoading}
                    className="w-5 h-5 rounded border-[#444] bg-[#1e1e1e] text-credora-orange focus:ring-2 focus:ring-credora-orange/20 transition-all"
                  />
                  <div className="flex items-center gap-2 flex-1">
                    {formData.visibleBrowser ? (
                      <Eye className="h-4 w-4 text-credora-orange transition-colors" />
                    ) : (
                      <EyeOff className="h-4 w-4 text-gray-400 group-hover:text-credora-orange transition-colors" />
                    )}
                    <span className="text-sm text-gray-300 group-hover:text-white transition-colors">
                      Show browser during analysis (demo mode)
                    </span>
                  </div>
                </label>
                
                {/* Visible Browser Alert */}
                {formData.visibleBrowser && (
                  <div className="p-4 rounded-xl bg-credora-orange/10 border border-credora-orange/30 animate-slide-up">
                    <div className="flex items-start gap-3">
                      <Eye className="h-5 w-5 text-credora-orange mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-credora-orange">Visible Browser Mode Enabled</p>
                        <p className="text-xs text-gray-400 mt-1">
                          A browser window will open and you can watch the analysis happen in real-time
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Alert */}
              {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 animate-slide-up">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-400">Analysis Failed</p>
                      <p className="text-xs text-gray-400 mt-1">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Estimated Duration */}
              {isFormValid && !isLoading && (
                <div className="p-4 rounded-xl bg-[#282828] border border-[#333] animate-slide-up">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-400">
                      Estimated time: <span className="text-white font-medium">{estimatedDuration}</span>
                      {formData.visibleBrowser && <span className="text-gray-500"> (slower with visible browser)</span>}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="flex-1 px-6 py-3.5 bg-gradient-to-r from-credora-orange to-credora-red text-white rounded-xl font-medium hover:shadow-lg hover:shadow-credora-orange/25 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-none transition-all duration-300 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {formData.visibleBrowser ? "Analyzing (Browser Open)..." : "Analyzing Competitors..."}
                    </>
                  ) : (
                    <>
                      <TrendingUp className="h-5 w-5" />
                      Start Analysis
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className="px-6 py-3.5 bg-[#282828] border border-[#333] text-gray-300 rounded-xl font-medium hover:border-credora-orange/30 hover:text-credora-orange transition-all duration-200 disabled:opacity-50"
                >
                  Reset
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Info Panels */}
        <div className="space-y-6">
          {/* What We Analyze */}
          <div className="rounded-2xl bg-[#1e1e1e] border border-[#2a2a2a] p-5 transition-all duration-300 hover:border-credora-orange/30 hover:-translate-y-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Target className="h-4 w-4 text-emerald-400" />
              </div>
              <h3 className="text-base font-semibold text-white">What We Analyze</h3>
            </div>
            <div className="space-y-3">
              {[
                "Pricing strategies",
                "Discount & promotion tactics",
                "Delivery & shipping options",
                "Customer reviews & ratings",
                "WhatsApp & contact methods",
                "Website content & messaging"
              ].map((item, index) => (
                <div key={index} className="flex items-center gap-2.5 text-sm text-gray-400 hover:text-white transition-colors">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Analysis Process */}
          <div className="rounded-2xl bg-[#1e1e1e] border border-[#2a2a2a] p-5 transition-all duration-300 hover:border-credora-orange/30 hover:-translate-y-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-lg bg-credora-orange/10">
                <Zap className="h-4 w-4 text-credora-orange" />
              </div>
              <h3 className="text-base font-semibold text-white">Analysis Process</h3>
            </div>
            <div className="space-y-4">
              {[
                { step: 1, title: "Search Competitors", desc: "Find businesses in your category and city" },
                { step: 2, title: "Scrape Websites", desc: "Extract content and analyze strategies" },
                { step: 3, title: "AI Analysis", desc: "Generate strategic insights and recommendations" },
                { step: 4, title: "Generate Report", desc: "Create comprehensive analysis document" }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 group">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-credora-orange to-credora-red text-xs font-bold text-white flex-shrink-0 group-hover:scale-110 transition-transform">
                    {item.step}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-white group-hover:text-credora-orange transition-colors">{item.title}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <div className="animate-slide-up">
          <CompetitorResults 
            result={result} 
            onReset={handleReset}
            businessName={formData.businessName}
          />
        </div>
      )}
    </div>
  );
}
