package com.credora.engine.repositories;

import com.credora.engine.models.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Product entities.
 * 
 * Requirements: 1.1
 */
@Repository
public interface ProductRepository extends JpaRepository<Product, UUID> {

    /**
     * Find all products for a user.
     */
    List<Product> findByUserId(UUID userId);

    /**
     * Find product by SKU for a user.
     */
    Optional<Product> findByUserIdAndSku(UUID userId, String sku);

    /**
     * Find product by platform product ID.
     */
    Optional<Product> findByUserIdAndPlatformAndPlatformProductId(
            UUID userId, String platform, String platformProductId);

    /**
     * Find products by platform.
     */
    List<Product> findByUserIdAndPlatform(UUID userId, String platform);

    /**
     * Count products for a user.
     */
    long countByUserId(UUID userId);
}
