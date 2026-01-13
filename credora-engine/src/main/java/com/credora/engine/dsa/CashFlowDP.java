package com.credora.engine.dsa;

import com.credora.engine.models.Transaction;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Dynamic Programming based Cash Flow Forecaster.
 * 
 * Uses historical transaction data to predict future cash positions.
 * 
 * Algorithm:
 * - dp[i] = predicted cash on day i
 * - dp[i] = dp[i-1] + expected_inflow[i] - expected_outflow[i]
 * 
 * Features:
 * - Sliding window burn rate calculation
 * - Day-of-week pattern recognition
 * - Confidence intervals (low/mid/high scenarios)
 * 
 * Time Complexity: O(n) where n = days to forecast
 * Space Complexity: O(n + h) where h = historical days
 * 
 * Requirements: 4.1, 4.2
 */
public class CashFlowDP {

    private static final int DEFAULT_WINDOW_DAYS = 30;
    private static final int MIN_DATA_DAYS = 7;
    
    // Confidence multipliers for scenarios
    private static final BigDecimal LOW_MULTIPLIER = new BigDecimal("0.8");
    private static final BigDecimal HIGH_MULTIPLIER = new BigDecimal("1.2");

    /**
     * Forecast result containing all prediction data.
     */
    public static class ForecastResult {
        private final BigDecimal currentCash;
        private final BigDecimal burnRate;
        private final int runwayDays;
        private final List<ForecastPoint> forecastPoints;
        private final BigDecimal lowScenario;
        private final BigDecimal midScenario;
        private final BigDecimal highScenario;
        private final int dataDaysUsed;
        private final BigDecimal confidenceLevel;

        public ForecastResult(BigDecimal currentCash, BigDecimal burnRate, int runwayDays,
                              List<ForecastPoint> forecastPoints, BigDecimal lowScenario,
                              BigDecimal midScenario, BigDecimal highScenario,
                              int dataDaysUsed, BigDecimal confidenceLevel) {
            this.currentCash = currentCash;
            this.burnRate = burnRate;
            this.runwayDays = runwayDays;
            this.forecastPoints = forecastPoints;
            this.lowScenario = lowScenario;
            this.midScenario = midScenario;
            this.highScenario = highScenario;
            this.dataDaysUsed = dataDaysUsed;
            this.confidenceLevel = confidenceLevel;
        }

        public BigDecimal getCurrentCash() { return currentCash; }
        public BigDecimal getBurnRate() { return burnRate; }
        public int getRunwayDays() { return runwayDays; }
        public List<ForecastPoint> getForecastPoints() { return forecastPoints; }
        public BigDecimal getLowScenario() { return lowScenario; }
        public BigDecimal getMidScenario() { return midScenario; }
        public BigDecimal getHighScenario() { return highScenario; }
        public int getDataDaysUsed() { return dataDaysUsed; }
        public BigDecimal getConfidenceLevel() { return confidenceLevel; }
    }

    /**
     * Single forecast point for a specific day.
     */
    public static class ForecastPoint {
        private final LocalDate date;
        private final BigDecimal predictedCash;
        private final BigDecimal expectedInflow;
        private final BigDecimal expectedOutflow;

        public ForecastPoint(LocalDate date, BigDecimal predictedCash,
                             BigDecimal expectedInflow, BigDecimal expectedOutflow) {
            this.date = date;
            this.predictedCash = predictedCash;
            this.expectedInflow = expectedInflow;
            this.expectedOutflow = expectedOutflow;
        }

        public LocalDate getDate() { return date; }
        public BigDecimal getPredictedCash() { return predictedCash; }
        public BigDecimal getExpectedInflow() { return expectedInflow; }
        public BigDecimal getExpectedOutflow() { return expectedOutflow; }
    }


    /**
     * Generate cash flow forecast using dynamic programming.
     * 
     * @param currentCash Current cash balance
     * @param history Historical transactions
     * @param daysAhead Number of days to forecast
     * @return ForecastResult with predictions
     */
    public ForecastResult forecast(BigDecimal currentCash, List<Transaction> history, int daysAhead) {
        if (currentCash == null) {
            currentCash = BigDecimal.ZERO;
        }
        if (history == null || history.isEmpty()) {
            return createEmptyForecast(currentCash, daysAhead);
        }

        // Calculate historical patterns
        Map<Integer, BigDecimal> avgInflowByDayOfWeek = calculateDayOfWeekPattern(history, true);
        Map<Integer, BigDecimal> avgOutflowByDayOfWeek = calculateDayOfWeekPattern(history, false);
        
        // Calculate burn rate using sliding window
        BigDecimal burnRate = calculateBurnRate(history, DEFAULT_WINDOW_DAYS);
        
        // Calculate data quality metrics
        int dataDaysUsed = calculateDataDays(history);
        BigDecimal confidenceLevel = calculateConfidence(dataDaysUsed);
        
        // DP array for cash predictions
        BigDecimal[] dp = new BigDecimal[daysAhead + 1];
        dp[0] = currentCash;
        
        List<ForecastPoint> forecastPoints = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        // Dynamic programming: dp[i] = dp[i-1] + inflow[i] - outflow[i]
        for (int i = 1; i <= daysAhead; i++) {
            LocalDate forecastDate = today.plusDays(i);
            int dayOfWeek = forecastDate.getDayOfWeek().getValue();
            
            BigDecimal expectedInflow = avgInflowByDayOfWeek.getOrDefault(dayOfWeek, BigDecimal.ZERO);
            BigDecimal expectedOutflow = avgOutflowByDayOfWeek.getOrDefault(dayOfWeek, BigDecimal.ZERO);
            
            dp[i] = dp[i - 1].add(expectedInflow).subtract(expectedOutflow);
            
            forecastPoints.add(new ForecastPoint(forecastDate, dp[i], expectedInflow, expectedOutflow));
        }
        
        // Calculate runway (days until cash runs out)
        int runwayDays = calculateRunway(currentCash, burnRate);
        
        // Calculate scenario projections at end of forecast period
        BigDecimal midScenario = dp[daysAhead];
        BigDecimal lowScenario = calculateScenario(currentCash, burnRate, daysAhead, LOW_MULTIPLIER);
        BigDecimal highScenario = calculateScenario(currentCash, burnRate, daysAhead, HIGH_MULTIPLIER);
        
        // Ensure low <= mid <= high
        if (lowScenario.compareTo(midScenario) > 0) {
            lowScenario = midScenario;
        }
        if (highScenario.compareTo(midScenario) < 0) {
            highScenario = midScenario;
        }
        
        return new ForecastResult(
                currentCash, burnRate, runwayDays, forecastPoints,
                lowScenario, midScenario, highScenario,
                dataDaysUsed, confidenceLevel
        );
    }

    /**
     * Calculate burn rate using sliding window.
     * Burn Rate = sum(expenses) / window_days
     * 
     * Requirement: 4.2
     */
    public BigDecimal calculateBurnRate(List<Transaction> history, int windowDays) {
        if (history == null || history.isEmpty() || windowDays <= 0) {
            return BigDecimal.ZERO;
        }

        Instant cutoff = Instant.now().minus(windowDays, ChronoUnit.DAYS);
        
        BigDecimal totalExpenses = history.stream()
                .filter(t -> t.isExpense() && t.getOccurredAt().isAfter(cutoff))
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        return totalExpenses.divide(BigDecimal.valueOf(windowDays), 2, RoundingMode.HALF_UP);
    }

    /**
     * Calculate cash runway in days.
     * Runway = floor(current_cash / burn_rate)
     * 
     * Requirement: 4.3
     */
    public int calculateRunway(BigDecimal currentCash, BigDecimal burnRate) {
        if (currentCash == null || burnRate == null || 
            burnRate.compareTo(BigDecimal.ZERO) <= 0) {
            return Integer.MAX_VALUE; // Infinite runway if no burn
        }
        
        if (currentCash.compareTo(BigDecimal.ZERO) <= 0) {
            return 0;
        }
        
        return currentCash.divide(burnRate, 0, RoundingMode.FLOOR).intValue();
    }

    /**
     * Calculate day-of-week patterns from historical data.
     */
    private Map<Integer, BigDecimal> calculateDayOfWeekPattern(List<Transaction> history, boolean isInflow) {
        Map<Integer, List<BigDecimal>> amountsByDay = new HashMap<>();
        
        for (Transaction t : history) {
            boolean matches = isInflow ? t.isRevenue() : t.isExpense();
            if (matches) {
                int dayOfWeek = t.getOccurredAt()
                        .atZone(ZoneOffset.UTC)
                        .getDayOfWeek()
                        .getValue();
                amountsByDay.computeIfAbsent(dayOfWeek, k -> new ArrayList<>())
                        .add(t.getEffectiveAmountUsd());
            }
        }
        
        // Calculate average for each day
        Map<Integer, BigDecimal> avgByDay = new HashMap<>();
        for (Map.Entry<Integer, List<BigDecimal>> entry : amountsByDay.entrySet()) {
            List<BigDecimal> amounts = entry.getValue();
            BigDecimal sum = amounts.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
            BigDecimal avg = sum.divide(BigDecimal.valueOf(amounts.size()), 2, RoundingMode.HALF_UP);
            avgByDay.put(entry.getKey(), avg);
        }
        
        return avgByDay;
    }

    /**
     * Calculate scenario projection.
     */
    private BigDecimal calculateScenario(BigDecimal currentCash, BigDecimal burnRate, 
                                          int days, BigDecimal multiplier) {
        BigDecimal adjustedBurn = burnRate.multiply(multiplier);
        BigDecimal totalBurn = adjustedBurn.multiply(BigDecimal.valueOf(days));
        return currentCash.subtract(totalBurn);
    }

    /**
     * Calculate number of days of historical data.
     */
    private int calculateDataDays(List<Transaction> history) {
        if (history == null || history.isEmpty()) {
            return 0;
        }
        
        Optional<Instant> earliest = history.stream()
                .map(Transaction::getOccurredAt)
                .min(Instant::compareTo);
        
        if (earliest.isEmpty()) {
            return 0;
        }
        
        return (int) ChronoUnit.DAYS.between(
                earliest.get().atZone(ZoneOffset.UTC).toLocalDate(),
                LocalDate.now()
        );
    }

    /**
     * Calculate confidence level based on data availability.
     */
    private BigDecimal calculateConfidence(int dataDays) {
        if (dataDays < MIN_DATA_DAYS) {
            return new BigDecimal("0.3"); // Low confidence
        } else if (dataDays < 30) {
            return new BigDecimal("0.6"); // Medium confidence
        } else if (dataDays < 90) {
            return new BigDecimal("0.8"); // Good confidence
        } else {
            return new BigDecimal("0.95"); // High confidence
        }
    }

    /**
     * Create empty forecast when no historical data available.
     */
    private ForecastResult createEmptyForecast(BigDecimal currentCash, int daysAhead) {
        List<ForecastPoint> points = new ArrayList<>();
        LocalDate today = LocalDate.now();
        
        for (int i = 1; i <= daysAhead; i++) {
            points.add(new ForecastPoint(
                    today.plusDays(i),
                    currentCash,
                    BigDecimal.ZERO,
                    BigDecimal.ZERO
            ));
        }
        
        return new ForecastResult(
                currentCash,
                BigDecimal.ZERO,
                Integer.MAX_VALUE,
                points,
                currentCash,
                currentCash,
                currentCash,
                0,
                new BigDecimal("0.1")
        );
    }
}
