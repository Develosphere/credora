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
 * P&L Report entity for cached profit and loss calculations.
 * 
 * Requirements: 1.1, 3.1, 3.2, 3.3, 3.4, 3.5
 */
@Entity
@Table(name = "pnl_reports")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PnLReport {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal revenue = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal refunds = BigDecimal.ZERO;

    @Column(name = "net_revenue", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal netRevenue = BigDecimal.ZERO;

    @Column(precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal cogs = BigDecimal.ZERO;

    @Column(name = "gross_profit", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal grossProfit = BigDecimal.ZERO;

    @Column(name = "ad_spend", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal adSpend = BigDecimal.ZERO;

    @Column(name = "other_expenses", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal otherExpenses = BigDecimal.ZERO;

    @Column(name = "operating_costs", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal operatingCosts = BigDecimal.ZERO;

    @Column(name = "net_profit", precision = 15, scale = 2)
    @Builder.Default
    private BigDecimal netProfit = BigDecimal.ZERO;

    @Column(name = "gross_margin", precision = 5, scale = 4)
    private BigDecimal grossMargin;

    @Column(name = "net_margin", precision = 5, scale = 4)
    private BigDecimal netMargin;

    @Column(name = "calculated_at")
    @Builder.Default
    private Instant calculatedAt = Instant.now();

    /**
     * Calculate all derived fields from base values.
     * 
     * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
     */
    public void calculateDerivedFields() {
        // Net Revenue = Revenue - Refunds (Requirement 3.1)
        this.netRevenue = revenue.subtract(refunds);
        
        // Gross Profit = Net Revenue - COGS (Requirement 3.3)
        this.grossProfit = netRevenue.subtract(cogs);
        
        // Operating Costs = Ad Spend + Other Expenses (Requirement 3.4)
        this.operatingCosts = adSpend.add(otherExpenses);
        
        // Net Profit = Gross Profit - Operating Costs (Requirement 3.5)
        this.netProfit = grossProfit.subtract(operatingCosts);
        
        // Calculate margins
        if (netRevenue.compareTo(BigDecimal.ZERO) > 0) {
            this.grossMargin = grossProfit.divide(netRevenue, 4, RoundingMode.HALF_UP);
            this.netMargin = netProfit.divide(netRevenue, 4, RoundingMode.HALF_UP);
        } else {
            this.grossMargin = BigDecimal.ZERO;
            this.netMargin = BigDecimal.ZERO;
        }
    }

    /**
     * Create a builder with calculated fields.
     */
    public static PnLReport calculate(
            UUID userId,
            LocalDate startDate,
            LocalDate endDate,
            BigDecimal revenue,
            BigDecimal refunds,
            BigDecimal cogs,
            BigDecimal adSpend,
            BigDecimal otherExpenses
    ) {
        PnLReport report = PnLReport.builder()
                .userId(userId)
                .startDate(startDate)
                .endDate(endDate)
                .revenue(revenue)
                .refunds(refunds)
                .cogs(cogs)
                .adSpend(adSpend)
                .otherExpenses(otherExpenses)
                .build();
        
        report.calculateDerivedFields();
        return report;
    }
}
