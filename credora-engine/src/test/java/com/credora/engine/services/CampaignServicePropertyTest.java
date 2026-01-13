package com.credora.engine.services;

import com.credora.engine.dsa.CampaignHeap;
import com.credora.engine.models.Campaign;
import net.jqwik.api.*;
import net.jqwik.api.constraints.*;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based tests for Campaign ranking.
 * 
 * **Feature: fpa-engine, Property 11: Campaign Ranking Order**
 * 
 * For any set of campaigns with sufficient data (≥100 impressions),
 * getTopCampaigns(n) SHALL return campaigns in descending effective_ROAS order,
 * and getBottomCampaigns(n) SHALL return campaigns in ascending effective_ROAS order.
 * 
 * **Validates: Requirements 6.2, 6.3**
 */
class CampaignServicePropertyTest {

    private static final BigDecimal DEFAULT_GROSS_MARGIN = new BigDecimal("0.30");

    @Provide
    Arbitrary<Campaign> campaignWithSufficientData() {
        return Combinators.combine(
            Arbitraries.bigDecimals().between(BigDecimal.valueOf(100), BigDecimal.valueOf(100000)).ofScale(2),
            Arbitraries.bigDecimals().between(BigDecimal.valueOf(0), BigDecimal.valueOf(500000)).ofScale(2),
            Arbitraries.longs().between(100L, 1000000L),
            Arbitraries.longs().between(0L, 100000L),
            Arbitraries.integers().between(0, 10000)
        ).as((spend, revenue, impressions, clicks, conversions) -> 
            Campaign.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .platform("test")
                .name("Campaign-" + UUID.randomUUID().toString().substring(0, 8))
                .spend(spend)
                .revenue(revenue)
                .impressions(impressions)
                .clicks(clicks)
                .conversions(conversions)
                .build()
        );
    }

    @Provide
    Arbitrary<Campaign> campaignWithInsufficientData() {
        return Combinators.combine(
            Arbitraries.bigDecimals().between(BigDecimal.valueOf(10), BigDecimal.valueOf(10000)).ofScale(2),
            Arbitraries.bigDecimals().between(BigDecimal.valueOf(0), BigDecimal.valueOf(50000)).ofScale(2),
            Arbitraries.longs().between(0L, 99L),
            Arbitraries.longs().between(0L, 50L),
            Arbitraries.integers().between(0, 100)
        ).as((spend, revenue, impressions, clicks, conversions) -> 
            Campaign.builder()
                .id(UUID.randomUUID())
                .userId(UUID.randomUUID())
                .platform("test")
                .name("LowData-" + UUID.randomUUID().toString().substring(0, 8))
                .spend(spend)
                .revenue(revenue)
                .impressions(impressions)
                .clicks(clicks)
                .conversions(conversions)
                .build()
        );
    }

    @Provide
    Arbitrary<List<Campaign>> campaignListWithSufficientData() {
        return campaignWithSufficientData().list().ofMinSize(1).ofMaxSize(50);
    }

    @Provide
    Arbitrary<BigDecimal> grossMargin() {
        return Arbitraries.bigDecimals().between(BigDecimal.valueOf(0.1), BigDecimal.valueOf(0.9)).ofScale(2);
    }


    /**
     * **Feature: fpa-engine, Property 11: Campaign Ranking Order**
     * 
     * Property: getTopCampaigns returns campaigns in descending effective_ROAS order.
     * 
     * **Validates: Requirements 6.2**
     */
    @Property(tries = 100)
    void topCampaignsAreInDescendingEffectiveRoasOrder(
            @ForAll("campaignListWithSufficientData") List<Campaign> campaigns,
            @ForAll("grossMargin") BigDecimal margin,
            @ForAll @IntRange(min = 1, max = 20) int n) {
        
        CampaignHeap heap = new CampaignHeap(margin);
        heap.addAllCampaigns(campaigns);
        
        List<Campaign> topCampaigns = heap.getTopCampaigns(n);
        
        // Verify descending order by effective ROAS
        for (int i = 0; i < topCampaigns.size() - 1; i++) {
            BigDecimal currentRoas = topCampaigns.get(i).getEffectiveRoas(margin);
            BigDecimal nextRoas = topCampaigns.get(i + 1).getEffectiveRoas(margin);
            
            assertThat(currentRoas)
                .as("Campaign at position %d should have effective ROAS >= campaign at position %d", i, i + 1)
                .isGreaterThanOrEqualTo(nextRoas);
        }
    }

    /**
     * **Feature: fpa-engine, Property 11: Campaign Ranking Order**
     * 
     * Property: getBottomCampaigns returns campaigns in ascending effective_ROAS order.
     * 
     * **Validates: Requirements 6.3**
     */
    @Property(tries = 100)
    void bottomCampaignsAreInAscendingEffectiveRoasOrder(
            @ForAll("campaignListWithSufficientData") List<Campaign> campaigns,
            @ForAll("grossMargin") BigDecimal margin,
            @ForAll @IntRange(min = 1, max = 20) int n) {
        
        CampaignHeap heap = new CampaignHeap(margin);
        heap.addAllCampaigns(campaigns);
        
        List<Campaign> bottomCampaigns = heap.getBottomCampaigns(n);
        
        // Verify ascending order by effective ROAS
        for (int i = 0; i < bottomCampaigns.size() - 1; i++) {
            BigDecimal currentRoas = bottomCampaigns.get(i).getEffectiveRoas(margin);
            BigDecimal nextRoas = bottomCampaigns.get(i + 1).getEffectiveRoas(margin);
            
            assertThat(currentRoas)
                .as("Campaign at position %d should have effective ROAS <= campaign at position %d", i, i + 1)
                .isLessThanOrEqualTo(nextRoas);
        }
    }

    /**
     * **Feature: fpa-engine, Property 11: Campaign Ranking Order**
     * 
     * Property: Campaigns with insufficient data (<100 impressions) are filtered out.
     * 
     * **Validates: Requirements 6.4**
     */
    @Property(tries = 100)
    void campaignsWithInsufficientDataAreFiltered(
            @ForAll("campaignWithSufficientData") Campaign sufficientCampaign,
            @ForAll("campaignWithInsufficientData") Campaign insufficientCampaign) {
        
        CampaignHeap heap = new CampaignHeap(DEFAULT_GROSS_MARGIN);
        
        boolean addedSufficient = heap.addCampaign(sufficientCampaign);
        boolean addedInsufficient = heap.addCampaign(insufficientCampaign);
        
        assertThat(addedSufficient)
            .as("Campaign with sufficient data should be added")
            .isTrue();
        assertThat(addedInsufficient)
            .as("Campaign with insufficient data should NOT be added")
            .isFalse();
        assertThat(heap.size())
            .as("Heap should only contain the campaign with sufficient data")
            .isEqualTo(1);
    }

    /**
     * **Feature: fpa-engine, Property 11: Campaign Ranking Order**
     * 
     * Property: Top campaigns are the highest effective ROAS campaigns from the set.
     * 
     * **Validates: Requirements 6.2**
     */
    @Property(tries = 100)
    void topCampaignsContainHighestEffectiveRoas(
            @ForAll("campaignListWithSufficientData") List<Campaign> campaigns,
            @ForAll("grossMargin") BigDecimal margin) {
        
        CampaignHeap heap = new CampaignHeap(margin);
        heap.addAllCampaigns(campaigns);
        
        int n = Math.min(3, campaigns.size());
        List<Campaign> topCampaigns = heap.getTopCampaigns(n);
        
        if (topCampaigns.isEmpty()) {
            return;
        }
        
        // Get the minimum effective ROAS from top campaigns
        BigDecimal minTopRoas = topCampaigns.stream()
            .map(c -> c.getEffectiveRoas(margin))
            .min(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO);
        
        // All campaigns NOT in top should have effective ROAS <= minTopRoas
        Set<UUID> topIds = new HashSet<>();
        for (Campaign c : topCampaigns) {
            topIds.add(c.getId());
        }
        
        for (Campaign campaign : campaigns) {
            if (!topIds.contains(campaign.getId()) && campaign.hasSufficientData()) {
                assertThat(campaign.getEffectiveRoas(margin))
                    .as("Non-top campaign should have effective ROAS <= minimum of top campaigns")
                    .isLessThanOrEqualTo(minTopRoas);
            }
        }
    }

    /**
     * **Feature: fpa-engine, Property 11: Campaign Ranking Order**
     * 
     * Property: Bottom campaigns are the lowest effective ROAS campaigns from the set.
     * 
     * **Validates: Requirements 6.3**
     */
    @Property(tries = 100)
    void bottomCampaignsContainLowestEffectiveRoas(
            @ForAll("campaignListWithSufficientData") List<Campaign> campaigns,
            @ForAll("grossMargin") BigDecimal margin) {
        
        CampaignHeap heap = new CampaignHeap(margin);
        heap.addAllCampaigns(campaigns);
        
        int n = Math.min(3, campaigns.size());
        List<Campaign> bottomCampaigns = heap.getBottomCampaigns(n);
        
        if (bottomCampaigns.isEmpty()) {
            return;
        }
        
        // Get the maximum effective ROAS from bottom campaigns
        BigDecimal maxBottomRoas = bottomCampaigns.stream()
            .map(c -> c.getEffectiveRoas(margin))
            .max(BigDecimal::compareTo)
            .orElse(BigDecimal.ZERO);
        
        // All campaigns NOT in bottom should have effective ROAS >= maxBottomRoas
        Set<UUID> bottomIds = new HashSet<>();
        for (Campaign c : bottomCampaigns) {
            bottomIds.add(c.getId());
        }
        
        for (Campaign campaign : campaigns) {
            if (!bottomIds.contains(campaign.getId()) && campaign.hasSufficientData()) {
                assertThat(campaign.getEffectiveRoas(margin))
                    .as("Non-bottom campaign should have effective ROAS >= maximum of bottom campaigns")
                    .isGreaterThanOrEqualTo(maxBottomRoas);
            }
        }
    }

    /**
     * **Feature: fpa-engine, Property 11: Campaign Ranking Order**
     * 
     * Property: Requesting more campaigns than available returns all available campaigns.
     * 
     * **Validates: Requirements 6.2, 6.3**
     */
    @Property(tries = 100)
    void requestingMoreThanAvailableReturnsAll(
            @ForAll("campaignListWithSufficientData") List<Campaign> campaigns,
            @ForAll("grossMargin") BigDecimal margin) {
        
        CampaignHeap heap = new CampaignHeap(margin);
        int added = heap.addAllCampaigns(campaigns);
        
        // Request more than available
        int requestedCount = added + 10;
        
        List<Campaign> topCampaigns = heap.getTopCampaigns(requestedCount);
        List<Campaign> bottomCampaigns = heap.getBottomCampaigns(requestedCount);
        
        assertThat(topCampaigns.size())
            .as("Top campaigns should return all available when requesting more")
            .isEqualTo(added);
        assertThat(bottomCampaigns.size())
            .as("Bottom campaigns should return all available when requesting more")
            .isEqualTo(added);
    }

    /**
     * **Feature: fpa-engine, Property 11: Campaign Ranking Order**
     * 
     * Property: Empty heap returns empty lists.
     * 
     * **Validates: Requirements 6.2, 6.3**
     */
    @Property(tries = 50)
    void emptyHeapReturnsEmptyLists(
            @ForAll("grossMargin") BigDecimal margin,
            @ForAll @IntRange(min = 1, max = 10) int n) {
        
        CampaignHeap heap = new CampaignHeap(margin);
        
        assertThat(heap.getTopCampaigns(n)).isEmpty();
        assertThat(heap.getBottomCampaigns(n)).isEmpty();
        assertThat(heap.isEmpty()).isTrue();
    }
}
