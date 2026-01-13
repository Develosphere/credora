package com.credora.engine.dsa;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.function.Function;

/**
 * OptimalPriceFinder DSA class for finding optimal pricing using ternary search.
 * Uses binary/ternary search to find the price point that maximizes profit.
 * 
 * Time Complexity: O(log((maxPrice - minPrice) / precision))
 * 
 * Requirements: 7.8
 */
public class OptimalPriceFinder {

    private static final BigDecimal DEFAULT_PRECISION = new BigDecimal("0.01");
    private static final int MAX_ITERATIONS = 1000;

    /**
     * Find the optimal price that maximizes profit using ternary search.
     * 
     * Ternary search is used because profit as a function of price is typically
     * unimodal (increases then decreases) due to price elasticity of demand.
     * 
     * @param minPrice Minimum price constraint
     * @param maxPrice Maximum price constraint
     * @param unitCost Cost per unit
     * @param demandFunction Function that returns expected demand at a given price
     * @return Optimal price point
     */
    public BigDecimal findOptimalPrice(
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal unitCost,
            Function<BigDecimal, Integer> demandFunction) {
        
        return findOptimalPrice(minPrice, maxPrice, unitCost, demandFunction, DEFAULT_PRECISION);
    }

    /**
     * Find the optimal price with custom precision.
     * 
     * @param minPrice Minimum price constraint
     * @param maxPrice Maximum price constraint
     * @param unitCost Cost per unit
     * @param demandFunction Function that returns expected demand at a given price
     * @param precision Search precision (e.g., 0.01 for cent-level precision)
     * @return Optimal price point
     */
    public BigDecimal findOptimalPrice(
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal unitCost,
            Function<BigDecimal, Integer> demandFunction,
            BigDecimal precision) {
        
        if (minPrice == null || maxPrice == null || unitCost == null || demandFunction == null) {
            throw new IllegalArgumentException("All parameters must be non-null");
        }
        
        if (minPrice.compareTo(maxPrice) > 0) {
            throw new IllegalArgumentException("minPrice must be <= maxPrice");
        }
        
        if (precision == null || precision.compareTo(BigDecimal.ZERO) <= 0) {
            precision = DEFAULT_PRECISION;
        }

        BigDecimal low = minPrice;
        BigDecimal high = maxPrice;
        int iterations = 0;

        // Ternary search for maximum profit
        while (high.subtract(low).compareTo(precision) > 0 && iterations < MAX_ITERATIONS) {
            BigDecimal third = high.subtract(low).divide(BigDecimal.valueOf(3), 10, RoundingMode.HALF_UP);
            BigDecimal mid1 = low.add(third);
            BigDecimal mid2 = high.subtract(third);

            BigDecimal profit1 = calculateProfit(mid1, unitCost, demandFunction);
            BigDecimal profit2 = calculateProfit(mid2, unitCost, demandFunction);

            if (profit1.compareTo(profit2) < 0) {
                low = mid1;
            } else {
                high = mid2;
            }
            
            iterations++;
        }

        // Return the midpoint of the final range, rounded to precision
        return low.add(high)
            .divide(BigDecimal.valueOf(2), 2, RoundingMode.HALF_UP);
    }


    /**
     * Calculate profit at a given price point.
     * 
     * Profit = (price - cost) × demand
     * 
     * @param price Selling price
     * @param cost Unit cost
     * @param demandFunction Function returning demand at price
     * @return Profit at this price point
     */
    public BigDecimal calculateProfit(
            BigDecimal price,
            BigDecimal cost,
            Function<BigDecimal, Integer> demandFunction) {
        
        int demand = demandFunction.apply(price);
        if (demand <= 0) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal margin = price.subtract(cost);
        return margin.multiply(BigDecimal.valueOf(demand));
    }

    /**
     * Find optimal price with detailed result including analysis.
     * 
     * @param minPrice Minimum price constraint
     * @param maxPrice Maximum price constraint
     * @param unitCost Cost per unit
     * @param demandFunction Function that returns expected demand at a given price
     * @return Detailed optimization result
     */
    public OptimizationResult findOptimalPriceWithAnalysis(
            BigDecimal minPrice,
            BigDecimal maxPrice,
            BigDecimal unitCost,
            Function<BigDecimal, Integer> demandFunction) {
        
        BigDecimal optimalPrice = findOptimalPrice(minPrice, maxPrice, unitCost, demandFunction);
        int demandAtOptimal = demandFunction.apply(optimalPrice);
        BigDecimal profitAtOptimal = calculateProfit(optimalPrice, unitCost, demandFunction);
        BigDecimal revenueAtOptimal = optimalPrice.multiply(BigDecimal.valueOf(demandAtOptimal));
        BigDecimal marginAtOptimal = optimalPrice.subtract(unitCost);
        
        // Calculate profit at boundaries for comparison
        BigDecimal profitAtMin = calculateProfit(minPrice, unitCost, demandFunction);
        BigDecimal profitAtMax = calculateProfit(maxPrice, unitCost, demandFunction);
        
        return OptimizationResult.builder()
            .optimalPrice(optimalPrice)
            .expectedDemand(demandAtOptimal)
            .expectedProfit(profitAtOptimal)
            .expectedRevenue(revenueAtOptimal)
            .marginPerUnit(marginAtOptimal)
            .profitAtMinPrice(profitAtMin)
            .profitAtMaxPrice(profitAtMax)
            .profitImprovement(profitAtOptimal.subtract(
                profitAtMin.max(profitAtMax)))
            .build();
    }

    /**
     * Create a simple linear demand function.
     * 
     * Demand decreases linearly as price increases:
     * demand = maxDemand - (price - basePrice) × elasticity
     * 
     * @param basePrice Price at which demand equals maxDemand
     * @param maxDemand Maximum demand at base price
     * @param elasticity How much demand decreases per unit price increase
     * @return Demand function
     */
    public static Function<BigDecimal, Integer> linearDemandFunction(
            BigDecimal basePrice,
            int maxDemand,
            double elasticity) {
        
        return price -> {
            BigDecimal priceDiff = price.subtract(basePrice);
            double demandReduction = priceDiff.doubleValue() * elasticity;
            int demand = (int) (maxDemand - demandReduction);
            return Math.max(0, demand);
        };
    }

    /**
     * Create an exponential demand function (more realistic for many products).
     * 
     * Demand follows: demand = baseDemand × e^(-elasticity × (price - basePrice))
     * 
     * @param basePrice Reference price
     * @param baseDemand Demand at reference price
     * @param elasticity Price elasticity coefficient
     * @return Demand function
     */
    public static Function<BigDecimal, Integer> exponentialDemandFunction(
            BigDecimal basePrice,
            int baseDemand,
            double elasticity) {
        
        return price -> {
            double priceDiff = price.subtract(basePrice).doubleValue();
            double demand = baseDemand * Math.exp(-elasticity * priceDiff);
            return Math.max(0, (int) demand);
        };
    }

    /**
     * Result of price optimization.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptimizationResult {
        private BigDecimal optimalPrice;
        private int expectedDemand;
        private BigDecimal expectedProfit;
        private BigDecimal expectedRevenue;
        private BigDecimal marginPerUnit;
        private BigDecimal profitAtMinPrice;
        private BigDecimal profitAtMaxPrice;
        private BigDecimal profitImprovement;
    }
}
