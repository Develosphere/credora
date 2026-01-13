package com.credora.engine.controllers;

import com.credora.engine.models.PnLReport;
import com.credora.engine.services.PnLService;
import jakarta.validation.Valid;
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
 * REST Controller for P&L (Profit & Loss) calculations.
 * 
 * Endpoints:
 * - POST /api/pnl/calculate - Calculate P&L for a date range
 * - GET /api/pnl/history - Get P&L history for a user
 * 
 * Requirements: 8.1, 8.2
 */
@RestController
@RequestMapping("/api/pnl")
@RequiredArgsConstructor
@Slf4j
public class PnLController {

    private final PnLService pnlService;

    /**
     * Calculate P&L for a user within a date range.
     * 
     * POST /api/pnl/calculate
     * 
     * Request body:
     * {
     *   "userId": "uuid",
     *   "startDate": "2024-01-01",
     *   "endDate": "2024-01-31"
     * }
     */
    @PostMapping("/calculate")
    public ResponseEntity<PnLResponse> calculatePnL(@Valid @RequestBody PnLRequest request) {
        log.info("P&L calculation request for user {} from {} to {}", 
                request.getUserId(), request.getStartDate(), request.getEndDate());

        try {
            // Validate date range
            if (request.getEndDate().isBefore(request.getStartDate())) {
                return ResponseEntity.badRequest()
                        .body(PnLResponse.error("End date must be after start date"));
            }

            // Get UUID from user ID (handles both UUID strings and regular strings)
            UUID userId = request.getUserIdAsUUID();

            // Calculate P&L
            PnLReport report = request.isSaveResult() 
                    ? pnlService.calculateAndSavePnL(userId, request.getStartDate(), request.getEndDate())
                    : pnlService.calculatePnL(userId, request.getStartDate(), request.getEndDate());

            return ResponseEntity.ok(PnLResponse.fromReport(report));

        } catch (Exception e) {
            log.error("Error calculating P&L for user {}: {}", request.getUserId(), e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(PnLResponse.error("Failed to calculate P&L: " + e.getMessage()));
        }
    }

    /**
     * Get P&L history for a user.
     * 
     * GET /api/pnl/history?userId=uuid
     */
    @GetMapping("/history")
    public ResponseEntity<List<PnLResponse>> getPnLHistory(@RequestParam UUID userId) {
        log.info("P&L history request for user {}", userId);

        try {
            List<PnLReport> reports = pnlService.getPnLHistory(userId);
            List<PnLResponse> responses = reports.stream()
                    .map(PnLResponse::fromReport)
                    .toList();
            return ResponseEntity.ok(responses);

        } catch (Exception e) {
            log.error("Error fetching P&L history for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get cached P&L for a specific date range.
     * 
     * GET /api/pnl/cached?userId=uuid&startDate=2024-01-01&endDate=2024-01-31
     */
    @GetMapping("/cached")
    public ResponseEntity<PnLResponse> getCachedPnL(
            @RequestParam UUID userId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        
        log.info("Cached P&L request for user {} from {} to {}", userId, startDate, endDate);

        return pnlService.getCachedPnL(userId, startDate, endDate)
                .map(report -> ResponseEntity.ok(PnLResponse.fromReport(report)))
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Request DTO for P&L calculation.
     */
    @Data
    public static class PnLRequest {
        @NotNull(message = "User ID is required")
        private String userId;  // Accept string, convert to UUID internally

        @NotNull(message = "Start date is required")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate startDate;

        @NotNull(message = "End date is required")
        @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
        private LocalDate endDate;

        private boolean saveResult = false;
        
        /**
         * Get user ID as UUID, generating a deterministic UUID from string if needed.
         */
        public UUID getUserIdAsUUID() {
            try {
                return UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                // Generate deterministic UUID from string using UUID v5 (name-based)
                return UUID.nameUUIDFromBytes(userId.getBytes());
            }
        }
    }

    /**
     * Response DTO for P&L data.
     */
    @Data
    public static class PnLResponse {
        private UUID userId;
        private LocalDate startDate;
        private LocalDate endDate;
        private BigDecimal revenue;
        private BigDecimal refunds;
        private BigDecimal netRevenue;
        private BigDecimal cogs;
        private BigDecimal grossProfit;
        private BigDecimal adSpend;
        private BigDecimal otherExpenses;
        private BigDecimal operatingCosts;
        private BigDecimal netProfit;
        private BigDecimal grossMargin;
        private BigDecimal netMargin;
        private String error;

        public static PnLResponse fromReport(PnLReport report) {
            PnLResponse response = new PnLResponse();
            response.setUserId(report.getUserId());
            response.setStartDate(report.getStartDate());
            response.setEndDate(report.getEndDate());
            response.setRevenue(report.getRevenue());
            response.setRefunds(report.getRefunds());
            response.setNetRevenue(report.getNetRevenue());
            response.setCogs(report.getCogs());
            response.setGrossProfit(report.getGrossProfit());
            response.setAdSpend(report.getAdSpend());
            response.setOtherExpenses(report.getOtherExpenses());
            response.setOperatingCosts(report.getOperatingCosts());
            response.setNetProfit(report.getNetProfit());
            response.setGrossMargin(report.getGrossMargin());
            response.setNetMargin(report.getNetMargin());
            return response;
        }

        public static PnLResponse error(String message) {
            PnLResponse response = new PnLResponse();
            response.setError(message);
            return response;
        }
    }
}
