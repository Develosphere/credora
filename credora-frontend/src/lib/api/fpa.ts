/**
 * FPA (Financial Planning & Analysis) API module
 * Handles communication with Java FPA Engine via Python API
 */

import { pythonApi } from "./client";
import type {
  PnLReport,
  ForecastReport,
  SKUAnalysis,
  CampaignRanking,
  WhatIfScenario,
  SimulationResult,
  DashboardKPIs,
} from "./types";

/**
 * Calculate P&L statement for a date range
 */
export async function calculatePnL(
  startDate: string,
  endDate: string
): Promise<PnLReport> {
  return pythonApi.get<PnLReport>("/fpa/pnl", {
    params: { start_date: startDate, end_date: endDate },
  });
}

/**
 * Get cash flow forecast for specified number of days
 */
export async function getForecast(days: number): Promise<ForecastReport> {
  return pythonApi.get<ForecastReport>("/fpa/forecast", {
    params: { days },
  });
}

/**
 * Get SKU unit economics analysis
 */
export async function analyzeSKUs(): Promise<SKUAnalysis[]> {
  return pythonApi.get<SKUAnalysis[]>("/fpa/sku-analysis");
}

/**
 * Get ranked campaigns by performance
 */
export async function getRankedCampaigns(
  top: number = 5,
  bottom: number = 5
): Promise<CampaignRanking> {
  return pythonApi.get<CampaignRanking>("/fpa/campaigns", {
    params: { top, bottom },
  });
}

/**
 * Run what-if simulation
 */
export async function simulateWhatIf(
  scenario: WhatIfScenario
): Promise<SimulationResult> {
  return pythonApi.post<SimulationResult>("/fpa/whatif", scenario);
}

/**
 * Get dashboard KPIs (aggregated metrics)
 */
export async function getDashboardKPIs(): Promise<DashboardKPIs> {
  return pythonApi.get<DashboardKPIs>("/fpa/dashboard");
}

/**
 * FPA API object for convenience
 */
export const fpaApi = {
  calculatePnL,
  getForecast,
  analyzeSKUs,
  getRankedCampaigns,
  simulateWhatIf,
  getDashboardKPIs,
};
