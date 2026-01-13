package com.credora.engine.services;

import com.credora.engine.dsa.OptimalPriceFinder;
import com.credora.engine.dsa.SimulationQueue;
import com.credora.engine.dsa.SimulationQueue.*;
import com.credora.engine.models.Campaign;
import com.credora.engine.models.Product;
import com.credora.engine.repositories.CampaignRepository;
import com.credora.engine.repositories.ProductRepository;
import com.credora.engine.repositories.TransactionRepository;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

/**
 * Service for what-if scenario simulations.
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class WhatIfService {

    private final CampaignRepository campaignRepository;
    private final ProductRepository productRepository;
    private final TransactionRepository transactionRepository;

    /**
     * Simulate decreasing ad spend by a percentage.
     * Models cascading effects: impressions → clicks → conversions → revenue → cash impact
     * 
     * @param userId User ID
     * @param decreasePercent Percentage to decrease (e.g., 20 for 20%)
     * @return Simulation result
     */
    public WhatIfResult simulateAdSpendChange(UUID userId, BigDecimal changePercent) {
        log.info("Simulating ad spend change of {}% for user {}", changePercent, userId);

        // Get baseline metrics from campaigns
        SimulationMetrics baseline = getBaselineMetrics(userId);
        
        // Create simulation queue
        SimulationQueue queue = new SimulationQueue();
        
        // Schedule initial ad spend change event
        SimulationEvent adSpendEvent = SimulationEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .type(EventType.AD_SPEND_CHANGE)
            .timestamp(LocalDateTime.now())
            .parameters(Map.of("changePercent", changePercent))
            .build();
        
        queue.scheduleEvent(adSpendEvent);
        
        // Create scenario
        Scenario scenario = Scenario.builder()
            .scenarioId(UUID.randomUUID().toString())
            .name("Ad Spend Change: " + changePercent + "%")
            .type(changePercent.compareTo(BigDecimal.ZERO) < 0 
                ? ScenarioType.AD_SPEND_DECREASE 
                : ScenarioType.AD_SPEND_INCREASE)
            .baseline(baseline)
            .parameters(Map.of("changePercent", changePercent))
            .build();
        
        // Run simulation
        SimulationResult simResult = queue.runSimulation(scenario);
        
        // Calculate confidence based on data quality
        BigDecimal confidence = calculateConfidence(baseline);
        
        return WhatIfResult.builder()
            .scenarioType("AD_SPEND_CHANGE")
            .scenarioDescription("Change ad spend by " + changePercent + "%")
            .baseline(toMetricsDto(baseline))
            .projected(toMetricsDto(simResult.getProjected()))
            .impact(toMetricsDto(simResult.getImpact()))
            .confidence(confidence)
            .eventsProcessed(simResult.getEventsProcessed())
            .recommendations(generateAdSpendRecommendations(changePercent, simResult))
            .build();
    }


    /**
     * Simulate increasing price by a percentage.
     * Models price elasticity effect on conversion rate and resulting profit change.
     * 
     * @param userId User ID
     * @param skuId SKU to simulate price change for
     * @param priceChangePercent Percentage to change price (e.g., 10 for 10% increase)
     * @param elasticity Price elasticity coefficient (default 0.5)
     * @return Simulation result
     */
    public WhatIfResult simulatePriceChange(
            UUID userId, 
            UUID skuId, 
            BigDecimal priceChangePercent,
            BigDecimal elasticity) {
        
        log.info("Simulating price change of {}% for SKU {} user {}", priceChangePercent, skuId, userId);

        if (elasticity == null) {
            elasticity = new BigDecimal("0.5"); // Default elasticity
        }

        // Get product details
        Product product = productRepository.findById(skuId).orElse(null);
        if (product == null) {
            return WhatIfResult.builder()
                .scenarioType("PRICE_CHANGE")
                .scenarioDescription("Price change simulation failed - SKU not found")
                .confidence(BigDecimal.ZERO)
                .build();
        }

        BigDecimal currentPrice = product.getSellingPrice() != null 
            ? product.getSellingPrice() 
            : BigDecimal.valueOf(100);
        BigDecimal unitCost = product.getUnitCost() != null 
            ? product.getUnitCost() 
            : BigDecimal.valueOf(50);

        // Calculate new price
        BigDecimal multiplier = BigDecimal.ONE.add(priceChangePercent.divide(BigDecimal.valueOf(100)));
        BigDecimal newPrice = currentPrice.multiply(multiplier);

        // Estimate demand change based on elasticity
        // Demand change % = -elasticity × price change %
        BigDecimal demandChangePercent = elasticity.negate().multiply(priceChangePercent);

        // Create baseline metrics
        SimulationMetrics baseline = SimulationMetrics.builder()
            .price(currentPrice)
            .revenue(currentPrice.multiply(BigDecimal.valueOf(100))) // Assume 100 units baseline
            .profit(currentPrice.subtract(unitCost).multiply(BigDecimal.valueOf(100)))
            .conversions(100)
            .build();

        // Calculate projected metrics
        int projectedDemand = (int) (100 * (1 + demandChangePercent.doubleValue() / 100));
        projectedDemand = Math.max(0, projectedDemand);
        
        BigDecimal projectedRevenue = newPrice.multiply(BigDecimal.valueOf(projectedDemand));
        BigDecimal projectedProfit = newPrice.subtract(unitCost).multiply(BigDecimal.valueOf(projectedDemand));

        SimulationMetrics projected = SimulationMetrics.builder()
            .price(newPrice)
            .revenue(projectedRevenue)
            .profit(projectedProfit)
            .conversions(projectedDemand)
            .build();

        SimulationMetrics impact = SimulationMetrics.builder()
            .price(newPrice.subtract(currentPrice))
            .revenue(projectedRevenue.subtract(baseline.getRevenue()))
            .profit(projectedProfit.subtract(baseline.getProfit()))
            .conversions(projectedDemand - 100)
            .build();

        return WhatIfResult.builder()
            .scenarioType("PRICE_CHANGE")
            .scenarioDescription("Change price by " + priceChangePercent + "% (elasticity: " + elasticity + ")")
            .baseline(toMetricsDto(baseline))
            .projected(toMetricsDto(projected))
            .impact(toMetricsDto(impact))
            .confidence(new BigDecimal("0.70"))
            .recommendations(generatePriceChangeRecommendations(priceChangePercent, impact))
            .build();
    }

    /**
     * Simulate ordering extra inventory units.
     * Calculates cash outflow, projected revenue, and break-even timeline.
     * 
     * @param userId User ID
     * @param skuId SKU to order
     * @param units Number of units to order
     * @return Simulation result
     */
    public WhatIfResult simulateInventoryOrder(UUID userId, UUID skuId, int units) {
        log.info("Simulating inventory order of {} units for SKU {} user {}", units, skuId, userId);

        // Get product details
        Product product = productRepository.findById(skuId).orElse(null);
        if (product == null) {
            return WhatIfResult.builder()
                .scenarioType("INVENTORY_ORDER")
                .scenarioDescription("Inventory order simulation failed - SKU not found")
                .confidence(BigDecimal.ZERO)
                .build();
        }

        BigDecimal unitCost = product.getUnitCost() != null 
            ? product.getUnitCost() 
            : BigDecimal.valueOf(50);
        BigDecimal sellingPrice = product.getSellingPrice() != null 
            ? product.getSellingPrice() 
            : BigDecimal.valueOf(100);

        // Calculate cash outflow
        BigDecimal cashOutflow = unitCost.multiply(BigDecimal.valueOf(units));

        // Estimate sell-through rate (default 80%)
        BigDecimal sellThroughRate = new BigDecimal("0.80");
        int expectedSales = (int) (units * sellThroughRate.doubleValue());

        // Calculate projected revenue
        BigDecimal projectedRevenue = sellingPrice.multiply(BigDecimal.valueOf(expectedSales));

        // Calculate profit
        BigDecimal projectedProfit = projectedRevenue.subtract(cashOutflow);

        // Calculate break-even timeline (days to sell enough to cover cost)
        // Assume average daily sales rate
        int dailySalesRate = Math.max(1, expectedSales / 30); // Assume 30-day sell-through
        int breakEvenUnits = cashOutflow.divide(sellingPrice.subtract(unitCost), 0, RoundingMode.CEILING).intValue();
        int breakEvenDays = breakEvenUnits / Math.max(1, dailySalesRate);

        SimulationMetrics baseline = SimulationMetrics.builder()
            .inventory(product.getInventoryQuantity() != null ? product.getInventoryQuantity() : 0)
            .cashFlow(BigDecimal.ZERO)
            .revenue(BigDecimal.ZERO)
            .profit(BigDecimal.ZERO)
            .build();

        SimulationMetrics projected = SimulationMetrics.builder()
            .inventory(baseline.getInventory() + units)
            .cashFlow(cashOutflow.negate())
            .revenue(projectedRevenue)
            .profit(projectedProfit)
            .build();

        SimulationMetrics impact = SimulationMetrics.builder()
            .inventory(units)
            .cashFlow(cashOutflow.negate())
            .revenue(projectedRevenue)
            .profit(projectedProfit)
            .build();

        List<String> recommendations = new ArrayList<>();
        if (projectedProfit.compareTo(BigDecimal.ZERO) > 0) {
            recommendations.add("Projected profit is positive. Order appears viable.");
        } else {
            recommendations.add("Warning: Projected profit is negative. Review pricing or sell-through assumptions.");
        }
        recommendations.add("Break-even timeline: approximately " + breakEvenDays + " days");
        recommendations.add("Expected sell-through: " + expectedSales + " units (" + 
            sellThroughRate.multiply(BigDecimal.valueOf(100)).setScale(0) + "%)");

        return WhatIfResult.builder()
            .scenarioType("INVENTORY_ORDER")
            .scenarioDescription("Order " + units + " units of SKU")
            .baseline(toMetricsDto(baseline))
            .projected(toMetricsDto(projected))
            .impact(toMetricsDto(impact))
            .confidence(new BigDecimal("0.65"))
            .breakEvenDays(breakEvenDays)
            .recommendations(recommendations)
            .build();
    }


    /**
     * Find optimal price for a product.
     * 
     * @param userId User ID
     * @param skuId SKU to optimize
     * @param minPrice Minimum price constraint
     * @param maxPrice Maximum price constraint
     * @param elasticity Price elasticity
     * @return Optimization result
     */
    public WhatIfResult findOptimalPrice(
            UUID userId,
            UUID skuId,
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal elasticity) {
        
        log.info("Finding optimal price for SKU {} user {}", skuId, userId);

        Product product = productRepository.findById(skuId).orElse(null);
        if (product == null) {
            return WhatIfResult.builder()
                .scenarioType("OPTIMAL_PRICE")
                .scenarioDescription("Optimal price search failed - SKU not found")
                .confidence(BigDecimal.ZERO)
                .build();
        }

        BigDecimal unitCost = product.getUnitCost() != null 
            ? product.getUnitCost() 
            : BigDecimal.valueOf(50);
        BigDecimal currentPrice = product.getSellingPrice() != null 
            ? product.getSellingPrice() 
            : BigDecimal.valueOf(100);

        if (minPrice == null) minPrice = unitCost.multiply(new BigDecimal("1.1")); // 10% above cost
        if (maxPrice == null) maxPrice = currentPrice.multiply(new BigDecimal("2.0")); // 2x current
        if (elasticity == null) elasticity = new BigDecimal("0.02"); // Default elasticity

        OptimalPriceFinder finder = new OptimalPriceFinder();
        
        // Create demand function based on elasticity
        final BigDecimal basePrice = currentPrice;
        final int baseDemand = 100;
        final double elast = elasticity.doubleValue();
        
        OptimalPriceFinder.OptimizationResult optResult = finder.findOptimalPriceWithAnalysis(
            minPrice,
            maxPrice,
            unitCost,
            OptimalPriceFinder.linearDemandFunction(basePrice, baseDemand, elast * baseDemand)
        );

        SimulationMetrics baseline = SimulationMetrics.builder()
            .price(currentPrice)
            .revenue(currentPrice.multiply(BigDecimal.valueOf(baseDemand)))
            .profit(currentPrice.subtract(unitCost).multiply(BigDecimal.valueOf(baseDemand)))
            .conversions(baseDemand)
            .build();

        SimulationMetrics projected = SimulationMetrics.builder()
            .price(optResult.getOptimalPrice())
            .revenue(optResult.getExpectedRevenue())
            .profit(optResult.getExpectedProfit())
            .conversions(optResult.getExpectedDemand())
            .build();

        SimulationMetrics impact = SimulationMetrics.builder()
            .price(optResult.getOptimalPrice().subtract(currentPrice))
            .revenue(optResult.getExpectedRevenue().subtract(baseline.getRevenue()))
            .profit(optResult.getExpectedProfit().subtract(baseline.getProfit()))
            .conversions(optResult.getExpectedDemand() - baseDemand)
            .build();

        List<String> recommendations = new ArrayList<>();
        if (optResult.getOptimalPrice().compareTo(currentPrice) > 0) {
            recommendations.add("Consider increasing price to " + optResult.getOptimalPrice());
        } else if (optResult.getOptimalPrice().compareTo(currentPrice) < 0) {
            recommendations.add("Consider decreasing price to " + optResult.getOptimalPrice());
        } else {
            recommendations.add("Current price appears optimal");
        }
        recommendations.add("Expected profit improvement: $" + optResult.getProfitImprovement().setScale(2, RoundingMode.HALF_UP));

        return WhatIfResult.builder()
            .scenarioType("OPTIMAL_PRICE")
            .scenarioDescription("Find optimal price between $" + minPrice + " and $" + maxPrice)
            .baseline(toMetricsDto(baseline))
            .projected(toMetricsDto(projected))
            .impact(toMetricsDto(impact))
            .confidence(new BigDecimal("0.60"))
            .recommendations(recommendations)
            .build();
    }

    /**
     * Compare multiple scenarios and rank by net profit impact.
     * 
     * @param scenarios List of scenarios to compare
     * @return Ranked scenarios
     */
    public List<WhatIfResult> compareScenarios(List<WhatIfResult> scenarios) {
        if (scenarios == null || scenarios.isEmpty()) {
            return Collections.emptyList();
        }

        // Sort by profit impact descending
        scenarios.sort((a, b) -> {
            BigDecimal profitA = a.getImpact() != null && a.getImpact().getProfit() != null 
                ? a.getImpact().getProfit() : BigDecimal.ZERO;
            BigDecimal profitB = b.getImpact() != null && b.getImpact().getProfit() != null 
                ? b.getImpact().getProfit() : BigDecimal.ZERO;
            return profitB.compareTo(profitA);
        });

        // Add ranking
        for (int i = 0; i < scenarios.size(); i++) {
            scenarios.get(i).setRank(i + 1);
        }

        return scenarios;
    }

    // ==================== Helper Methods ====================

    private SimulationMetrics getBaselineMetrics(UUID userId) {
        List<Campaign> campaigns = campaignRepository.findByUserId(userId);
        
        long totalImpressions = 0;
        long totalClicks = 0;
        int totalConversions = 0;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        BigDecimal totalSpend = BigDecimal.ZERO;

        for (Campaign campaign : campaigns) {
            totalImpressions += campaign.getImpressions() != null ? campaign.getImpressions() : 0;
            totalClicks += campaign.getClicks() != null ? campaign.getClicks() : 0;
            totalConversions += campaign.getConversions() != null ? campaign.getConversions() : 0;
            totalRevenue = totalRevenue.add(campaign.getRevenue() != null ? campaign.getRevenue() : BigDecimal.ZERO);
            totalSpend = totalSpend.add(campaign.getSpend() != null ? campaign.getSpend() : BigDecimal.ZERO);
        }

        BigDecimal profit = totalRevenue.subtract(totalSpend);

        return SimulationMetrics.builder()
            .impressions(totalImpressions)
            .clicks(totalClicks)
            .conversions(totalConversions)
            .revenue(totalRevenue)
            .adSpend(totalSpend)
            .profit(profit)
            .cashFlow(profit)
            .build();
    }

    private BigDecimal calculateConfidence(SimulationMetrics baseline) {
        // Higher confidence with more data
        if (baseline.getImpressions() > 100000) {
            return new BigDecimal("0.90");
        } else if (baseline.getImpressions() > 10000) {
            return new BigDecimal("0.80");
        } else if (baseline.getImpressions() > 1000) {
            return new BigDecimal("0.70");
        } else {
            return new BigDecimal("0.50");
        }
    }

    private List<String> generateAdSpendRecommendations(BigDecimal changePercent, SimulationResult result) {
        List<String> recommendations = new ArrayList<>();
        
        if (changePercent.compareTo(BigDecimal.ZERO) < 0) {
            recommendations.add("Decreasing ad spend will reduce reach and conversions");
            if (result.getImpact().getProfit().compareTo(BigDecimal.ZERO) > 0) {
                recommendations.add("However, profit may improve due to cost savings");
            }
        } else {
            recommendations.add("Increasing ad spend should improve reach and conversions");
            recommendations.add("Monitor ROAS to ensure spend increase is profitable");
        }
        
        return recommendations;
    }

    private List<String> generatePriceChangeRecommendations(BigDecimal changePercent, SimulationMetrics impact) {
        List<String> recommendations = new ArrayList<>();
        
        if (impact.getProfit().compareTo(BigDecimal.ZERO) > 0) {
            recommendations.add("Price change is projected to increase profit");
        } else {
            recommendations.add("Warning: Price change may decrease profit");
        }
        
        if (changePercent.compareTo(BigDecimal.ZERO) > 0) {
            recommendations.add("Higher prices may reduce conversion rate");
            recommendations.add("Consider A/B testing before full rollout");
        } else {
            recommendations.add("Lower prices may increase volume but reduce margins");
        }
        
        return recommendations;
    }

    private MetricsDto toMetricsDto(SimulationMetrics metrics) {
        if (metrics == null) return null;
        return MetricsDto.builder()
            .impressions(metrics.getImpressions())
            .clicks(metrics.getClicks())
            .conversions(metrics.getConversions())
            .revenue(metrics.getRevenue())
            .adSpend(metrics.getAdSpend())
            .profit(metrics.getProfit())
            .cashFlow(metrics.getCashFlow())
            .price(metrics.getPrice())
            .inventory(metrics.getInventory())
            .build();
    }

    // ==================== DTOs ====================

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class WhatIfResult {
        private String scenarioType;
        private String scenarioDescription;
        private MetricsDto baseline;
        private MetricsDto projected;
        private MetricsDto impact;
        private BigDecimal confidence;
        private Integer breakEvenDays;
        private Integer rank;
        private int eventsProcessed;
        private List<String> recommendations;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MetricsDto {
        private long impressions;
        private long clicks;
        private int conversions;
        private BigDecimal revenue;
        private BigDecimal adSpend;
        private BigDecimal profit;
        private BigDecimal cashFlow;
        private BigDecimal price;
        private int inventory;
    }
}
