package com.credora.engine.dsa;

import com.credora.engine.models.Transaction;
import net.jqwik.api.*;
import net.jqwik.api.constraints.Positive;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Property-based tests for SkuCostMap DSA class.
 * 
 * Tests O(1) cost lookups and COGS calculation correctness.
 * 
 * Requirements: 3.7
 */
class SkuCostMapTest {

    private SkuCostMap skuCostMap;

    @BeforeEach
    void setUp() {
        skuCostMap = new SkuCostMap();
    }

    // ==================== Unit Tests ====================

    @Test
    void testPutAndGetCost() {
        UUID productId = UUID.randomUUID();
        BigDecimal cost = new BigDecimal("25.50");
        
        skuCostMap.put(productId, cost);
        
        assertEquals(cost, skuCostMap.getCost(productId));
    }

    @Test
    void testGetCostReturnsZeroForUnknownProduct() {
        UUID unknownId = UUID.randomUUID();
        assertEquals(BigDecimal.ZERO, skuCostMap.getCost(unknownId));
    }

    @Test
    void testGetCostReturnsZeroForNull() {
        assertEquals(BigDecimal.ZERO, skuCostMap.getCost(null));
    }

    @Test
    void testContains() {
        UUID productId = UUID.randomUUID();
        skuCostMap.put(productId, BigDecimal.TEN);
        
        assertTrue(skuCostMap.contains(productId));
        assertFalse(skuCostMap.contains(UUID.randomUUID()));
        assertFalse(skuCostMap.contains(null));
    }

    @Test
    void testCalculateCOGSWithEmptyList() {
        assertEquals(BigDecimal.ZERO, skuCostMap.calculateCOGS(Collections.emptyList()));
        assertEquals(BigDecimal.ZERO, skuCostMap.calculateCOGS(null));
    }

    @Test
    void testCalculateCOGSWithOrderTransactions() {
        UUID product1 = UUID.randomUUID();
        UUID product2 = UUID.randomUUID();
        
        skuCostMap.put(product1, new BigDecimal("10.00"));
        skuCostMap.put(product2, new BigDecimal("20.00"));
        
        List<Transaction> transactions = List.of(
                createOrderTransaction(product1, 2, null),  // 2 * 10 = 20
                createOrderTransaction(product2, 3, null)   // 3 * 20 = 60
        );
        
        BigDecimal cogs = skuCostMap.calculateCOGS(transactions);
        assertEquals(new BigDecimal("80.00"), cogs);
    }

    @Test
    void testCalculateCOGSUsesTransactionCostPerUnit() {
        UUID productId = UUID.randomUUID();
        skuCostMap.put(productId, new BigDecimal("10.00")); // Map cost
        
        // Transaction has its own costPerUnit which should take precedence
        Transaction transaction = createOrderTransaction(productId, 5, new BigDecimal("15.00"));
        
        BigDecimal cogs = skuCostMap.calculateCOGS(List.of(transaction));
        assertEquals(new BigDecimal("75.00"), cogs); // 5 * 15 = 75
    }

    @Test
    void testCalculateCOGSIgnoresNonOrderTransactions() {
        UUID productId = UUID.randomUUID();
        skuCostMap.put(productId, new BigDecimal("10.00"));
        
        List<Transaction> transactions = List.of(
                createOrderTransaction(productId, 2, null),  // Included: 2 * 10 = 20
                createRefundTransaction(productId, 1),       // Excluded
                createAdSpendTransaction()                   // Excluded
        );
        
        BigDecimal cogs = skuCostMap.calculateCOGS(transactions);
        assertEquals(new BigDecimal("20.00"), cogs);
    }

    // ==================== Property-Based Tests ====================

    /**
     * Property: COGS is always non-negative for valid transactions.
     */
    @Property
    void cogsIsNonNegative(
            @ForAll("validCostMap") Map<UUID, BigDecimal> costs,
            @ForAll("orderTransactions") List<Transaction> transactions
    ) {
        SkuCostMap map = new SkuCostMap();
        map.putAll(costs);
        
        BigDecimal cogs = map.calculateCOGS(transactions);
        assertTrue(cogs.compareTo(BigDecimal.ZERO) >= 0, 
                "COGS should be non-negative, got: " + cogs);
    }

    /**
     * Property: COGS equals sum of (quantity × unit_cost) for all orders.
     */
    @Property
    void cogsEqualsManualCalculation(
            @ForAll("validCostMap") Map<UUID, BigDecimal> costs,
            @ForAll("orderTransactionsWithCosts") List<Transaction> transactions
    ) {
        SkuCostMap map = new SkuCostMap();
        map.putAll(costs);
        
        // Manual calculation
        BigDecimal expectedCogs = transactions.stream()
                .filter(Transaction::isRevenue)
                .map(t -> {
                    BigDecimal cost = t.getCostPerUnit() != null && t.getCostPerUnit().compareTo(BigDecimal.ZERO) > 0
                            ? t.getCostPerUnit()
                            : costs.getOrDefault(t.getProductId(), BigDecimal.ZERO);
                    int qty = t.getQuantity() != null ? t.getQuantity() : 1;
                    return cost.multiply(BigDecimal.valueOf(qty));
                })
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        BigDecimal actualCogs = map.calculateCOGS(transactions);
        assertEquals(expectedCogs, actualCogs);
    }

    /**
     * Property: Put and get are consistent.
     */
    @Property
    void putGetConsistency(
            @ForAll("uuids") UUID productId,
            @ForAll @Positive BigDecimal cost
    ) {
        SkuCostMap map = new SkuCostMap();
        map.put(productId, cost);
        assertEquals(cost, map.getCost(productId));
    }

    /**
     * Property: Size increases with unique puts.
     */
    @Property
    void sizeIncreasesWithUniquePuts(
            @ForAll("uniqueProductCosts") Map<UUID, BigDecimal> costs
    ) {
        SkuCostMap map = new SkuCostMap();
        map.putAll(costs);
        assertEquals(costs.size(), map.size());
    }

    // ==================== Providers ====================

    @Provide
    Arbitrary<UUID> uuids() {
        return Arbitraries.create(UUID::randomUUID);
    }

    @Provide
    Arbitrary<Map<UUID, BigDecimal>> validCostMap() {
        return Arbitraries.maps(
                Arbitraries.create(UUID::randomUUID),
                Arbitraries.bigDecimals()
                        .between(BigDecimal.ZERO, new BigDecimal("1000.00"))
                        .ofScale(2)
        ).ofMinSize(0).ofMaxSize(10);
    }

    @Provide
    Arbitrary<Map<UUID, BigDecimal>> uniqueProductCosts() {
        return Arbitraries.maps(
                Arbitraries.create(UUID::randomUUID),
                Arbitraries.bigDecimals()
                        .between(new BigDecimal("0.01"), new BigDecimal("1000.00"))
                        .ofScale(2)
        ).ofMinSize(1).ofMaxSize(20);
    }

    @Provide
    Arbitrary<List<Transaction>> orderTransactions() {
        return Arbitraries.of(Transaction.Types.ORDER)
                .map(type -> Transaction.builder()
                        .id(UUID.randomUUID())
                        .userId(UUID.randomUUID())
                        .platform("shopify")
                        .type(type)
                        .amount(BigDecimal.valueOf(100))
                        .quantity(1)
                        .occurredAt(Instant.now())
                        .build())
                .list()
                .ofMinSize(0).ofMaxSize(10);
    }

    @Provide
    Arbitrary<List<Transaction>> orderTransactionsWithCosts() {
        return Arbitraries.integers().between(1, 10)
                .flatMap(qty -> Arbitraries.bigDecimals()
                        .between(new BigDecimal("1.00"), new BigDecimal("100.00"))
                        .ofScale(2)
                        .map(cost -> Transaction.builder()
                                .id(UUID.randomUUID())
                                .userId(UUID.randomUUID())
                                .platform("shopify")
                                .type(Transaction.Types.ORDER)
                                .amount(BigDecimal.valueOf(100))
                                .quantity(qty)
                                .costPerUnit(cost)
                                .occurredAt(Instant.now())
                                .build()))
                .list()
                .ofMinSize(0).ofMaxSize(10);
    }

    // ==================== Helper Methods ====================

    private Transaction createOrderTransaction(UUID productId, int quantity, BigDecimal costPerUnit) {
        return Transaction.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .platform("shopify")
                .type(Transaction.Types.ORDER)
                .amount(BigDecimal.valueOf(100))
                .productId(productId)
                .quantity(quantity)
                .costPerUnit(costPerUnit)
                .occurredAt(Instant.now())
                .build();
    }

    private Transaction createRefundTransaction(UUID productId, int quantity) {
        return Transaction.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .platform("shopify")
                .type(Transaction.Types.REFUND)
                .amount(BigDecimal.valueOf(50))
                .productId(productId)
                .quantity(quantity)
                .occurredAt(Instant.now())
                .build();
    }

    private Transaction createAdSpendTransaction() {
        return Transaction.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .platform("meta")
                .type(Transaction.Types.AD_SPEND)
                .amount(BigDecimal.valueOf(200))
                .occurredAt(Instant.now())
                .build();
    }
}
