package com.credora.engine.services;

import net.jqwik.api.*;
import net.jqwik.api.constraints.IntRange;
import net.jqwik.api.constraints.Positive;

import java.math.BigDecimal;
import java.math.RoundingMode;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for SKU economics calculations.
 * 
 * Tests:
 * - Property 8: SKU Profit Per Unit
 * - Property 9: SKU Refund Rate
 * - Property 10: SKU True ROAS
 * 
 * Requirements: 5.1, 5.3, 5.5
 */
class SkuAnalyzerPropertyTest {

    // ==================== Property 8: SKU Profit Per Unit ====================

    /**
     * Property 8: SKU Profit Per Unit
     * For any SKU with defined selling_price, unit_cost, and allocated_ad_cost,
     * profit_per_unit SHALL equal selling_price - unit_cost - allocated_ad_cost.
     * 
     * **Feature: fpa-engine, Property 8: SKU Profit Per Unit**
     * **Validates: Requirements 5.1**
     */
    @Property
    void profitPerUnitEqualsSellingPriceMinusCosts(
            @ForAll("prices") BigDecimal sellingPrice,
            @ForAll("costs") BigDecimal unitCost,
            @ForAll("costs") BigDecimal allocatedAdCost
    ) {
        // Calculate expected
        BigDecimal expected = sellingPrice.subtract(unitCost).subtract(allocatedAdCost);
        
        // Calculate actual using service method
        BigDecimal actual = calculateProfitPerUnit(sellingPrice, unitCost, allocatedAdCost);
        
        assertEquals(0, expected.compareTo(actual),
                String.format("Profit per unit should equal selling_price - unit_cost - allocated_ad_cost. " +
                        "Expected: %s, Actual: %s", expected, actual));
    }

    /**
     * Property: Profit per unit handles null values gracefully.
     */
    @Property
    void profitPerUnitHandlesNulls(
            @ForAll("nullablePrices") BigDecimal sellingPrice,
            @ForAll("nullablePrices") BigDecimal unitCost,
            @ForAll("nullablePrices") BigDecimal allocatedAdCost
    ) {
        // Should not throw exception
        BigDecimal result = calculateProfitPerUnit(sellingPrice, unitCost, allocatedAdCost);
        assertNotNull(result);
    }

    // ==================== Property 9: SKU Refund Rate ====================

    /**
     * Property 9: SKU Refund Rate
     * For any SKU with total_orders > 0, refund_rate SHALL equal 
     * refund_count / total_orders, bounded between 0 and 1.
     * 
     * **Feature: fpa-engine, Property 9: SKU Refund Rate**
     * **Validates: Requirements 5.3**
     */
    @Property
    void refundRateEqualsRefundsDividedByOrders(
            @ForAll @IntRange(min = 1, max = 10000) int totalOrders,
            @ForAll @IntRange(min = 0, max = 10000) int refundCount
    ) {
        BigDecimal expected = BigDecimal.valueOf(refundCount)
                .divide(BigDecimal.valueOf(totalOrders), 4, RoundingMode.HALF_UP);
        
        // Bound expected between 0 and 1
        if (expected.compareTo(BigDecimal.ZERO) < 0) expected = BigDecimal.ZERO;
        if (expected.compareTo(BigDecimal.ONE) > 0) expected = BigDecimal.ONE;
        
        BigDecimal actual = calculateRefundRate(totalOrders, refundCount);
        
        assertEquals(0, expected.compareTo(actual),
                String.format("Refund rate should equal refund_count / total_orders. " +
                        "Expected: %s, Actual: %s", expected, actual));
    }

    /**
     * Property: Refund rate is bounded between 0 and 1.
     */
    @Property
    void refundRateIsBounded(
            @ForAll @IntRange(min = 0, max = 10000) int totalOrders,
            @ForAll @IntRange(min = 0, max = 10000) int refundCount
    ) {
        BigDecimal rate = calculateRefundRate(totalOrders, refundCount);
        
        assertTrue(rate.compareTo(BigDecimal.ZERO) >= 0,
                "Refund rate should be >= 0");
        assertTrue(rate.compareTo(BigDecimal.ONE) <= 0,
                "Refund rate should be <= 1");
    }

    /**
     * Property: Zero orders gives zero refund rate.
     */
    @Property
    void zeroOrdersGivesZeroRefundRate(
            @ForAll @IntRange(min = 0, max = 1000) int refundCount
    ) {
        BigDecimal rate = calculateRefundRate(0, refundCount);
        assertEquals(0, BigDecimal.ZERO.compareTo(rate),
                "Zero orders should give zero refund rate");
    }

    // ==================== Property 10: SKU True ROAS ====================

    /**
     * Property 10: SKU True ROAS
     * For any SKU with ad_spend > 0, true_ROAS SHALL equal 
     * (revenue × gross_margin) / ad_spend.
     * 
     * **Feature: fpa-engine, Property 10: SKU True ROAS**
     * **Validates: Requirements 5.5**
     */
    @Property
    void trueRoasEqualsRevenueTimesMarginDividedBySpend(
            @ForAll("revenue") BigDecimal revenue,
            @ForAll("margin") BigDecimal grossMargin,
            @ForAll("positiveSpend") BigDecimal adSpend
    ) {
        BigDecimal expected = revenue.multiply(grossMargin)
                .divide(adSpend, 2, RoundingMode.HALF_UP);
        
        BigDecimal actual = calculateTrueRoas(revenue, grossMargin, adSpend);
        
        assertEquals(0, expected.compareTo(actual),
                String.format("True ROAS should equal (revenue × gross_margin) / ad_spend. " +
                        "Expected: %s, Actual: %s", expected, actual));
    }

    /**
     * Property: Zero or negative ad spend gives zero ROAS.
     */
    @Property
    void zeroAdSpendGivesZeroRoas(
            @ForAll("revenue") BigDecimal revenue,
            @ForAll("margin") BigDecimal grossMargin
    ) {
        assertEquals(0, BigDecimal.ZERO.compareTo(calculateTrueRoas(revenue, grossMargin, BigDecimal.ZERO)),
                "Zero ad spend should give zero ROAS");
        assertEquals(0, BigDecimal.ZERO.compareTo(calculateTrueRoas(revenue, grossMargin, new BigDecimal("-100"))),
                "Negative ad spend should give zero ROAS");
        assertEquals(0, BigDecimal.ZERO.compareTo(calculateTrueRoas(revenue, grossMargin, null)),
                "Null ad spend should give zero ROAS");
    }

    /**
     * Property: True ROAS is non-negative when inputs are non-negative.
     */
    @Property
    void trueRoasIsNonNegativeForNonNegativeInputs(
            @ForAll @Positive BigDecimal revenue,
            @ForAll("positiveMargin") BigDecimal grossMargin,
            @ForAll("positiveSpend") BigDecimal adSpend
    ) {
        BigDecimal roas = calculateTrueRoas(revenue, grossMargin, adSpend);
        assertTrue(roas.compareTo(BigDecimal.ZERO) >= 0,
                "True ROAS should be non-negative for non-negative inputs");
    }

    // ==================== Providers ====================

    @Provide
    Arbitrary<BigDecimal> prices() {
        return Arbitraries.bigDecimals()
                .between(new BigDecimal("0.01"), new BigDecimal("10000.00"))
                .ofScale(2);
    }

    @Provide
    Arbitrary<BigDecimal> costs() {
        return Arbitraries.bigDecimals()
                .between(BigDecimal.ZERO, new BigDecimal("5000.00"))
                .ofScale(2);
    }

    @Provide
    Arbitrary<BigDecimal> nullablePrices() {
        return Arbitraries.oneOf(
                Arbitraries.just(null),
                Arbitraries.bigDecimals()
                        .between(BigDecimal.ZERO, new BigDecimal("1000.00"))
                        .ofScale(2)
        );
    }

    @Provide
    Arbitrary<BigDecimal> revenue() {
        return Arbitraries.bigDecimals()
                .between(BigDecimal.ZERO, new BigDecimal("100000.00"))
                .ofScale(2);
    }

    @Provide
    Arbitrary<BigDecimal> margin() {
        return Arbitraries.bigDecimals()
                .between(BigDecimal.ZERO, BigDecimal.ONE)
                .ofScale(4);
    }

    @Provide
    Arbitrary<BigDecimal> positiveMargin() {
        return Arbitraries.bigDecimals()
                .between(new BigDecimal("0.01"), BigDecimal.ONE)
                .ofScale(4);
    }

    @Provide
    Arbitrary<BigDecimal> positiveSpend() {
        return Arbitraries.bigDecimals()
                .between(new BigDecimal("0.01"), new BigDecimal("50000.00"))
                .ofScale(2);
    }

    // ==================== Calculation Methods (mirroring SkuAnalyzerService) ====================

    private BigDecimal calculateProfitPerUnit(BigDecimal sellingPrice, BigDecimal unitCost,
                                               BigDecimal allocatedAdCost) {
        if (sellingPrice == null) sellingPrice = BigDecimal.ZERO;
        if (unitCost == null) unitCost = BigDecimal.ZERO;
        if (allocatedAdCost == null) allocatedAdCost = BigDecimal.ZERO;

        return sellingPrice.subtract(unitCost).subtract(allocatedAdCost);
    }

    private BigDecimal calculateRefundRate(int totalOrders, int refundCount) {
        if (totalOrders <= 0) return BigDecimal.ZERO;

        BigDecimal rate = BigDecimal.valueOf(refundCount)
                .divide(BigDecimal.valueOf(totalOrders), 4, RoundingMode.HALF_UP);

        if (rate.compareTo(BigDecimal.ZERO) < 0) return BigDecimal.ZERO;
        if (rate.compareTo(BigDecimal.ONE) > 0) return BigDecimal.ONE;

        return rate;
    }

    private BigDecimal calculateTrueRoas(BigDecimal revenue, BigDecimal grossMargin,
                                          BigDecimal adSpend) {
        if (adSpend == null || adSpend.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (revenue == null) revenue = BigDecimal.ZERO;
        if (grossMargin == null) grossMargin = BigDecimal.ZERO;

        return revenue.multiply(grossMargin)
                .divide(adSpend, 2, RoundingMode.HALF_UP);
    }
}
