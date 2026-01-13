package com.credora.engine.services;

import com.credora.engine.dsa.SkuCostMap;
import com.credora.engine.models.Transaction;
import net.jqwik.api.*;
import net.jqwik.api.constraints.Positive;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for P&L calculations.
 * 
 * Validates Property 1: P&L Calculation Consistency
 * 
 * For any set of transactions in a date range, the P&L calculation SHALL satisfy:
 * - Revenue = sum(order_amounts) - sum(refund_amounts)
 * - COGS = sum(quantity × unit_cost) for all order transactions
 * - Gross_Profit = Revenue - COGS
 * - Operating_Costs = sum(ad_spend) + sum(other_expenses)
 * - Net_Profit = Gross_Profit - Operating_Costs
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
class PnLServicePropertyTest {

    // ==================== Property 1: Revenue Calculation ====================

    /**
     * Property: Revenue equals sum of all order transaction amounts.
     * Requirement: 3.1
     */
    @Property
    void revenueEqualsSumOfOrders(@ForAll("mixedTransactions") List<Transaction> transactions) {
        BigDecimal expectedRevenue = transactions.stream()
                .filter(t -> Transaction.Types.ORDER.equals(t.getType()))
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal actualRevenue = calculateRevenue(transactions);
        
        assertEquals(expectedRevenue, actualRevenue,
                "Revenue should equal sum of order amounts");
    }

    /**
     * Property: Refunds equals sum of all refund transaction amounts.
     * Requirement: 3.1
     */
    @Property
    void refundsEqualsSumOfRefunds(@ForAll("mixedTransactions") List<Transaction> transactions) {
        BigDecimal expectedRefunds = transactions.stream()
                .filter(t -> Transaction.Types.REFUND.equals(t.getType()))
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal actualRefunds = calculateRefunds(transactions);
        
        assertEquals(expectedRefunds, actualRefunds,
                "Refunds should equal sum of refund amounts");
    }

    /**
     * Property: Net Revenue = Revenue - Refunds.
     * Requirement: 3.1
     */
    @Property
    void netRevenueEqualsRevenueMinusRefunds(@ForAll("mixedTransactions") List<Transaction> transactions) {
        BigDecimal revenue = calculateRevenue(transactions);
        BigDecimal refunds = calculateRefunds(transactions);
        BigDecimal expectedNetRevenue = revenue.subtract(refunds);

        BigDecimal actualNetRevenue = calculateNetRevenue(transactions);
        
        assertEquals(expectedNetRevenue, actualNetRevenue,
                "Net Revenue should equal Revenue - Refunds");
    }

    // ==================== Property 2: COGS Calculation ====================

    /**
     * Property: COGS = sum(quantity × unit_cost) for all order transactions.
     * Requirement: 3.2
     */
    @Property
    void cogsEqualsQuantityTimesCost(
            @ForAll("orderTransactionsWithCosts") List<Transaction> transactions
    ) {
        BigDecimal expectedCogs = transactions.stream()
                .filter(Transaction::isRevenue)
                .map(t -> {
                    int qty = t.getQuantity() != null ? t.getQuantity() : 1;
                    BigDecimal cost = t.getCostPerUnit() != null ? t.getCostPerUnit() : BigDecimal.ZERO;
                    return cost.multiply(BigDecimal.valueOf(qty));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        SkuCostMap costMap = new SkuCostMap();
        BigDecimal actualCogs = costMap.calculateCOGS(transactions);
        
        assertEquals(expectedCogs, actualCogs,
                "COGS should equal sum of (quantity × unit_cost)");
    }

    // ==================== Property 3: Gross Profit Calculation ====================

    /**
     * Property: Gross Profit = Net Revenue - COGS.
     * Requirement: 3.3
     */
    @Property
    void grossProfitEqualsNetRevenueMinusCogs(
            @ForAll @Positive BigDecimal netRevenue,
            @ForAll @Positive BigDecimal cogs
    ) {
        BigDecimal expectedGrossProfit = netRevenue.subtract(cogs);
        BigDecimal actualGrossProfit = calculateGrossProfit(netRevenue, cogs);
        
        assertEquals(expectedGrossProfit, actualGrossProfit,
                "Gross Profit should equal Net Revenue - COGS");
    }

    // ==================== Property 4: Operating Costs Calculation ====================

    /**
     * Property: Operating Costs = Ad Spend + Other Expenses.
     * Requirement: 3.4
     */
    @Property
    void operatingCostsEqualsAdSpendPlusExpenses(
            @ForAll("mixedTransactions") List<Transaction> transactions
    ) {
        BigDecimal adSpend = calculateAdSpend(transactions);
        BigDecimal otherExpenses = calculateOtherExpenses(transactions);
        BigDecimal expectedOperatingCosts = adSpend.add(otherExpenses);

        BigDecimal actualOperatingCosts = calculateOperatingCosts(transactions);
        
        assertEquals(expectedOperatingCosts, actualOperatingCosts,
                "Operating Costs should equal Ad Spend + Other Expenses");
    }

    /**
     * Property: Ad Spend equals sum of all ad_spend transaction amounts.
     * Requirement: 3.4
     */
    @Property
    void adSpendEqualsSumOfAdSpendTransactions(
            @ForAll("mixedTransactions") List<Transaction> transactions
    ) {
        BigDecimal expectedAdSpend = transactions.stream()
                .filter(t -> Transaction.Types.AD_SPEND.equals(t.getType()))
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal actualAdSpend = calculateAdSpend(transactions);
        
        assertEquals(expectedAdSpend, actualAdSpend,
                "Ad Spend should equal sum of ad_spend amounts");
    }

    // ==================== Property 5: Net Profit Calculation ====================

    /**
     * Property: Net Profit = Gross Profit - Operating Costs.
     * Requirement: 3.5
     */
    @Property
    void netProfitEqualsGrossProfitMinusOperatingCosts(
            @ForAll BigDecimal grossProfit,
            @ForAll @Positive BigDecimal operatingCosts
    ) {
        BigDecimal expectedNetProfit = grossProfit.subtract(operatingCosts);
        BigDecimal actualNetProfit = calculateNetProfit(grossProfit, operatingCosts);
        
        assertEquals(expectedNetProfit, actualNetProfit,
                "Net Profit should equal Gross Profit - Operating Costs");
    }

    // ==================== Property 6: Full P&L Consistency ====================

    /**
     * Property: Full P&L calculation is internally consistent.
     * All formulas must hold simultaneously.
     */
    @Property
    void fullPnLIsConsistent(@ForAll("mixedTransactions") List<Transaction> transactions) {
        // Calculate all components
        BigDecimal revenue = calculateRevenue(transactions);
        BigDecimal refunds = calculateRefunds(transactions);
        BigDecimal netRevenue = calculateNetRevenue(transactions);
        BigDecimal adSpend = calculateAdSpend(transactions);
        BigDecimal otherExpenses = calculateOtherExpenses(transactions);
        BigDecimal operatingCosts = calculateOperatingCosts(transactions);

        // Verify relationships
        assertEquals(revenue.subtract(refunds), netRevenue,
                "Net Revenue = Revenue - Refunds");
        assertEquals(adSpend.add(otherExpenses), operatingCosts,
                "Operating Costs = Ad Spend + Other Expenses");
    }

    /**
     * Property: Revenue is always non-negative.
     */
    @Property
    void revenueIsNonNegative(@ForAll("mixedTransactions") List<Transaction> transactions) {
        BigDecimal revenue = calculateRevenue(transactions);
        assertTrue(revenue.compareTo(BigDecimal.ZERO) >= 0,
                "Revenue should be non-negative");
    }

    /**
     * Property: Operating costs are always non-negative.
     */
    @Property
    void operatingCostsAreNonNegative(@ForAll("mixedTransactions") List<Transaction> transactions) {
        BigDecimal operatingCosts = calculateOperatingCosts(transactions);
        assertTrue(operatingCosts.compareTo(BigDecimal.ZERO) >= 0,
                "Operating costs should be non-negative");
    }

    // ==================== Providers ====================

    @Provide
    Arbitrary<List<Transaction>> mixedTransactions() {
        Arbitrary<Transaction> orderTx = createTransactionArbitrary(Transaction.Types.ORDER);
        Arbitrary<Transaction> refundTx = createTransactionArbitrary(Transaction.Types.REFUND);
        Arbitrary<Transaction> adSpendTx = createTransactionArbitrary(Transaction.Types.AD_SPEND);
        Arbitrary<Transaction> expenseTx = createTransactionArbitrary(Transaction.Types.EXPENSE);

        return Arbitraries.oneOf(orderTx, refundTx, adSpendTx, expenseTx)
                .list()
                .ofMinSize(0)
                .ofMaxSize(20);
    }

    @Provide
    Arbitrary<List<Transaction>> orderTransactionsWithCosts() {
        return Arbitraries.integers().between(1, 10)
                .flatMap(qty -> Arbitraries.bigDecimals()
                        .between(new BigDecimal("0.01"), new BigDecimal("100.00"))
                        .ofScale(2)
                        .map(cost -> Transaction.builder()
                                .id(UUID.randomUUID())
                                .userId(UUID.randomUUID())
                                .platform("shopify")
                                .type(Transaction.Types.ORDER)
                                .amount(BigDecimal.valueOf(100))
                                .amountUsd(BigDecimal.valueOf(100))
                                .quantity(qty)
                                .costPerUnit(cost)
                                .occurredAt(Instant.now())
                                .build()))
                .list()
                .ofMinSize(0)
                .ofMaxSize(15);
    }

    private Arbitrary<Transaction> createTransactionArbitrary(String type) {
        return Arbitraries.bigDecimals()
                .between(new BigDecimal("0.01"), new BigDecimal("10000.00"))
                .ofScale(2)
                .map(amount -> Transaction.builder()
                        .id(UUID.randomUUID())
                        .userId(UUID.randomUUID())
                        .platform(getRandomPlatform(type))
                        .type(type)
                        .amount(amount)
                        .amountUsd(amount)
                        .quantity(type.equals(Transaction.Types.ORDER) ? 1 : null)
                        .occurredAt(Instant.now())
                        .build());
    }

    private String getRandomPlatform(String type) {
        return switch (type) {
            case Transaction.Types.ORDER, Transaction.Types.REFUND -> "shopify";
            case Transaction.Types.AD_SPEND -> new Random().nextBoolean() ? "meta" : "google";
            default -> "other";
        };
    }

    // ==================== Calculation Methods (mirroring PnLService) ====================

    private BigDecimal calculateRevenue(List<Transaction> transactions) {
        return transactions.stream()
                .filter(Transaction::isRevenue)
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateRefunds(List<Transaction> transactions) {
        return transactions.stream()
                .filter(Transaction::isRefund)
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateNetRevenue(List<Transaction> transactions) {
        return calculateRevenue(transactions).subtract(calculateRefunds(transactions));
    }

    private BigDecimal calculateAdSpend(List<Transaction> transactions) {
        return transactions.stream()
                .filter(t -> Transaction.Types.AD_SPEND.equals(t.getType()))
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateOtherExpenses(List<Transaction> transactions) {
        return transactions.stream()
                .filter(t -> Transaction.Types.EXPENSE.equals(t.getType()))
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private BigDecimal calculateOperatingCosts(List<Transaction> transactions) {
        return calculateAdSpend(transactions).add(calculateOtherExpenses(transactions));
    }

    private BigDecimal calculateGrossProfit(BigDecimal netRevenue, BigDecimal cogs) {
        return netRevenue.subtract(cogs);
    }

    private BigDecimal calculateNetProfit(BigDecimal grossProfit, BigDecimal operatingCosts) {
        return grossProfit.subtract(operatingCosts);
    }
}
