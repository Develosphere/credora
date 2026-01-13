package com.credora.engine.services;

import com.credora.engine.dsa.CashFlowDP;
import com.credora.engine.dsa.ExpenseHeap;
import com.credora.engine.models.Forecast;
import com.credora.engine.models.Transaction;
import com.credora.engine.repositories.ForecastRepository;
import com.credora.engine.repositories.TransactionRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Service for cash flow forecasting.
 * 
 * Uses CashFlowDP for dynamic programming based predictions
 * and ExpenseHeap for expense prioritization.
 * 
 * Requirements: 4.2, 4.3, 4.6, 4.7
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ForecastService {

    private final TransactionRepository transactionRepository;
    private final ForecastRepository forecastRepository;
    private final ObjectMapper objectMapper;

    private static final int DEFAULT_HISTORY_DAYS = 90;
    private static final int MIN_DATA_DAYS = 7;

    /**
     * Generate cash flow forecast for a user.
     * 
     * @param userId User UUID
     * @param currentCash Current cash balance
     * @param daysAhead Number of days to forecast
     * @return Generated forecast
     */
    @Transactional(readOnly = true)
    public Forecast generateForecast(UUID userId, BigDecimal currentCash, int daysAhead) {
        log.info("Generating forecast for user {} with {} days ahead", userId, daysAhead);

        // Fetch historical transactions
        Instant startDate = Instant.now().minus(DEFAULT_HISTORY_DAYS, ChronoUnit.DAYS);
        Instant endDate = Instant.now();
        
        List<Transaction> history = transactionRepository.findByUserIdAndDateRange(
                userId, startDate, endDate);

        // Check for insufficient data
        if (history.size() < MIN_DATA_DAYS) {
            log.warn("Insufficient data for user {}: {} transactions", userId, history.size());
            return createInsufficientDataForecast(userId, currentCash, daysAhead, history.size());
        }

        // Use CashFlowDP for forecasting
        CashFlowDP cashFlowDP = new CashFlowDP();
        CashFlowDP.ForecastResult result = cashFlowDP.forecast(currentCash, history, daysAhead);

        // Build forecast entity
        Forecast forecast = Forecast.builder()
                .userId(userId)
                .forecastDate(LocalDate.now())
                .forecastDays(daysAhead)
                .currentCash(result.getCurrentCash())
                .burnRate(result.getBurnRate())
                .runwayDays(result.getRunwayDays() == Integer.MAX_VALUE ? null : result.getRunwayDays())
                .lowScenario(result.getLowScenario())
                .midScenario(result.getMidScenario())
                .highScenario(result.getHighScenario())
                .forecastPoints(serializeForecastPoints(result.getForecastPoints()))
                .confidenceLevel(result.getConfidenceLevel())
                .dataDaysUsed(result.getDataDaysUsed())
                .build();

        // Add warning if confidence is low
        if (result.getConfidenceLevel().compareTo(new BigDecimal("0.6")) < 0) {
            forecast.setWarningMessage("Low confidence forecast due to limited historical data");
        }

        log.info("Forecast generated: burnRate={}, runway={} days", 
                result.getBurnRate(), result.getRunwayDays());
        
        return forecast;
    }


    /**
     * Generate and save forecast to database.
     */
    @Transactional
    public Forecast generateAndSaveForecast(UUID userId, BigDecimal currentCash, int daysAhead) {
        Forecast forecast = generateForecast(userId, currentCash, daysAhead);
        return forecastRepository.save(forecast);
    }

    /**
     * Calculate burn rate for a user.
     * Burn Rate = sum(expenses over window) / window_days
     * 
     * Requirement: 4.2
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateBurnRate(UUID userId, int windowDays) {
        Instant startDate = Instant.now().minus(windowDays, ChronoUnit.DAYS);
        Instant endDate = Instant.now();
        
        List<Transaction> history = transactionRepository.findByUserIdAndDateRange(
                userId, startDate, endDate);

        CashFlowDP cashFlowDP = new CashFlowDP();
        return cashFlowDP.calculateBurnRate(history, windowDays);
    }

    /**
     * Calculate cash runway in days.
     * Runway = floor(current_cash / burn_rate)
     * 
     * Requirement: 4.3
     */
    @Transactional(readOnly = true)
    public int calculateRunway(UUID userId, BigDecimal currentCash) {
        BigDecimal burnRate = calculateBurnRate(userId, 30);
        CashFlowDP cashFlowDP = new CashFlowDP();
        return cashFlowDP.calculateRunway(currentCash, burnRate);
    }

    /**
     * Get upcoming expenses using ExpenseHeap.
     * 
     * Requirement: 4.4
     */
    @Transactional(readOnly = true)
    public List<ExpenseHeap.Expense> getUpcomingExpenses(UUID userId, int count) {
        // Fetch expense transactions
        Instant startDate = Instant.now();
        Instant endDate = Instant.now().plus(90, ChronoUnit.DAYS);
        
        List<Transaction> expenses = transactionRepository.findByUserIdAndTypeAndDateRange(
                userId, Transaction.Types.EXPENSE, startDate, endDate);

        // Build expense heap
        ExpenseHeap heap = new ExpenseHeap();
        for (Transaction t : expenses) {
            ExpenseHeap.Expense expense = new ExpenseHeap.Expense(
                    t.getId().toString(),
                    t.getPlatformId() != null ? t.getPlatformId() : "Expense",
                    t.getEffectiveAmountUsd(),
                    t.getOccurredAt().atZone(ZoneOffset.UTC).toLocalDate(),
                    t.getPlatform(),
                    false
            );
            heap.addExpense(expense);
        }

        return heap.getUpcomingExpenses(count);
    }

    /**
     * Get latest forecast for a user.
     */
    @Transactional(readOnly = true)
    public Optional<Forecast> getLatestForecast(UUID userId) {
        return forecastRepository.findTopByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Get forecast history for a user.
     */
    @Transactional(readOnly = true)
    public List<Forecast> getForecastHistory(UUID userId) {
        return forecastRepository.findByUserIdOrderByCreatedAtDesc(userId);
    }

    /**
     * Create forecast for insufficient data scenario.
     * 
     * Requirement: 4.7
     */
    private Forecast createInsufficientDataForecast(UUID userId, BigDecimal currentCash, 
                                                     int daysAhead, int dataPoints) {
        return Forecast.builder()
                .userId(userId)
                .forecastDate(LocalDate.now())
                .forecastDays(daysAhead)
                .currentCash(currentCash)
                .burnRate(BigDecimal.ZERO)
                .runwayDays(null)
                .lowScenario(currentCash)
                .midScenario(currentCash)
                .highScenario(currentCash)
                .confidenceLevel(new BigDecimal("0.1"))
                .dataDaysUsed(dataPoints)
                .warningMessage(String.format(
                        "Insufficient historical data. Need at least %d days, have %d.",
                        MIN_DATA_DAYS, dataPoints))
                .build();
    }

    /**
     * Serialize forecast points to JSON.
     */
    private String serializeForecastPoints(List<CashFlowDP.ForecastPoint> points) {
        if (points == null || points.isEmpty()) {
            return "[]";
        }
        
        try {
            List<Map<String, Object>> serializable = points.stream()
                    .map(p -> Map.<String, Object>of(
                            "date", p.getDate().toString(),
                            "predictedCash", p.getPredictedCash(),
                            "expectedInflow", p.getExpectedInflow(),
                            "expectedOutflow", p.getExpectedOutflow()
                    ))
                    .toList();
            return objectMapper.writeValueAsString(serializable);
        } catch (JsonProcessingException e) {
            log.error("Failed to serialize forecast points", e);
            return "[]";
        }
    }
}
