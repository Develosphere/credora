package com.credora.engine.services;

import com.credora.engine.dsa.ProfitGraph;
import com.credora.engine.dsa.ProfitSegmentTree;
import com.credora.engine.models.Campaign;
import com.credora.engine.models.Product;
import com.credora.engine.models.Transaction;
import com.credora.engine.repositories.CampaignRepository;
import com.credora.engine.repositories.ProductRepository;
import com.credora.engine.repositories.TransactionRepository;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for SKU unit economics analysis.
 * 
 * Calculates:
 * - Profit per unit
 * - Customer Acquisition Cost (CAC)
 * - Refund rate
 * - Inventory depletion rate
 * - True ROAS (with gross margin)
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SkuAnalyzerService {

    private final ProductRepository productRepository;
    private final TransactionRepository transactionRepository;
    private final CampaignRepository campaignRepository;

    /**
     * SKU analysis result.
     */
    @Data
    @Builder
    public static class SkuAnalysis {
        private UUID skuId;
        private String sku;
        private String name;
        private BigDecimal sellingPrice;
        private BigDecimal unitCost;
        private BigDecimal profitPerUnit;
        private BigDecimal cac;
        private BigDecimal allocatedAdCost;
        private BigDecimal refundRate;
        private BigDecimal depletionRate;
        private BigDecimal trueRoas;
        private BigDecimal grossMargin;
        private int totalOrders;
        private int totalRefunds;
        private BigDecimal totalRevenue;
        private BigDecimal totalAdSpend;
        private int inventoryQuantity;
    }

    /**
     * Analyze a single SKU.
     * 
     * @param userId User UUID
     * @param skuId SKU UUID
     * @return SKU analysis
     */
    @Transactional(readOnly = true)
    public SkuAnalysis analyzeSku(UUID userId, UUID skuId) {
        log.info("Analyzing SKU {} for user {}", skuId, userId);

        Product product = productRepository.findById(skuId)
                .orElseThrow(() -> new IllegalArgumentException("SKU not found: " + skuId));

        // Fetch transactions for this SKU
        List<Transaction> transactions = transactionRepository.findByProductId(skuId);

        // Build profit graph for CAC calculation
        ProfitGraph profitGraph = buildProfitGraph(userId, skuId);

        return buildSkuAnalysis(product, transactions, profitGraph);
    }

    /**
     * Analyze multiple SKUs.
     * 
     * @param userId User UUID
     * @param skuIds List of SKU UUIDs
     * @return List of SKU analyses
     */
    @Transactional(readOnly = true)
    public List<SkuAnalysis> analyzeSkus(UUID userId, List<UUID> skuIds) {
        log.info("Analyzing {} SKUs for user {}", skuIds.size(), userId);

        return skuIds.stream()
                .map(skuId -> {
                    try {
                        return analyzeSku(userId, skuId);
                    } catch (Exception e) {
                        log.warn("Failed to analyze SKU {}: {}", skuId, e.getMessage());
                        return null;
                    }
                })
                .filter(Objects::nonNull)
                .toList();
    }

    /**
     * Analyze all SKUs for a user.
     * 
     * @param userId User UUID
     * @return List of SKU analyses
     */
    @Transactional(readOnly = true)
    public List<SkuAnalysis> analyzeAllSkus(UUID userId) {
        List<Product> products = productRepository.findByUserId(userId);
        List<UUID> skuIds = products.stream().map(Product::getId).toList();
        return analyzeSkus(userId, skuIds);
    }


    /**
     * Calculate profit per unit for a SKU.
     * Profit Per Unit = Selling Price - Unit Cost - Allocated Ad Cost
     * 
     * Requirement: 5.1
     */
    public BigDecimal calculateProfitPerUnit(BigDecimal sellingPrice, BigDecimal unitCost, 
                                              BigDecimal allocatedAdCost) {
        if (sellingPrice == null) sellingPrice = BigDecimal.ZERO;
        if (unitCost == null) unitCost = BigDecimal.ZERO;
        if (allocatedAdCost == null) allocatedAdCost = BigDecimal.ZERO;
        
        return sellingPrice.subtract(unitCost).subtract(allocatedAdCost);
    }

    /**
     * Calculate refund rate for a SKU.
     * Refund Rate = Refund Count / Total Orders (bounded 0-1)
     * 
     * Requirement: 5.3
     */
    public BigDecimal calculateRefundRate(int totalOrders, int refundCount) {
        if (totalOrders <= 0) return BigDecimal.ZERO;
        
        BigDecimal rate = BigDecimal.valueOf(refundCount)
                .divide(BigDecimal.valueOf(totalOrders), 4, RoundingMode.HALF_UP);
        
        // Bound between 0 and 1
        if (rate.compareTo(BigDecimal.ZERO) < 0) return BigDecimal.ZERO;
        if (rate.compareTo(BigDecimal.ONE) > 0) return BigDecimal.ONE;
        
        return rate;
    }

    /**
     * Calculate true ROAS for a SKU.
     * True ROAS = (Revenue × Gross Margin) / Ad Spend
     * 
     * Requirement: 5.5
     */
    public BigDecimal calculateTrueRoas(BigDecimal revenue, BigDecimal grossMargin, 
                                         BigDecimal adSpend) {
        if (adSpend == null || adSpend.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO;
        }
        if (revenue == null) revenue = BigDecimal.ZERO;
        if (grossMargin == null) grossMargin = BigDecimal.ZERO;
        
        return revenue.multiply(grossMargin)
                .divide(adSpend, 2, RoundingMode.HALF_UP);
    }

    /**
     * Calculate inventory depletion rate.
     * Depletion Rate = Units Sold per Day (average over period)
     * 
     * Requirement: 5.4
     */
    public BigDecimal calculateDepletionRate(List<Transaction> transactions, int days) {
        if (transactions == null || transactions.isEmpty() || days <= 0) {
            return BigDecimal.ZERO;
        }
        
        int totalUnitsSold = transactions.stream()
                .filter(Transaction::isRevenue)
                .mapToInt(t -> t.getQuantity() != null ? t.getQuantity() : 1)
                .sum();
        
        return BigDecimal.valueOf(totalUnitsSold)
                .divide(BigDecimal.valueOf(days), 2, RoundingMode.HALF_UP);
    }

    /**
     * Build SKU analysis from product and transactions.
     */
    private SkuAnalysis buildSkuAnalysis(Product product, List<Transaction> transactions,
                                          ProfitGraph profitGraph) {
        String skuIdStr = product.getId().toString();
        
        // Count orders and refunds
        int totalOrders = (int) transactions.stream()
                .filter(Transaction::isRevenue)
                .count();
        int totalRefunds = (int) transactions.stream()
                .filter(Transaction::isRefund)
                .count();
        
        // Calculate revenue
        BigDecimal totalRevenue = transactions.stream()
                .filter(Transaction::isRevenue)
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        
        // Get ad spend from profit graph
        BigDecimal totalAdSpend = profitGraph.getTotalAttributedSpend(skuIdStr);
        
        // Calculate CAC
        BigDecimal cac = profitGraph.calculateCAC(skuIdStr);
        
        // Calculate allocated ad cost per unit
        BigDecimal allocatedAdCost = totalOrders > 0 
                ? totalAdSpend.divide(BigDecimal.valueOf(totalOrders), 2, RoundingMode.HALF_UP)
                : BigDecimal.ZERO;
        
        // Calculate profit per unit
        BigDecimal profitPerUnit = calculateProfitPerUnit(
                product.getSellingPrice(), product.getUnitCost(), allocatedAdCost);
        
        // Calculate refund rate
        BigDecimal refundRate = calculateRefundRate(totalOrders, totalRefunds);
        
        // Calculate gross margin
        BigDecimal grossMargin = BigDecimal.ZERO;
        if (product.getSellingPrice() != null && product.getSellingPrice().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal grossProfit = product.getSellingPrice()
                    .subtract(product.getUnitCost() != null ? product.getUnitCost() : BigDecimal.ZERO);
            grossMargin = grossProfit.divide(product.getSellingPrice(), 4, RoundingMode.HALF_UP);
        }
        
        // Calculate true ROAS
        BigDecimal trueRoas = calculateTrueRoas(totalRevenue, grossMargin, totalAdSpend);
        
        // Calculate depletion rate (over last 30 days)
        BigDecimal depletionRate = calculateDepletionRate(transactions, 30);
        
        return SkuAnalysis.builder()
                .skuId(product.getId())
                .sku(product.getSku())
                .name(product.getName())
                .sellingPrice(product.getSellingPrice())
                .unitCost(product.getUnitCost())
                .profitPerUnit(profitPerUnit)
                .cac(cac)
                .allocatedAdCost(allocatedAdCost)
                .refundRate(refundRate)
                .depletionRate(depletionRate)
                .trueRoas(trueRoas)
                .grossMargin(grossMargin)
                .totalOrders(totalOrders)
                .totalRefunds(totalRefunds)
                .totalRevenue(totalRevenue)
                .totalAdSpend(totalAdSpend)
                .inventoryQuantity(product.getInventoryQuantity() != null ? product.getInventoryQuantity() : 0)
                .build();
    }

    /**
     * Build profit graph for a SKU.
     */
    private ProfitGraph buildProfitGraph(UUID userId, UUID skuId) {
        ProfitGraph graph = new ProfitGraph();
        String skuIdStr = skuId.toString();
        
        // Get campaigns for user
        List<Campaign> campaigns = campaignRepository.findByUserId(userId);
        
        for (Campaign campaign : campaigns) {
            // Get transactions linked to this campaign and SKU
            List<Transaction> campaignTransactions = transactionRepository.findByCampaignId(campaign.getId());
            
            // Filter to this SKU
            List<Transaction> skuTransactions = campaignTransactions.stream()
                    .filter(t -> skuId.equals(t.getProductId()))
                    .toList();
            
            if (!skuTransactions.isEmpty()) {
                // Calculate attributed spend (proportional to conversions)
                int conversions = (int) skuTransactions.stream()
                        .filter(Transaction::isRevenue)
                        .count();
                
                // Attribute spend proportionally
                BigDecimal attributedSpend = campaign.getSpend() != null 
                        ? campaign.getSpend() : BigDecimal.ZERO;
                
                graph.addCampaignSkuLink(campaign.getId().toString(), skuIdStr, 
                        attributedSpend, conversions);
            }
        }
        
        return graph;
    }

    /**
     * Get profit range query using segment tree.
     */
    @Transactional(readOnly = true)
    public BigDecimal getProfitInRange(UUID userId, UUID skuId, LocalDate fromDate, LocalDate toDate) {
        List<Transaction> transactions = transactionRepository.findByProductId(skuId);
        
        // Build daily profit map
        Map<LocalDate, BigDecimal> dailyProfits = new HashMap<>();
        
        for (Transaction t : transactions) {
            LocalDate date = t.getOccurredAt().atZone(ZoneOffset.UTC).toLocalDate();
            BigDecimal amount = t.isRevenue() 
                    ? t.getEffectiveAmountUsd() 
                    : t.getEffectiveAmountUsd().negate();
            
            dailyProfits.merge(date, amount, BigDecimal::add);
        }
        
        // Build segment tree
        ProfitSegmentTree segmentTree = new ProfitSegmentTree(dailyProfits);
        
        return segmentTree.queryDateRange(fromDate, toDate);
    }
}
