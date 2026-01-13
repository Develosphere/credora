package com.credora.engine.controllers;

import com.credora.engine.services.SkuAnalyzerService;
import com.credora.engine.services.SkuAnalyzerService.SkuAnalysis;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller for SKU unit economics analysis.
 * 
 * Endpoints:
 * - POST /api/sku/analyze - Analyze specific SKUs
 * - GET /api/sku/analyze/all - Analyze all SKUs for a user
 * - GET /api/sku/{skuId} - Analyze a single SKU
 * - GET /api/sku/{skuId}/profit - Get profit in date range
 * 
 * Requirements: 8.1
 */
@RestController
@RequestMapping("/api/sku")
@RequiredArgsConstructor
@Slf4j
public class SkuController {

    private final SkuAnalyzerService skuAnalyzerService;

    /**
     * Analyze specific SKUs.
     * 
     * POST /api/sku/analyze
     */
    @PostMapping("/analyze")
    public ResponseEntity<SkuAnalysisResponse> analyzeSkus(@Valid @RequestBody SkuAnalysisRequest request) {
        log.info("SKU analysis request for user {} with {} SKUs", 
                request.getUserId(), request.getSkuIds().size());

        try {
            List<SkuAnalysis> analyses = skuAnalyzerService.analyzeSkus(
                    request.getUserId(), request.getSkuIds());

            return ResponseEntity.ok(SkuAnalysisResponse.success(analyses));

        } catch (Exception e) {
            log.error("Error analyzing SKUs for user {}: {}", request.getUserId(), e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(SkuAnalysisResponse.error("Failed to analyze SKUs: " + e.getMessage()));
        }
    }

    /**
     * Analyze all SKUs for a user.
     * 
     * GET /api/sku/analyze/all?userId=X
     */
    @GetMapping("/analyze/all")
    public ResponseEntity<SkuAnalysisResponse> analyzeAllSkus(@RequestParam String userId) {
        log.info("Analyzing all SKUs for user {}", userId);

        try {
            // Convert string userId to UUID (handles both UUID strings and email addresses)
            UUID userUuid;
            try {
                userUuid = UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                userUuid = UUID.nameUUIDFromBytes(userId.getBytes());
            }
            
            List<SkuAnalysis> analyses = skuAnalyzerService.analyzeAllSkus(userUuid);
            return ResponseEntity.ok(SkuAnalysisResponse.success(analyses));

        } catch (Exception e) {
            log.error("Error analyzing all SKUs for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(SkuAnalysisResponse.error("Failed to analyze SKUs: " + e.getMessage()));
        }
    }

    /**
     * Analyze a single SKU.
     * 
     * GET /api/sku/{skuId}?userId=X
     */
    @GetMapping("/{skuId}")
    public ResponseEntity<SkuAnalysisDetailResponse> analyzeSku(
            @PathVariable UUID skuId,
            @RequestParam UUID userId) {
        
        log.info("Analyzing SKU {} for user {}", skuId, userId);

        try {
            SkuAnalysis analysis = skuAnalyzerService.analyzeSku(userId, skuId);
            return ResponseEntity.ok(SkuAnalysisDetailResponse.fromAnalysis(analysis));

        } catch (IllegalArgumentException e) {
            log.warn("SKU not found: {}", skuId);
            return ResponseEntity.notFound().build();

        } catch (Exception e) {
            log.error("Error analyzing SKU {}: {}", skuId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get profit for a SKU in a date range.
     * 
     * GET /api/sku/{skuId}/profit?userId=X&fromDate=2024-01-01&toDate=2024-01-31
     */
    @GetMapping("/{skuId}/profit")
    public ResponseEntity<ProfitRangeResponse> getSkuProfit(
            @PathVariable UUID skuId,
            @RequestParam UUID userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {
        
        log.info("Getting profit for SKU {} from {} to {}", skuId, fromDate, toDate);

        try {
            BigDecimal profit = skuAnalyzerService.getProfitInRange(userId, skuId, fromDate, toDate);
            return ResponseEntity.ok(new ProfitRangeResponse(skuId, fromDate, toDate, profit));

        } catch (Exception e) {
            log.error("Error getting profit for SKU {}: {}", skuId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    // ==================== Request/Response DTOs ====================

    @Data
    public static class SkuAnalysisRequest {
        @NotNull(message = "User ID is required")
        private UUID userId;

        @NotEmpty(message = "At least one SKU ID is required")
        private List<UUID> skuIds;
    }

    @Data
    public static class SkuAnalysisResponse {
        private List<SkuAnalysisDetailResponse> skus;
        private int count;
        private String error;

        public static SkuAnalysisResponse success(List<SkuAnalysis> analyses) {
            SkuAnalysisResponse response = new SkuAnalysisResponse();
            response.setSkus(analyses.stream()
                    .map(SkuAnalysisDetailResponse::fromAnalysis)
                    .toList());
            response.setCount(analyses.size());
            return response;
        }

        public static SkuAnalysisResponse error(String message) {
            SkuAnalysisResponse response = new SkuAnalysisResponse();
            response.setError(message);
            return response;
        }
    }

    @Data
    public static class SkuAnalysisDetailResponse {
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

        public static SkuAnalysisDetailResponse fromAnalysis(SkuAnalysis analysis) {
            SkuAnalysisDetailResponse response = new SkuAnalysisDetailResponse();
            response.setSkuId(analysis.getSkuId());
            response.setSku(analysis.getSku());
            response.setName(analysis.getName());
            response.setSellingPrice(analysis.getSellingPrice());
            response.setUnitCost(analysis.getUnitCost());
            response.setProfitPerUnit(analysis.getProfitPerUnit());
            response.setCac(analysis.getCac());
            response.setAllocatedAdCost(analysis.getAllocatedAdCost());
            response.setRefundRate(analysis.getRefundRate());
            response.setDepletionRate(analysis.getDepletionRate());
            response.setTrueRoas(analysis.getTrueRoas());
            response.setGrossMargin(analysis.getGrossMargin());
            response.setTotalOrders(analysis.getTotalOrders());
            response.setTotalRefunds(analysis.getTotalRefunds());
            response.setTotalRevenue(analysis.getTotalRevenue());
            response.setTotalAdSpend(analysis.getTotalAdSpend());
            response.setInventoryQuantity(analysis.getInventoryQuantity());
            return response;
        }
    }

    @Data
    public static class ProfitRangeResponse {
        private UUID skuId;
        private LocalDate fromDate;
        private LocalDate toDate;
        private BigDecimal profit;

        public ProfitRangeResponse(UUID skuId, LocalDate fromDate, LocalDate toDate, BigDecimal profit) {
            this.skuId = skuId;
            this.fromDate = fromDate;
            this.toDate = toDate;
            this.profit = profit;
        }
    }
}
