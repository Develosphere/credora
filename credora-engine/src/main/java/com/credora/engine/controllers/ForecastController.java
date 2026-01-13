package com.credora.engine.controllers;

import com.credora.engine.dsa.ExpenseHeap;
import com.credora.engine.models.Forecast;
import com.credora.engine.services.ForecastService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * REST Controller for cash flow forecasting.
 * 
 * Endpoints:
 * - POST /api/forecast/cash - Generate cash flow forecast
 * - GET /api/forecast/burn-rate - Get burn rate
 * - GET /api/forecast/runway - Get cash runway
 * - GET /api/forecast/expenses - Get upcoming expenses
 * 
 * Requirements: 8.1
 */
@RestController
@RequestMapping("/api/forecast")
@RequiredArgsConstructor
@Slf4j
public class ForecastController {

    private final ForecastService forecastService;

    /**
     * Generate cash flow forecast.
     * 
     * POST /api/forecast/cash
     */
    @PostMapping("/cash")
    public ResponseEntity<ForecastResponse> generateForecast(@Valid @RequestBody ForecastRequest request) {
        log.info("Forecast request for user {} with {} days ahead", 
                request.getUserId(), request.getDaysAhead());

        try {
            UUID userId = request.getUserIdAsUUID();
            
            Forecast forecast = request.isSaveResult()
                    ? forecastService.generateAndSaveForecast(
                            userId, request.getCurrentCash(), request.getDaysAhead())
                    : forecastService.generateForecast(
                            userId, request.getCurrentCash(), request.getDaysAhead());

            return ResponseEntity.ok(ForecastResponse.fromForecast(forecast));

        } catch (Exception e) {
            log.error("Error generating forecast for user {}: {}", request.getUserId(), e.getMessage(), e);
            return ResponseEntity.internalServerError()
                    .body(ForecastResponse.error("Failed to generate forecast: " + e.getMessage()));
        }
    }

    /**
     * Get burn rate for a user.
     * 
     * GET /api/forecast/burn-rate?userId=X&windowDays=30
     */
    @GetMapping("/burn-rate")
    public ResponseEntity<BurnRateResponse> getBurnRate(
            @RequestParam UUID userId,
            @RequestParam(defaultValue = "30") int windowDays) {
        
        log.info("Burn rate request for user {} with {} day window", userId, windowDays);

        try {
            BigDecimal burnRate = forecastService.calculateBurnRate(userId, windowDays);
            return ResponseEntity.ok(new BurnRateResponse(burnRate, windowDays));

        } catch (Exception e) {
            log.error("Error calculating burn rate for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get cash runway for a user.
     * 
     * GET /api/forecast/runway?userId=X&currentCash=10000
     */
    @GetMapping("/runway")
    public ResponseEntity<RunwayResponse> getRunway(
            @RequestParam UUID userId,
            @RequestParam BigDecimal currentCash) {
        
        log.info("Runway request for user {} with cash {}", userId, currentCash);

        try {
            int runwayDays = forecastService.calculateRunway(userId, currentCash);
            BigDecimal burnRate = forecastService.calculateBurnRate(userId, 30);
            
            return ResponseEntity.ok(new RunwayResponse(runwayDays, burnRate, currentCash));

        } catch (Exception e) {
            log.error("Error calculating runway for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get upcoming expenses.
     * 
     * GET /api/forecast/expenses?userId=X&count=10
     */
    @GetMapping("/expenses")
    public ResponseEntity<List<ExpenseResponse>> getUpcomingExpenses(
            @RequestParam UUID userId,
            @RequestParam(defaultValue = "10") int count) {
        
        log.info("Upcoming expenses request for user {} with count {}", userId, count);

        try {
            List<ExpenseHeap.Expense> expenses = forecastService.getUpcomingExpenses(userId, count);
            List<ExpenseResponse> response = expenses.stream()
                    .map(ExpenseResponse::fromExpense)
                    .toList();
            
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Error fetching expenses for user {}: {}", userId, e.getMessage(), e);
            return ResponseEntity.internalServerError().build();
        }
    }

    /**
     * Get latest forecast for a user.
     * 
     * GET /api/forecast/latest?userId=X
     */
    @GetMapping("/latest")
    public ResponseEntity<ForecastResponse> getLatestForecast(@RequestParam UUID userId) {
        log.info("Latest forecast request for user {}", userId);

        return forecastService.getLatestForecast(userId)
                .map(f -> ResponseEntity.ok(ForecastResponse.fromForecast(f)))
                .orElse(ResponseEntity.notFound().build());
    }

    // ==================== Request/Response DTOs ====================

    @Data
    public static class ForecastRequest {
        @NotNull(message = "User ID is required")
        private String userId;  // Accept string, convert to UUID internally

        @NotNull(message = "Current cash is required")
        private BigDecimal currentCash;

        @Min(value = 1, message = "Days ahead must be at least 1")
        private int daysAhead = 30;

        private boolean saveResult = false;
        
        /**
         * Get user ID as UUID, generating a deterministic UUID from string if needed.
         */
        public UUID getUserIdAsUUID() {
            try {
                return UUID.fromString(userId);
            } catch (IllegalArgumentException e) {
                return UUID.nameUUIDFromBytes(userId.getBytes());
            }
        }
    }

    @Data
    public static class ForecastResponse {
        private UUID userId;
        private LocalDate forecastDate;
        private Integer forecastDays;
        private BigDecimal currentCash;
        private BigDecimal burnRate;
        private Integer runwayDays;
        private BigDecimal lowScenario;
        private BigDecimal midScenario;
        private BigDecimal highScenario;
        private BigDecimal confidenceLevel;
        private Integer dataDaysUsed;
        private String warningMessage;
        private String error;

        public static ForecastResponse fromForecast(Forecast forecast) {
            ForecastResponse response = new ForecastResponse();
            response.setUserId(forecast.getUserId());
            response.setForecastDate(forecast.getForecastDate());
            response.setForecastDays(forecast.getForecastDays());
            response.setCurrentCash(forecast.getCurrentCash());
            response.setBurnRate(forecast.getBurnRate());
            response.setRunwayDays(forecast.getRunwayDays());
            response.setLowScenario(forecast.getLowScenario());
            response.setMidScenario(forecast.getMidScenario());
            response.setHighScenario(forecast.getHighScenario());
            response.setConfidenceLevel(forecast.getConfidenceLevel());
            response.setDataDaysUsed(forecast.getDataDaysUsed());
            response.setWarningMessage(forecast.getWarningMessage());
            return response;
        }

        public static ForecastResponse error(String message) {
            ForecastResponse response = new ForecastResponse();
            response.setError(message);
            return response;
        }
    }

    @Data
    public static class BurnRateResponse {
        private BigDecimal burnRate;
        private int windowDays;
        private String description;

        public BurnRateResponse(BigDecimal burnRate, int windowDays) {
            this.burnRate = burnRate;
            this.windowDays = windowDays;
            this.description = String.format("Average daily expenses over last %d days", windowDays);
        }
    }

    @Data
    public static class RunwayResponse {
        private int runwayDays;
        private BigDecimal burnRate;
        private BigDecimal currentCash;
        private String description;

        public RunwayResponse(int runwayDays, BigDecimal burnRate, BigDecimal currentCash) {
            this.runwayDays = runwayDays;
            this.burnRate = burnRate;
            this.currentCash = currentCash;
            this.description = runwayDays == Integer.MAX_VALUE 
                    ? "Infinite runway (no burn rate)"
                    : String.format("Cash will last approximately %d days at current burn rate", runwayDays);
        }
    }

    @Data
    public static class ExpenseResponse {
        private String id;
        private String description;
        private BigDecimal amount;
        private LocalDate dueDate;
        private String category;

        public static ExpenseResponse fromExpense(ExpenseHeap.Expense expense) {
            ExpenseResponse response = new ExpenseResponse();
            response.setId(expense.getId());
            response.setDescription(expense.getDescription());
            response.setAmount(expense.getAmount());
            response.setDueDate(expense.getDueDate());
            response.setCategory(expense.getCategory());
            return response;
        }
    }
}
