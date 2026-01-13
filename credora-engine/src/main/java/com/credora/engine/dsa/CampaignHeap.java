package com.credora.engine.dsa;

import com.credora.engine.models.Campaign;

import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;

/**
 * CampaignHeap DSA class for ranking campaigns by effective ROAS.
 * Uses Max-heap for top performers and Min-heap for worst performers.
 * 
 * Time Complexity:
 * - add: O(log n)
 * - getTop/getBottom: O(k log n) where k is the number of results
 * 
 * Requirements: 6.2, 6.3, 6.4
 */
public class CampaignHeap {

    private final BigDecimal grossMargin;
    private final List<Campaign> campaigns;

    /**
     * Create a CampaignHeap with specified gross margin for effective ROAS calculation.
     * 
     * @param grossMargin Average gross margin (0.0 to 1.0)
     */
    public CampaignHeap(BigDecimal grossMargin) {
        this.grossMargin = grossMargin != null ? grossMargin : new BigDecimal("0.30");
        this.campaigns = new ArrayList<>();
    }

    /**
     * Add a campaign to the heap if it has sufficient data.
     * 
     * @param campaign Campaign to add
     * @return true if campaign was added (has sufficient data)
     */
    public boolean addCampaign(Campaign campaign) {
        if (campaign == null) {
            return false;
        }
        if (!campaign.hasSufficientData()) {
            return false;
        }
        campaigns.add(campaign);
        return true;
    }

    /**
     * Add multiple campaigns, filtering those with insufficient data.
     * 
     * @param campaignList List of campaigns to add
     * @return Number of campaigns actually added
     */
    public int addAllCampaigns(List<Campaign> campaignList) {
        if (campaignList == null) {
            return 0;
        }
        int added = 0;
        for (Campaign campaign : campaignList) {
            if (addCampaign(campaign)) {
                added++;
            }
        }
        return added;
    }

    /**
     * Get top N campaigns by effective ROAS (descending order).
     * 
     * @param n Number of campaigns to return
     * @return List of top campaigns sorted by effective ROAS descending
     */
    public List<Campaign> getTopCampaigns(int n) {
        if (n <= 0 || campaigns.isEmpty()) {
            return Collections.emptyList();
        }

        // Max-heap: highest effective ROAS first
        PriorityQueue<Campaign> maxHeap = new PriorityQueue<>(
            (a, b) -> b.getEffectiveRoas(grossMargin).compareTo(a.getEffectiveRoas(grossMargin))
        );
        maxHeap.addAll(campaigns);

        List<Campaign> result = new ArrayList<>();
        int count = Math.min(n, campaigns.size());
        for (int i = 0; i < count; i++) {
            result.add(maxHeap.poll());
        }
        return result;
    }

    /**
     * Get bottom N campaigns by effective ROAS (ascending order).
     * 
     * @param n Number of campaigns to return
     * @return List of bottom campaigns sorted by effective ROAS ascending
     */
    public List<Campaign> getBottomCampaigns(int n) {
        if (n <= 0 || campaigns.isEmpty()) {
            return Collections.emptyList();
        }

        // Min-heap: lowest effective ROAS first
        PriorityQueue<Campaign> minHeap = new PriorityQueue<>(
            Comparator.comparing(c -> c.getEffectiveRoas(grossMargin))
        );
        minHeap.addAll(campaigns);

        List<Campaign> result = new ArrayList<>();
        int count = Math.min(n, campaigns.size());
        for (int i = 0; i < count; i++) {
            result.add(minHeap.poll());
        }
        return result;
    }

    /**
     * Get all campaigns sorted by effective ROAS descending.
     * 
     * @return Sorted list of all campaigns
     */
    public List<Campaign> getAllSortedByRoas() {
        List<Campaign> sorted = new ArrayList<>(campaigns);
        sorted.sort((a, b) -> b.getEffectiveRoas(grossMargin).compareTo(a.getEffectiveRoas(grossMargin)));
        return sorted;
    }

    /**
     * Get campaigns above a certain effective ROAS threshold.
     * 
     * @param threshold Minimum effective ROAS
     * @return List of campaigns above threshold
     */
    public List<Campaign> getCampaignsAboveThreshold(BigDecimal threshold) {
        if (threshold == null) {
            return getAllSortedByRoas();
        }
        List<Campaign> result = new ArrayList<>();
        for (Campaign campaign : campaigns) {
            if (campaign.getEffectiveRoas(grossMargin).compareTo(threshold) >= 0) {
                result.add(campaign);
            }
        }
        result.sort((a, b) -> b.getEffectiveRoas(grossMargin).compareTo(a.getEffectiveRoas(grossMargin)));
        return result;
    }

    /**
     * Get campaigns below a certain effective ROAS threshold.
     * 
     * @param threshold Maximum effective ROAS
     * @return List of campaigns below threshold
     */
    public List<Campaign> getCampaignsBelowThreshold(BigDecimal threshold) {
        if (threshold == null) {
            return Collections.emptyList();
        }
        List<Campaign> result = new ArrayList<>();
        for (Campaign campaign : campaigns) {
            if (campaign.getEffectiveRoas(grossMargin).compareTo(threshold) < 0) {
                result.add(campaign);
            }
        }
        result.sort(Comparator.comparing(c -> c.getEffectiveRoas(grossMargin)));
        return result;
    }

    /**
     * Get the number of campaigns with sufficient data.
     * 
     * @return Count of campaigns
     */
    public int size() {
        return campaigns.size();
    }

    /**
     * Check if heap is empty.
     * 
     * @return true if no campaigns with sufficient data
     */
    public boolean isEmpty() {
        return campaigns.isEmpty();
    }

    /**
     * Clear all campaigns from the heap.
     */
    public void clear() {
        campaigns.clear();
    }

    /**
     * Get the gross margin used for effective ROAS calculation.
     * 
     * @return Gross margin
     */
    public BigDecimal getGrossMargin() {
        return grossMargin;
    }
}
