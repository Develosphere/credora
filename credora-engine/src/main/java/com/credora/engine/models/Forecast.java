package com.credora.engine.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Forecast entity for cash flow predictions.
 * 
 * Requirements: 1.1, 4.2, 4.3, 4.6
 */
@Entity
@Table(name = "forecasts")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Forecast {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "forecast_date", nullable = false)
    private LocalDate forecastDate;

    @Column(name = "forecast_days", nullable = false)
    private Integer forecastDays;

    @Column(name = "current_cash", precision = 15, scale = 2)
    private BigDecimal currentCash;

    @Column(name = "burn_rate", precision = 15, scale = 2)
    private BigDecimal burnRate;

    @Column(name = "runway_days")
    private Integer runwayDays;

    @Column(name = "low_scenario", precision = 15, scale = 2)
    private BigDecimal lowScenario;

    @Column(name = "mid_scenario", precision = 15, scale = 2)
    private BigDecimal midScenario;

    @Column(name = "high_scenario", precision = 15, scale = 2)
    private BigDecimal highScenario;

    @Column(name = "forecast_points", columnDefinition = "jsonb")
    private String forecastPoints;

    @Column(name = "confidence_level", precision = 3, scale = 2)
    private BigDecimal confidenceLevel;

    @Column(name = "data_days_used")
    private Integer dataDaysUsed;

    @Column(name = "warning_message")
    private String warningMessage;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    /**
     * Minimum days of data required for reliable forecasting.
     */
    public static final int MIN_DATA_DAYS = 30;

    /**
     * Check if forecast has sufficient historical data.
     * 
     * @return true if dataDaysUsed >= MIN_DATA_DAYS
     */
    public boolean hasSufficientData() {
        return dataDaysUsed != null && dataDaysUsed >= MIN_DATA_DAYS;
    }

    /**
     * Validate confidence interval ordering.
     * 
     * @return true if low <= mid <= high
     */
    public boolean hasValidConfidenceIntervals() {
        if (lowScenario == null || midScenario == null || highScenario == null) {
            return false;
        }
        return lowScenario.compareTo(midScenario) <= 0 
            && midScenario.compareTo(highScenario) <= 0;
    }
}
