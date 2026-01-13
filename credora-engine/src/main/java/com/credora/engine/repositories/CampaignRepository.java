package com.credora.engine.repositories;

import com.credora.engine.models.Campaign;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Campaign entities.
 * 
 * Requirements: 1.1
 */
@Repository
public interface CampaignRepository extends JpaRepository<Campaign, UUID> {

    /**
     * Find all campaigns for a user.
     */
    List<Campaign> findByUserId(UUID userId);

    /**
     * Find campaign by platform campaign ID.
     */
    Optional<Campaign> findByUserIdAndPlatformAndPlatformCampaignId(
            UUID userId, String platform, String platformCampaignId);

    /**
     * Find campaigns by platform.
     */
    List<Campaign> findByUserIdAndPlatform(UUID userId, String platform);

    /**
     * Find campaigns with sufficient data for ranking.
     */
    @Query("SELECT c FROM Campaign c WHERE c.userId = :userId " +
           "AND c.impressions >= :minImpressions")
    List<Campaign> findByUserIdWithSufficientData(
            @Param("userId") UUID userId,
            @Param("minImpressions") Long minImpressions
    );

    /**
     * Find active campaigns.
     */
    List<Campaign> findByUserIdAndStatus(UUID userId, String status);

    /**
     * Count campaigns for a user.
     */
    long countByUserId(UUID userId);
}
