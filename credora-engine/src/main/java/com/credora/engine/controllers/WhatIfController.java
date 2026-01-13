package com.credora.engine.controllers;

import com.credora.engine.services.WhatIfService;
import com.credora.engine.services.WhatIfService.WhatIfResult;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

/**
 * REST controller for what-if scenario simulations.
 * 
 * Requirements: 8.1
 */
@RestController
@RequestMapping("/api/whatif")
@RequiredArgsConstructor
@Slf4j
public class WhatIfController {

    private final WhatIfService whatIfService;

    /**
     * Simulate a what-if scenario.
     * 
     * POST /api/whatif/simulate
     */
    @PostMapping("/simulate")
    public ResponseEntity<WhatIfResult> simulate(@RequestBody SimulateRequest request) {
        log.info("Simulating scenario: {} for user {}", request.getScenarioType(), request.getUserId());

        WhatIfResult result;
        
        switch (request.getScenarioType().toUpperCase()) {
            case "AD_SPEND_CHANGE":
                result = whatIfService.simulateAdSpendChange(
                    request.getUserId(),
                    request.getChangePercent()
                );
                break;
                
            case "PRICE_CHANGE":
                result = whatIfService.simulatePriceChange(
                    request.getUserId(),
                    request.getSkuId(),
                    request.getChangePercent(),
                    request.getElasticity()
                );
                break;
                
            case "INVENTORY_ORDER":
                result = whatIfService.simulateInventoryOrder(
                    request.getUserId(),
                    request.getSkuId(),
                    request.getUnits() != null ? request.getUnits() : 0
                );
                break;
                
            case "OPTIMAL_PRICE":
                result = whatIfService.findOptimalPrice(
                    request.getUserId(),
                    request.getSkuId(),
                    request.getMinPrice(),
                    request.getMaxPrice(),
                    request.getElasticity()
                );
                break;
                
            default:
                return ResponseEntity.badRequest().body(
                    WhatIfResult.builder()
                        .scenarioType("ERROR")
                        .scenarioDescription("Unknown scenario type: " + request.getScenarioType())
                        .confidence(BigDecimal.ZERO)
                        .build()
                );
        }

        return ResponseEntity.ok(result);
    }

    /**
     * Simulate ad spend change.
     * 
     * POST /api/whatif/ad-spend
     */
    @PostMapping("/ad-spend")
    public ResponseEntity<WhatIfResult> simulateAdSpend(@RequestBody AdSpendRequest request) {
        log.info("Simulating ad spend change of {}% for user {}", request.getChangePercent(), request.getUserId());
        
        WhatIfResult result = whatIfService.simulateAdSpendChange(
            request.getUserId(),
            request.getChangePercent()
        );
        
        return ResponseEntity.ok(result);
    }

    /**
     * Simulate price change.
     * 
     * POST /api/whatif/price
     */
    @PostMapping("/price")
    public ResponseEntity<WhatIfResult> simulatePrice(@RequestBody PriceChangeRequest request) {
        log.info("Simulating price change of {}% for SKU {} user {}", 
            request.getChangePercent(), request.getSkuId(), request.getUserId());
        
        WhatIfResult result = whatIfService.simulatePriceChange(
            request.getUserId(),
            request.getSkuId(),
            request.getChangePercent(),
            request.getElasticity()
        );
        
        return ResponseEntity.ok(result);
    }

    /**
     * Simulate inventory order.
     * 
     * POST /api/whatif/inventory
     */
    @PostMapping("/inventory")
    public ResponseEntity<WhatIfResult> simulateInventory(@RequestBody InventoryOrderRequest request) {
        log.info("Simulating inventory order of {} units for SKU {} user {}", 
            request.getUnits(), request.getSkuId(), request.getUserId());
        
        WhatIfResult result = whatIfService.simulateInventoryOrder(
            request.getUserId(),
            request.getSkuId(),
            request.getUnits()
        );
        
        return ResponseEntity.ok(result);
    }

    /**
     * Find optimal price.
     * 
     * POST /api/whatif/optimal-price
     */
    @PostMapping("/optimal-price")
    public ResponseEntity<WhatIfResult> findOptimalPrice(@RequestBody OptimalPriceRequest request) {
        log.info("Finding optimal price for SKU {} user {}", request.getSkuId(), request.getUserId());
        
        WhatIfResult result = whatIfService.findOptimalPrice(
            request.getUserId(),
            request.getSkuId(),
            request.getMinPrice(),
            request.getMaxPrice(),
            request.getElasticity()
        );
        
        return ResponseEntity.ok(result);
    }

    /**
     * Compare multiple scenarios.
     * 
     * POST /api/whatif/compare
     */
    @PostMapping("/compare")
    public ResponseEntity<List<WhatIfResult>> compareScenarios(@RequestBody List<WhatIfResult> scenarios) {
        log.info("Comparing {} scenarios", scenarios.size());
        
        List<WhatIfResult> ranked = whatIfService.compareScenarios(scenarios);
        return ResponseEntity.ok(ranked);
    }

    // ==================== Request DTOs ====================

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulateRequest {
        private UUID userId;
        private String scenarioType;
        private UUID skuId;
        private BigDecimal changePercent;
        private BigDecimal elasticity;
        private Integer units;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AdSpendRequest {
        private UUID userId;
        private BigDecimal changePercent;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PriceChangeRequest {
        private UUID userId;
        private UUID skuId;
        private BigDecimal changePercent;
        private BigDecimal elasticity;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class InventoryOrderRequest {
        private UUID userId;
        private UUID skuId;
        private int units;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class OptimalPriceRequest {
        private UUID userId;
        private UUID skuId;
        private BigDecimal minPrice;
        private BigDecimal maxPrice;
        private BigDecimal elasticity;
    }
}
