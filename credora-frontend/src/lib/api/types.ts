/**
 * API Types and Interfaces
 * Based on the design document data models
 */

// User and Auth
export interface User {
  id: string;
  email: string;
  name: string;
  picture?: string;
  createdAt: string;
  onboardingComplete: boolean;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface OAuthRedirect {
  redirectUrl: string;
}

// P&L Report
export interface PnLReport {
  userId: string;
  startDate: string;
  endDate: string;
  revenue: number;
  refunds: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;
  adSpend: number;
  otherExpenses: number;
  operatingCosts: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
}

// Forecast
export interface ForecastReport {
  currentCash: number;
  burnRate: number;
  runwayDays: number;
  lowScenario: number;
  midScenario: number;
  highScenario: number;
  forecastPoints: ForecastPoint[];
}

export interface ForecastPoint {
  date: string;
  low: number;
  mid: number;
  high: number;
}

// SKU Analysis
export interface SKUAnalysis {
  skuId: string;
  name: string;
  profitPerUnit: number;
  cac: number;
  refundRate: number;
  trueRoas: number;
  inventoryDays: number;
  totalRevenue: number;
  totalProfit: number;
}

// Campaign
export interface CampaignRanking {
  topCampaigns: Campaign[];
  bottomCampaigns: Campaign[];
  totalSpend: number;
  totalRevenue: number;
  overallRoas: number;
}

export interface Campaign {
  id: string;
  name: string;
  platform: "meta" | "google";
  spend: number;
  revenue: number;
  conversions: number;
  effectiveRoas: number;
  dataQuality: "high" | "medium" | "low";
}

// What-If Simulation
export type WhatIfScenarioType =
  | "AD_SPEND_CHANGE"
  | "PRICE_CHANGE"
  | "INVENTORY_ORDER";

export interface WhatIfScenario {
  type: WhatIfScenarioType;
  parameters: Record<string, number | string>;
}

export interface SimulationResult {
  baseline: Record<string, number>;
  projected: Record<string, number>;
  impact: Record<string, number>;
  recommendations: string[];
}

// Chat
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: DataSource[];
}

export interface DataSource {
  type: "pnl" | "forecast" | "sku" | "campaign";
  reference: string;
  summary: string;
}

export interface ChatResponse {
  message: ChatMessage;
  context: RAGContext;
}

export interface RAGContext {
  retrievedDocuments: string[];
  relevanceScores: number[];
  usedInResponse: boolean;
}

// Platform Connection
export type PlatformType = "shopify" | "meta" | "google";
export type ConnectionStatus = "connected" | "pending" | "failed" | "not_connected";

export interface PlatformStatus {
  platform: PlatformType;
  status: ConnectionStatus;
  lastSync?: string;
  error?: string;
}

// Dashboard KPIs
export interface DashboardKPIs {
  revenue: number;
  netProfit: number;
  cashRunway: number;
  topSku: {
    id?: string;
    name: string;
    profit: number;
  } | null;
  worstCampaign: {
    id?: string;
    name: string;
    roas: number;
  } | null;
  hasConnectedPlatforms: boolean;
}

// Insights
export interface Insight {
  id: string;
  title: string;
  description: string;
  reasoning: string;
  impact: "high" | "medium" | "low";
  category: "revenue" | "cost" | "efficiency" | "risk";
  relatedPage?: string;
  dismissed: boolean;
  createdAt: string;
}

// System Status
export type ServiceHealthStatus = "healthy" | "unhealthy" | "unknown";

export interface ServiceHealth {
  service: "python_api" | "java_engine";
  status: ServiceHealthStatus;
  responseTime?: number;
  error?: string;
  lastChecked: string;
}

export interface SystemStatus {
  services: ServiceHealth[];
  platforms: PlatformStatus[];
}
