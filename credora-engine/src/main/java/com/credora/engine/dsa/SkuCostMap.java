package com.credora.engine.dsa;

import com.credora.engine.models.Transaction;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * HashMap-based DSA for O(1) SKU cost lookups.
 * 
 * Used for efficient COGS (Cost of Goods Sold) calculation during P&L processing.
 * 
 * Time Complexity:
 * - put: O(1)
 * - getCost: O(1)
 * - calculateCOGS: O(n) where n = number of transactions
 * 
 * Requirements: 3.7
 */
public class SkuCostMap {

    private final Map<UUID, BigDecimal> costMap;

    public SkuCostMap() {
        this.costMap = new HashMap<>();
    }

    /**
     * Store the unit cost for a product/SKU.
     * 
     * @param productId The product UUID
     * @param unitCost The cost per unit
     */
    public void put(UUID productId, BigDecimal unitCost) {
        if (productId != null && unitCost != null) {
            costMap.put(productId, unitCost);
        }
    }

    /**
     * Get the unit cost for a product/SKU.
     * Returns ZERO if not found.
     * 
     * @param productId The product UUID
     * @return The unit cost or ZERO
     */
    public BigDecimal getCost(UUID productId) {
        if (productId == null) {
            return BigDecimal.ZERO;
        }
        return costMap.getOrDefault(productId, BigDecimal.ZERO);
    }

    /**
     * Check if a product exists in the map.
     * 
     * @param productId The product UUID
     * @return true if the product has a cost entry
     */
    public boolean contains(UUID productId) {
        return productId != null && costMap.containsKey(productId);
    }

    /**
     * Calculate total COGS from a list of order transactions.
     * 
     * COGS = sum(quantity × unit_cost) for all order transactions
     * 
     * For transactions with costPerUnit set, uses that value.
     * Otherwise falls back to the stored cost in the map.
     * 
     * @param transactions List of transactions (filters to orders only)
     * @return Total COGS
     */
    public BigDecimal calculateCOGS(List<Transaction> transactions) {
        if (transactions == null || transactions.isEmpty()) {
            return BigDecimal.ZERO;
        }

        return transactions.stream()
                .filter(Transaction::isRevenue) // Only order transactions
                .map(this::calculateTransactionCOGS)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate COGS for a single transaction.
     */
    private BigDecimal calculateTransactionCOGS(Transaction transaction) {
        int quantity = transaction.getQuantity() != null ? transaction.getQuantity() : 1;
        
        // Use transaction's costPerUnit if available, otherwise lookup from map
        BigDecimal unitCost = transaction.getCostPerUnit();
        if (unitCost == null || unitCost.compareTo(BigDecimal.ZERO) == 0) {
            unitCost = getCost(transaction.getProductId());
        }
        
        return unitCost.multiply(BigDecimal.valueOf(quantity));
    }

    /**
     * Get the number of products in the map.
     */
    public int size() {
        return costMap.size();
    }

    /**
     * Clear all entries.
     */
    public void clear() {
        costMap.clear();
    }

    /**
     * Bulk load costs from a map.
     */
    public void putAll(Map<UUID, BigDecimal> costs) {
        if (costs != null) {
            costs.forEach(this::put);
        }
    }
}
