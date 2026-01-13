package com.credora.engine.models;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Transaction entity representing normalized financial transactions.
 * 
 * Requirements: 1.1, 2.1, 2.2, 2.3
 */
@Entity
@Table(name = "transactions")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    private String platform;

    @Column(name = "platform_id")
    private String platformId;

    @Column(nullable = false, length = 50)
    private String type;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(length = 3)
    @Builder.Default
    private String currency = "USD";

    @Column(name = "amount_usd", precision = 15, scale = 2)
    private BigDecimal amountUsd;

    @Column(name = "product_id")
    private UUID productId;

    private Integer quantity;

    @Column(name = "cost_per_unit", precision = 15, scale = 2)
    private BigDecimal costPerUnit;

    @Column(name = "campaign_id")
    private UUID campaignId;

    @Column(name = "customer_id")
    private String customerId;

    @Column(name = "occurred_at", nullable = false)
    private Instant occurredAt;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    /**
     * Transaction types.
     */
    public static class Types {
        public static final String ORDER = "order";
        public static final String REFUND = "refund";
        public static final String AD_SPEND = "ad_spend";
        public static final String EXPENSE = "expense";
        public static final String PAYOUT = "payout";
        public static final String INVENTORY_COST = "inventory_cost";
    }

    /**
     * Check if this is a revenue transaction.
     */
    public boolean isRevenue() {
        return Types.ORDER.equals(type);
    }

    /**
     * Check if this is a refund transaction.
     */
    public boolean isRefund() {
        return Types.REFUND.equals(type);
    }

    /**
     * Check if this is an expense transaction.
     */
    public boolean isExpense() {
        return Types.AD_SPEND.equals(type) || Types.EXPENSE.equals(type);
    }

    /**
     * Get the USD amount, falling back to amount if amountUsd is null.
     */
    public BigDecimal getEffectiveAmountUsd() {
        return amountUsd != null ? amountUsd : amount;
    }
}
