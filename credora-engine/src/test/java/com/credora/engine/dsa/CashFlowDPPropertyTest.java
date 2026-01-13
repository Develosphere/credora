package com.credora.engine.dsa;

import com.credora.engine.models.Transaction;
import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Positive;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for CashFlowDP.
 * 
 * Tests:
 * - Property 5: Burn Rate Calculation
 * - Property 6: Cash Runway Calculation
 * - Property 7: Forecast Confidence Intervals
 * 
 * Requirements: 4.2, 4.3, 4.6
 */
class CashFlowDPPropertyTest {

    // ==================== Property 5: Burn Rate Calculation ====================

    /**
     * Property 5: Burn Rate Calculation
     * For any set of expense transactions over the last 30 days,
     * burn_rate SHALL equal sum(expense_amounts) / 30.
     * 
     * **Feature: fpa-engine, Property 5: Burn Rate Calculation**
     * **Validates: Requirements 4.2**
     */
    @Property
    void burnRateEqualsSumOfExpensesDividedByDays(
            @ForAll("expenseTransactions") List<Transaction> expenses,
            @ForAll @IntRange(min = 1, max = 90) int windowDays
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        
        // Calculate expected burn rate manually
        Instant cutoff = Instant.now().minus(windowDays, ChronoUnit.DAYS);
        BigDecimal totalExpenses = expenses.stream()
                .filter(t -> t.getOccurredAt().isAfter(cutoff))
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal expectedBurnRate = totalExpenses.divide(
                BigDecimal.valueOf(windowDays), 2, RoundingMode.HALF_UP);
        
        // Calculate actual burn rate
        BigDecimal actualBurnRate = cashFlowDP.calculateBurnRate(expenses, windowDays);
        
        // Compare using compareTo to handle scale differences (0 vs 0.00)
        assertEquals(0, expectedBurnRate.compareTo(actualBurnRate),
                String.format("Burn rate should equal sum(expenses) / window_days. Expected: %s, Actual: %s",
                        expectedBurnRate, actualBurnRate));
    }

    /**
     * Property: Burn rate is always non-negative.
     */
    @Property
    void burnRateIsNonNegative(
            @ForAll("expenseTransactions") List<Transaction> expenses,
            @ForAll @IntRange(min = 1, max = 90) int windowDays
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        BigDecimal burnRate = cashFlowDP.calculateBurnRate(expenses, windowDays);
        
        assertTrue(burnRate.compareTo(BigDecimal.ZERO) >= 0,
                "Burn rate should be non-negative");
    }

    /**
     * Property: Empty transaction list results in zero burn rate.
     */
    @Property
    void emptyTransactionsGiveZeroBurnRate(
            @ForAll @IntRange(min = 1, max = 90) int windowDays
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        
        assertEquals(BigDecimal.ZERO, cashFlowDP.calculateBurnRate(Collections.emptyList(), windowDays));
        assertEquals(BigDecimal.ZERO, cashFlowDP.calculateBurnRate(null, windowDays));
    }

    // ==================== Property 6: Cash Runway Calculation ====================

    /**
     * Property 6: Cash Runway Calculation
     * For any positive burn_rate, cash_runway_days SHALL equal floor(current_cash / burn_rate).
     * 
     * **Feature: fpa-engine, Property 6: Cash Runway Calculation**
     * **Validates: Requirements 4.3**
     */
    @Property
    void runwayEqualsFloorOfCashDividedByBurnRate(
            @ForAll @Positive BigDecimal currentCash,
            @ForAll("positiveBurnRate") BigDecimal burnRate
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        
        // Calculate expected runway
        int expectedRunway = currentCash.divide(burnRate, 0, RoundingMode.FLOOR).intValue();
        
        // Calculate actual runway
        int actualRunway = cashFlowDP.calculateRunway(currentCash, burnRate);
        
        assertEquals(expectedRunway, actualRunway,
                "Runway should equal floor(current_cash / burn_rate)");
    }

    /**
     * Property: Zero or negative burn rate gives infinite runway.
     */
    @Property
    void zeroBurnRateGivesInfiniteRunway(
            @ForAll @Positive BigDecimal currentCash
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        
        assertEquals(Integer.MAX_VALUE, cashFlowDP.calculateRunway(currentCash, BigDecimal.ZERO));
        assertEquals(Integer.MAX_VALUE, cashFlowDP.calculateRunway(currentCash, new BigDecimal("-10")));
        assertEquals(Integer.MAX_VALUE, cashFlowDP.calculateRunway(currentCash, null));
    }

    /**
     * Property: Zero or negative cash gives zero runway.
     */
    @Property
    void zeroCashGivesZeroRunway(
            @ForAll("positiveBurnRate") BigDecimal burnRate
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        
        assertEquals(0, cashFlowDP.calculateRunway(BigDecimal.ZERO, burnRate));
        assertEquals(0, cashFlowDP.calculateRunway(new BigDecimal("-100"), burnRate));
    }

    // ==================== Property 7: Forecast Confidence Intervals ====================

    /**
     * Property 7: Forecast Confidence Intervals
     * For any generated forecast, the output SHALL contain low_scenario, mid_scenario,
     * and high_scenario values where low_scenario ≤ mid_scenario ≤ high_scenario.
     * 
     * **Feature: fpa-engine, Property 7: Forecast Confidence Intervals**
     * **Validates: Requirements 4.6**
     */
    @Property
    void forecastConfidenceIntervalsAreOrdered(
            @ForAll @Positive BigDecimal currentCash,
            @ForAll("mixedTransactions") List<Transaction> history,
            @ForAll @IntRange(min = 1, max = 90) int daysAhead
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        CashFlowDP.ForecastResult result = cashFlowDP.forecast(currentCash, history, daysAhead);
        
        // Verify low <= mid <= high
        assertTrue(result.getLowScenario().compareTo(result.getMidScenario()) <= 0,
                "Low scenario should be <= mid scenario");
        assertTrue(result.getMidScenario().compareTo(result.getHighScenario()) <= 0,
                "Mid scenario should be <= high scenario");
    }

    /**
     * Property: Forecast always returns valid result.
     */
    @Property
    void forecastAlwaysReturnsValidResult(
            @ForAll @Positive BigDecimal currentCash,
            @ForAll("mixedTransactions") List<Transaction> history,
            @ForAll @IntRange(min = 1, max = 90) int daysAhead
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        CashFlowDP.ForecastResult result = cashFlowDP.forecast(currentCash, history, daysAhead);
        
        assertNotNull(result);
        assertNotNull(result.getCurrentCash());
        assertNotNull(result.getBurnRate());
        assertNotNull(result.getForecastPoints());
        assertNotNull(result.getLowScenario());
        assertNotNull(result.getMidScenario());
        assertNotNull(result.getHighScenario());
        assertNotNull(result.getConfidenceLevel());
        
        assertEquals(daysAhead, result.getForecastPoints().size(),
                "Should have forecast point for each day");
    }

    /**
     * Property: Confidence level is between 0 and 1.
     */
    @Property
    void confidenceLevelIsBounded(
            @ForAll @Positive BigDecimal currentCash,
            @ForAll("mixedTransactions") List<Transaction> history,
            @ForAll @IntRange(min = 1, max = 90) int daysAhead
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        CashFlowDP.ForecastResult result = cashFlowDP.forecast(currentCash, history, daysAhead);
        
        assertTrue(result.getConfidenceLevel().compareTo(BigDecimal.ZERO) >= 0,
                "Confidence should be >= 0");
        assertTrue(result.getConfidenceLevel().compareTo(BigDecimal.ONE) <= 0,
                "Confidence should be <= 1");
    }

    /**
     * Property: Empty history gives low confidence forecast.
     */
    @Property
    void emptyHistoryGivesLowConfidence(
            @ForAll @Positive BigDecimal currentCash,
            @ForAll @IntRange(min = 1, max = 90) int daysAhead
    ) {
        CashFlowDP cashFlowDP = new CashFlowDP();
        
        CashFlowDP.ForecastResult result = cashFlowDP.forecast(currentCash, Collections.emptyList(), daysAhead);
        
        assertTrue(result.getConfidenceLevel().compareTo(new BigDecimal("0.3")) <= 0,
                "Empty history should give low confidence");
        assertEquals(BigDecimal.ZERO, result.getBurnRate(),
                "Empty history should give zero burn rate");
    }

    // ==================== Providers ====================

    @Provide
    Arbitrary<List<Transaction>> expenseTransactions() {
        return Arbitraries.integers().between(0, 20)
                .flatMap(count -> {
                    if (count == 0) {
                        return Arbitraries.just(Collections.emptyList());
                    }
                    return Arbitraries.bigDecimals()
                            .between(new BigDecimal("1.00"), new BigDecimal("1000.00"))
                            .ofScale(2)
                            .list()
                            .ofSize(count)
                            .map(amounts -> {
                                List<Transaction> transactions = new ArrayList<>();
                                for (int i = 0; i < amounts.size(); i++) {
                                    // Spread transactions over last 60 days
                                    Instant occurredAt = Instant.now().minus(i * 3, ChronoUnit.DAYS);
                                    transactions.add(Transaction.builder()
                                            .id(UUID.randomUUID())
                                            .userId(UUID.randomUUID())
                                            .platform("other")
                                            .type(Transaction.Types.EXPENSE)
                                            .amount(amounts.get(i))
                                            .amountUsd(amounts.get(i))
                                            .occurredAt(occurredAt)
                                            .build());
                                }
                                return transactions;
                            });
                });
    }

    @Provide
    Arbitrary<List<Transaction>> mixedTransactions() {
        Arbitrary<Transaction> orderTx = createTransactionArbitrary(Transaction.Types.ORDER);
        Arbitrary<Transaction> expenseTx = createTransactionArbitrary(Transaction.Types.EXPENSE);
        Arbitrary<Transaction> adSpendTx = createTransactionArbitrary(Transaction.Types.AD_SPEND);

        return Arbitraries.oneOf(orderTx, expenseTx, adSpendTx)
                .list()
                .ofMinSize(0)
                .ofMaxSize(30);
    }

    @Provide
    Arbitrary<BigDecimal> positiveBurnRate() {
        return Arbitraries.bigDecimals()
                .between(new BigDecimal("0.01"), new BigDecimal("10000.00"))
                .ofScale(2);
    }

    private Arbitrary<Transaction> createTransactionArbitrary(String type) {
        return Arbitraries.bigDecimals()
                .between(new BigDecimal("1.00"), new BigDecimal("5000.00"))
                .ofScale(2)
                .flatMap(amount -> Arbitraries.integers().between(0, 60)
                        .map(daysAgo -> Transaction.builder()
                                .id(UUID.randomUUID())
                                .userId(UUID.randomUUID())
                                .platform(type.equals(Transaction.Types.ORDER) ? "shopify" : "other")
                                .type(type)
                                .amount(amount)
                                .amountUsd(amount)
                                .occurredAt(Instant.now().minus(daysAgo, ChronoUnit.DAYS))
                                .build()));
    }
}
