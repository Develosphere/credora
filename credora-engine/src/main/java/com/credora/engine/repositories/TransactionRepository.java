package com.credora.engine.repositories;

import com.credora.engine.models.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Repository for Transaction entities.
 * 
 * Requirements: 1.1
 */
@Repository
public interface TransactionRepository extends JpaRepository<Transaction, UUID> {

    /**
     * Find all transactions for a user within a date range.
     */
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId " +
           "AND t.occurredAt >= :startDate AND t.occurredAt <= :endDate " +
           "ORDER BY t.occurredAt")
    List<Transaction> findByUserIdAndDateRange(
            @Param("userId") UUID userId,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );

    /**
     * Find transactions by type for a user within a date range.
     */
    @Query("SELECT t FROM Transaction t WHERE t.userId = :userId " +
           "AND t.type = :type " +
           "AND t.occurredAt >= :startDate AND t.occurredAt <= :endDate")
    List<Transaction> findByUserIdAndTypeAndDateRange(
            @Param("userId") UUID userId,
            @Param("type") String type,
            @Param("startDate") Instant startDate,
            @Param("endDate") Instant endDate
    );

    /**
     * Find all transactions for a user.
     */
    List<Transaction> findByUserIdOrderByOccurredAtDesc(UUID userId);

    /**
     * Find transactions by product.
     */
    List<Transaction> findByProductId(UUID productId);

    /**
     * Find transactions by campaign.
     */
    List<Transaction> findByCampaignId(UUID campaignId);

    /**
     * Count transactions for a user.
     */
    long countByUserId(UUID userId);
}
