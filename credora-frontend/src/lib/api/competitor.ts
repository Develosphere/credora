/**
 * Competitor Analysis API functions
 */

import { publicPythonApi } from "./client";

// Types for competitor analysis
export interface CompetitorAnalysisRequest {
  business_type: string;
  city: string;
  max_competitors: number;
  generate_report: boolean;
  visible_browser?: boolean;
}

export interface CompetitorAnalysisResponse {
  status: string;
  message: string;
  result?: string;
  report_path?: string;
  competitors_analyzed: number;
}

export interface CompetitorSearchResponse {
  status: string;
  message: string;
  competitors: Array<{
    name: string;
    url: string;
    snippet: string;
  }>;
}

export interface QuickAnalysisResponse {
  status: string;
  analysis: {
    url: string;
    title: string;
    strategies: {
      shows_prices: boolean;
      has_discounts: boolean;
      offers_delivery: boolean;
      has_reviews: boolean;
      has_whatsapp: boolean;
    };
    content_length: number;
    strategy_score: string;
  };
}

/**
 * Run comprehensive competitor analysis
 */
export async function analyzeCompetitors(
  request: CompetitorAnalysisRequest
): Promise<CompetitorAnalysisResponse> {
  console.log("🔍 API Client - Sending request:", request);
  console.log("🔍 API Client - visible_browser:", request.visible_browser);
  
  const response = await publicPythonApi.post<CompetitorAnalysisResponse>("/competitor/analyze", request);
  
  console.log("🔍 API Client - Response received:", response);
  
  return response;
}

/**
 * Search for competitors (lightweight)
 */
export async function searchCompetitors(
  business_type: string,
  city: string = "Karachi",
  max_results: number = 5
): Promise<CompetitorSearchResponse> {
  return publicPythonApi.get<CompetitorSearchResponse>("/competitor/search", {
    params: {
      business_type,
      city,
      max_results,
    },
  });
}

/**
 * Quick analysis of a single competitor
 */
export async function quickAnalyzeCompetitor(
  url: string
): Promise<QuickAnalysisResponse> {
  return publicPythonApi.post<QuickAnalysisResponse>("/competitor/quick-analyze", null, {
    params: { url },
  });
}

// Business categories for the form
export const BUSINESS_CATEGORIES = [
  "Perfume & Fragrances",
  "Clothing & Fashion",
  "Electronics",
  "Home & Garden",
  "Beauty & Cosmetics",
  "Jewelry & Accessories",
  "Sports & Fitness",
  "Books & Stationery",
  "Food & Beverages",
  "Health & Wellness",
  "Toys & Games",
  "Automotive",
  "Real Estate",
  "Education & Training",
  "Travel & Tourism",
  "Other",
] as const;

// Pakistani cities for the form
export const PAKISTANI_CITIES = [
  "Karachi",
  "Lahore",
  "Islamabad",
  "Rawalpindi",
  "Faisalabad",
  "Multan",
  "Peshawar",
  "Quetta",
  "Sialkot",
  "Gujranwala",
  "Hyderabad",
  "Bahawalpur",
  "Sargodha",
  "Sukkur",
  "Larkana",
  "Mardan",
  "Mingora",
  "Rahim Yar Khan",
  "Sahiwal",
  "Okara",
] as const;

/**
 * Download competitor analysis report
 */
export async function downloadReport(reportPath: string): Promise<Blob> {
  const response = await fetch(`http://localhost:8000/competitor/report/download?path=${encodeURIComponent(reportPath)}`);
  if (!response.ok) {
    throw new Error('Failed to download report');
  }
  return response.blob();
}

/**
 * Get competitor analysis report content
 */
export async function getReportContent(reportPath: string): Promise<string> {
  const response = await fetch(`http://localhost:8000/competitor/report/content?path=${encodeURIComponent(reportPath)}`);
  if (!response.ok) {
    throw new Error('Failed to fetch report content');
  }
  const data = await response.json();
  return data.content;
}

export type BusinessCategory = typeof BUSINESS_CATEGORIES[number];
export type PakistaniCity = typeof PAKISTANI_CITIES[number];