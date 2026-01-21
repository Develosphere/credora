"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Search, 
  FileText, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle, 
  Loader2,
  Eye,
  Download,
  ExternalLink,
  Clock
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

  const { isLoading, error, result, analyze, reset: resetAnalysis } = useCompetitorAnalysis();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.businessName.trim() || !formData.businessType) {
      return;
    }

    // Convert form data to API request
    const request: CompetitorAnalysisRequest = {
      business_type: formatBusinessType(formData.businessType),
      city: formData.city,
      max_competitors: formData.maxCompetitors,
      generate_report: formData.generateReport,
      visible_browser: formData.visibleBrowser,
    };

    // Debug logging
    console.log("🔍 Frontend Debug - Form Data:", formData);
    console.log("🔍 Frontend Debug - API Request:", request);
    console.log("🔍 Frontend Debug - Visible Browser:", formData.visibleBrowser, "->", request.visible_browser);
    
    // Alert for immediate feedback
    if (formData.visibleBrowser) {
      console.log("🎯 VISIBLE BROWSER MODE - Browser should open during analysis!");
      alert("🎯 Visible Browser Mode Enabled!\nA browser window should open during analysis.\nWatch your screen!");
    } else {
      console.log("🔇 Headless mode - no browser will be visible");
      alert("🔇 Headless Mode\nAnalysis will run in background without visible browser.");
    }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Competitor Analysis</h1>
          <p className="text-muted-foreground">
            Analyze your competitors and discover strategies to outperform them
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Analysis Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Business Information
              </CardTitle>
              <CardDescription>
                Enter your business details to find and analyze competitors
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Business Name */}
                <div className="space-y-2">
                  <Label htmlFor="businessName">
                    Business Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="businessName"
                    placeholder="e.g., Scents & Stories"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    disabled={isLoading}
                  />
                </div>

                {/* Business Category */}
                <div className="space-y-2">
                  <Label htmlFor="businessType">
                    Business Category <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.businessType}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, businessType: value }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your business category" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* City */}
                <div className="space-y-2">
                  <Label htmlFor="city">Target City</Label>
                  <Select
                    value={formData.city}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAKISTANI_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Max Competitors */}
                <div className="space-y-2">
                  <Label htmlFor="maxCompetitors">Number of Competitors to Analyze</Label>
                  <Select
                    value={formData.maxCompetitors.toString()}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, maxCompetitors: parseInt(value) }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[3, 5, 7, 10].map((num) => (
                        <SelectItem key={num} value={num.toString()}>
                          {num} competitors
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Options */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Analysis Options</h3>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="generateReport"
                      checked={formData.generateReport}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, generateReport: checked as boolean }))
                      }
                      disabled={isLoading}
                    />
                    <Label htmlFor="generateReport" className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Generate comprehensive report
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="visibleBrowser"
                      checked={formData.visibleBrowser}
                      onChange={(e) => {
                        console.log("🔍 Native checkbox changed:", e.target.checked);
                        setFormData(prev => {
                          const newData = { ...prev, visibleBrowser: e.target.checked };
                          console.log("🔍 New form data:", newData);
                          return newData;
                        });
                      }}
                      disabled={isLoading}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="visibleBrowser" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Show browser during analysis (demo mode)
                    </Label>
                  </div>
                  
                  {formData.visibleBrowser && (
                    <Alert>
                      <Eye className="h-4 w-4" />
                      <AlertDescription>
                        🎯 <strong>Visible Browser Mode ENABLED:</strong> A browser window will open and you can watch the analysis happen in real-time as it visits competitor websites.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {/* Debug Info */}
                  <div className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    🔍 Debug: visibleBrowser = {formData.visibleBrowser ? "TRUE" : "FALSE"}
                  </div>
                </div>

                {/* Error Alert */}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {/* Estimated Duration */}
                {isFormValid && (
                  <Alert>
                    <Clock className="h-4 w-4" />
                    <AlertDescription>
                      Estimated analysis time: {estimatedDuration}
                      {formData.visibleBrowser && " (slower with visible browser)"}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button 
                    type="submit" 
                    disabled={isLoading || !isFormValid}
                    className="flex-1"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {formData.visibleBrowser ? "Analyzing (Browser Open)..." : "Analyzing Competitors..."}
                      </>
                    ) : (
                      <>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Start Analysis
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleReset}
                    disabled={isLoading}
                  >
                    Reset
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="ghost" 
                    onClick={() => {
                      console.log("🔍 Current form data:", formData);
                      alert(`Debug Info:\nVisible Browser: ${formData.visibleBrowser}\nBusiness Type: ${formData.businessType}\nCity: ${formData.city}`);
                    }}
                    disabled={isLoading}
                  >
                    🔍 Debug
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Info Panel */}
        <div className="space-y-6">
          {/* What We Analyze */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">What We Analyze</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Pricing strategies
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Discount & promotion tactics
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Delivery & shipping options
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Customer reviews & ratings
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                WhatsApp & contact methods
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Website content & messaging
              </div>
            </CardContent>
          </Card>

          {/* Analysis Process */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Analysis Process</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  1
                </div>
                <div className="text-sm">
                  <div className="font-medium">Search Competitors</div>
                  <div className="text-muted-foreground">Find businesses in your category and city</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  2
                </div>
                <div className="text-sm">
                  <div className="font-medium">Scrape Websites</div>
                  <div className="text-muted-foreground">Extract content and analyze strategies</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  3
                </div>
                <div className="text-sm">
                  <div className="font-medium">AI Analysis</div>
                  <div className="text-muted-foreground">Generate strategic insights and recommendations</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  4
                </div>
                <div className="text-sm">
                  <div className="font-medium">Generate Report</div>
                  <div className="text-muted-foreground">Create comprehensive analysis document</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Results Section */}
      {result && (
        <CompetitorResults 
          result={result} 
          onReset={handleReset}
          businessName={formData.businessName}
        />
      )}
    </div>
  );
}