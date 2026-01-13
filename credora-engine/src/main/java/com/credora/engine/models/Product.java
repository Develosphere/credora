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
 * Product/SKU entity.
 * 
 * Requirements: 1.1
 */
@Entity
@Table(name = "products")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Product {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "user_id", nullable = false)
    private UUID userId;

    @Column(nullable = false, length = 50)
    private String platform;

    @Column(name = "platform_product_id")
    private String platformProductId;

    private String sku;

    private String name;

    @Column(name = "unit_cost", precision = 15, scale = 2)
    private BigDecimal unitCost;

    @Column(name = "selling_price", precision = 15, scale = 2)
    private BigDecimal sellingPrice;

    @Column(name = "inventory_quantity")
    @Builder.Default
    private Integer inventoryQuantity = 0;

    private String category;

    @Column(name = "created_at")
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    /**
     * Calculate gross margin for this product.
     * 
     * @return Gross margin as decimal (e.g., 0.30 for 30%)
     */
    public BigDecimal getGrossMargin() {
        if (sellingPrice == null || sellingPrice.compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        if (unitCost == null) {
            return BigDecimal.ONE;
        }
        return sellingPrice.subtract(unitCost)
                .divide(sellingPrice, 4, java.math.RoundingMode.HALF_UP);
    }

    /**
     * Calculate profit per unit.
     * 
     * @return Profit per unit
     */
    public BigDecimal getProfitPerUnit() {
        BigDecimal price = sellingPrice != null ? sellingPrice : BigDecimal.ZERO;
        BigDecimal cost = unitCost != null ? unitCost : BigDecimal.ZERO;
        return price.subtract(cost);
    }
}
