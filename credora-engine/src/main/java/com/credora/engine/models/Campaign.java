package com.credora.engine.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Campaign entity for ad campaigns.
 * 
 * Requirements: 1.1
 */
@Entity
@Table(name = "campaigns")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Campaign {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    private String platform;

    @Column(name = "platform_campaign_id")
    private String platformCampaignId;

    private String name;

    @Column(length = 50)
    private String status;

    @Column(precision = 15, scale = 2)
    private BigDecimal budget;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal spend = BigDecimal.ZERO;

    @Builder.Default
    private Long impressions = 0L;

    @Builder.Default
    private Long clicks = 0L;

    @Builder.Default
    private Integer conversions = 0;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal revenue = BigDecimal.ZERO;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    /**
     * Minimum impressions required for reliable metrics.
     */
    public static final long MIN_IMPRESSIONS_FOR_RANKING = 100;

    /**
     * Calculate simple ROAS (Return on Ad Spend).
     * 
     * @return ROAS as decimal (e.g., 2.5 means $2.50 revenue per $1 spent)
     */
    public BigDecimal getRoas() {
        if (spend == null || spend.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        return revenue.divide(spend, 4, RoundingMode.HALF_UP);
    }

    /**
     * Calculate effective ROAS accounting for product margins.
     * 
     * @param grossMargin Average gross margin of products (0.0 to 1.0)
     * @return Effective ROAS
     */
    public BigDecimal getEffectiveRoas(BigDecimal grossMargin) {
        if (spend == null || spend.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        BigDecimal grossProfit = revenue.multiply(grossMargin);
        return grossProfit.divide(spend, 4, RoundingMode.HALF_UP);
    }

    /**
     * Calculate Click-Through Rate (CTR).
     * 
     * @return CTR as decimal (e.g., 0.02 for 2%)
     */
    public BigDecimal getCtr() {
        if (impressions == null || impressions == 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(clicks)
                .divide(BigDecimal.valueOf(impressions), 6, RoundingMode.HALF_UP);
    }

    /**
     * Calculate Conversion Rate.
     * 
     * @return Conversion rate as decimal
     */
    public BigDecimal getConversionRate() {
        if (clicks == null || clicks == 0) {
            return BigDecimal.ZERO;
        }
        return BigDecimal.valueOf(conversions)
                .divide(BigDecimal.valueOf(clicks), 6, RoundingMode.HALF_UP);
    }

    /**
     * Calculate Cost Per Click (CPC).
     * 
     * @return CPC in currency
     */
    public BigDecimal getCpc() {
        if (clicks == null || clicks == 0) {
            return BigDecimal.ZERO;
        }
        return spend.divide(BigDecimal.valueOf(clicks), 4, RoundingMode.HALF_UP);
    }

    /**
     * Calculate Cost Per Acquisition (CPA).
     * 
     * @return CPA in currency
     */
    public BigDecimal getCpa() {
        if (conversions == null || conversions == 0) {
            return BigDecimal.ZERO;
        }
        return spend.divide(BigDecimal.valueOf(conversions), 4, RoundingMode.HALF_UP);
    }

    /**
     * Check if campaign has sufficient data for ranking.
     * 
     * @return true if impressions >= MIN_IMPRESSIONS_FOR_RANKING
     */
    public boolean hasSufficientData() {
        return impressions != null && impressions >= MIN_IMPRESSIONS_FOR_RANKING;
    }
}
