package com.credora.engine.services;

import com.credora.engine.dsa.CampaignHeap;
import com.credora.engine.models.Campaign;
import com.credora.engine.repositories.CampaignRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Service for campaign analysis and ranking.
 * 
 * Requirements: 6.1, 6.2, 6.3
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CampaignService {

    private final CampaignRepository campaignRepository;

    /**
     * Default gross margin if not specified (30%).
     */
    public static final BigDecimal DEFAULT_GROSS_MARGIN = new BigDecimal("0.30");

    /**
     * Get ranked campaigns for a user.
     * 
     * @param userId User ID
     * @param topN Number of top campaigns to return
     * @param bottomN Number of bottom campaigns to return
     * @param grossMargin Gross margin for effective ROAS calculation
     * @return Map with "top" and "bottom" campaign lists
     */
    public Map<String, List<CampaignRankingResult>> getRankedCampaigns(
            UUID userId, int topN, int bottomN, BigDecimal grossMargin) {
        
        if (grossMargin == null) {
            grossMargin = DEFAULT_GROSS_MARGIN;
        }

        List<Campaign> allCampaigns = campaignRepository.findByUserId(userId);
        log.info("Found {} campaigns for user {}", allCampaigns.size(), userId);

        CampaignHeap heap = new CampaignHeap(grossMargin);
        int added = heap.addAllCampaigns(allCampaigns);
        log.info("Added {} campaigns with sufficient data to heap", added);

        List<Campaign> topCampaigns = heap.getTopCampaigns(topN);
        List<Campaign> bottomCampaigns = heap.getBottomCampaigns(bottomN);

        Map<String, List<CampaignRankingResult>> result = new HashMap<>();
        result.put("top", toRankingResults(topCampaigns, grossMargin));
        result.put("bottom", toRankingResults(bottomCampaigns, grossMargin));

        return result;
    }

    /**
     * Get all campaigns sorted by effective ROAS.
     * 
     * @param userId User ID
     * @param grossMargin Gross margin for effective ROAS calculation
     * @return List of all campaigns sorted by effective ROAS descending
     */
    public List<CampaignRankingResult> getAllCampaignsSorted(UUID userId, BigDecimal grossMargin) {
        if (grossMargin == null) {
            grossMargin = DEFAULT_GROSS_MARGIN;
        }

        List<Campaign> allCampaigns = campaignRepository.findByUserId(userId);
        CampaignHeap heap = new CampaignHeap(grossMargin);
        heap.addAllCampaigns(allCampaigns);

        return toRankingResults(heap.getAllSortedByRoas(), grossMargin);
    }

    /**
     * Get campaigns above a performance threshold.
     * 
     * @param userId User ID
     * @param minEffectiveRoas Minimum effective ROAS threshold
     * @param grossMargin Gross margin for calculation
     * @return List of campaigns above threshold
     */
    public List<CampaignRankingResult> getCampaignsAboveThreshold(
            UUID userId, BigDecimal minEffectiveRoas, BigDecimal grossMargin) {
        
        if (grossMargin == null) {
            grossMargin = DEFAULT_GROSS_MARGIN;
        }

        List<Campaign> allCampaigns = campaignRepository.findByUserId(userId);
        CampaignHeap heap = new CampaignHeap(grossMargin);
        heap.addAllCampaigns(allCampaigns);

        return toRankingResults(heap.getCampaignsAboveThreshold(minEffectiveRoas), grossMargin);
    }

    /**
     * Get underperforming campaigns below a threshold.
     * 
     * @param userId User ID
     * @param maxEffectiveRoas Maximum effective ROAS threshold
     * @param grossMargin Gross margin for calculation
     * @return List of campaigns below threshold
     */
    public List<CampaignRankingResult> getUnderperformingCampaigns(
            UUID userId, BigDecimal maxEffectiveRoas, BigDecimal grossMargin) {
        
        if (grossMargin == null) {
            grossMargin = DEFAULT_GROSS_MARGIN;
        }

        List<Campaign> allCampaigns = campaignRepository.findByUserId(userId);
        CampaignHeap heap = new CampaignHeap(grossMargin);
        heap.addAllCampaigns(allCampaigns);

        return toRankingResults(heap.getCampaignsBelowThreshold(maxEffectiveRoas), grossMargin);
    }

    /**
     * Calculate effective ROAS for a campaign.
     * effective_ROAS = (revenue × gross_margin) / ad_spend
     * 
     * @param campaign Campaign to calculate for
     * @param grossMargin Gross margin (0.0 to 1.0)
     * @return Effective ROAS
     */
    public BigDecimal calculateEffectiveRoas(Campaign campaign, BigDecimal grossMargin) {
        if (campaign == null || campaign.getSpend() == null || 
            campaign.getSpend().compareTo(BigDecimal.ZERO) == 0) {
            return BigDecimal.ZERO;
        }
        if (grossMargin == null) {
            grossMargin = DEFAULT_GROSS_MARGIN;
        }
        return campaign.getEffectiveRoas(grossMargin);
    }

    /**
     * Get campaign performance summary for a user.
     * 
     * @param userId User ID
     * @param grossMargin Gross margin for calculations
     * @return Performance summary
     */
    public CampaignPerformanceSummary getPerformanceSummary(UUID userId, BigDecimal grossMargin) {
        if (grossMargin == null) {
            grossMargin = DEFAULT_GROSS_MARGIN;
        }

        List<Campaign> allCampaigns = campaignRepository.findByUserId(userId);
        
        BigDecimal totalSpend = BigDecimal.ZERO;
        BigDecimal totalRevenue = BigDecimal.ZERO;
        long totalImpressions = 0;
        long totalClicks = 0;
        int totalConversions = 0;
        int campaignsWithData = 0;

        for (Campaign campaign : allCampaigns) {
            if (campaign.hasSufficientData()) {
                campaignsWithData++;
            }
            totalSpend = totalSpend.add(campaign.getSpend() != null ? campaign.getSpend() : BigDecimal.ZERO);
            totalRevenue = totalRevenue.add(campaign.getRevenue() != null ? campaign.getRevenue() : BigDecimal.ZERO);
            totalImpressions += campaign.getImpressions() != null ? campaign.getImpressions() : 0;
            totalClicks += campaign.getClicks() != null ? campaign.getClicks() : 0;
            totalConversions += campaign.getConversions() != null ? campaign.getConversions() : 0;
        }

        BigDecimal overallRoas = totalSpend.compareTo(BigDecimal.ZERO) > 0
            ? totalRevenue.divide(totalSpend, 4, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        BigDecimal overallEffectiveRoas = totalSpend.compareTo(BigDecimal.ZERO) > 0
            ? totalRevenue.multiply(grossMargin).divide(totalSpend, 4, RoundingMode.HALF_UP)
            : BigDecimal.ZERO;

        return CampaignPerformanceSummary.builder()
            .totalCampaigns(allCampaigns.size())
            .campaignsWithSufficientData(campaignsWithData)
            .totalSpend(totalSpend)
            .totalRevenue(totalRevenue)
            .totalImpressions(totalImpressions)
            .totalClicks(totalClicks)
            .totalConversions(totalConversions)
            .overallRoas(overallRoas)
            .overallEffectiveRoas(overallEffectiveRoas)
            .grossMarginUsed(grossMargin)
            .build();
    }

    /**
     * Convert Campaign entities to ranking results.
     */
    private List<CampaignRankingResult> toRankingResults(List<Campaign> campaigns, BigDecimal grossMargin) {
        List<CampaignRankingResult> results = new ArrayList<>();
        int rank = 1;
        for (Campaign campaign : campaigns) {
            results.add(CampaignRankingResult.builder()
                .rank(rank++)
                .campaignId(campaign.getId())
                .name(campaign.getName())
                .platform(campaign.getPlatform())
                .spend(campaign.getSpend())
                .revenue(campaign.getRevenue())
                .impressions(campaign.getImpressions())
                .clicks(campaign.getClicks())
                .conversions(campaign.getConversions())
                .roas(campaign.getRoas())
                .effectiveRoas(campaign.getEffectiveRoas(grossMargin))
                .ctr(campaign.getCtr())
                .conversionRate(campaign.getConversionRate())
                .cpc(campaign.getCpc())
                .cpa(campaign.getCpa())
                .build());
        }
        return results;
    }

    /**
     * Campaign ranking result DTO.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class CampaignRankingResult {
        private int rank;
        private UUID campaignId;
        private String name;
        private String platform;
        private BigDecimal spend;
        private BigDecimal revenue;
        private Long impressions;
        private Long clicks;
        private Integer conversions;
        private BigDecimal roas;
        private BigDecimal effectiveRoas;
        private BigDecimal ctr;
        private BigDecimal conversionRate;
        private BigDecimal cpc;
        private BigDecimal cpa;
    }

    /**
     * Campaign performance summary DTO.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class CampaignPerformanceSummary {
        private int totalCampaigns;
        private int campaignsWithSufficientData;
        private BigDecimal totalSpend;
        private BigDecimal totalRevenue;
        private long totalImpressions;
        private long totalClicks;
        private int totalConversions;
        private BigDecimal overallRoas;
        private BigDecimal overallEffectiveRoas;
        private BigDecimal grossMarginUsed;
    }
}
