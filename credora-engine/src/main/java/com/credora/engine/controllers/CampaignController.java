package com.credora.engine.controllers;

import com.credora.engine.services.CampaignService;
import com.credora.engine.services.CampaignService.CampaignPerformanceSummary;
import com.credora.engine.services.CampaignService.CampaignRankingResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * REST controller for campaign ranking and analysis.
 * 
 * Requirements: 8.1
 */
@RestController
@RequestMapping("/api/campaigns")
@RequiredArgsConstructor
@Slf4j
public class CampaignController {

    private final CampaignService campaignService;

    /**
     * Get ranked campaigns (top and bottom performers).
     * 
     * GET /api/campaigns/ranked?user_id=X&top=5&bottom=5&gross_margin=0.30
     */
    @GetMapping("/ranked")
    public ResponseEntity<RankedCampaignsResponse> getRankedCampaigns(
            @RequestParam("user_id") String userIdStr,
            @RequestParam(value = "top", defaultValue = "5") int top,
            @RequestParam(value = "bottom", defaultValue = "5") int bottom,
            @RequestParam(value = "gross_margin", required = false) BigDecimal grossMargin) {
        
        // Convert string userId to UUID (handles both UUID strings and email addresses)
        UUID userId;
        try {
            userId = UUID.fromString(userIdStr);
        } catch (IllegalArgumentException e) {
            userId = UUID.nameUUIDFromBytes(userIdStr.getBytes());
        }
        
        log.info("Getting ranked campaigns for user {} (top={}, bottom={})", userId, top, bottom);

        Map<String, List<CampaignRankingResult>> ranked = 
            campaignService.getRankedCampaigns(userId, top, bottom, grossMargin);

        RankedCampaignsResponse response = RankedCampaignsResponse.builder()
            .userId(userId)
            .topCampaigns(ranked.get("top"))
            .bottomCampaigns(ranked.get("bottom"))
            .grossMarginUsed(grossMargin != null ? grossMargin : CampaignService.DEFAULT_GROSS_MARGIN)
            .build();

        return ResponseEntity.ok(response);
    }

    /**
     * Get all campaigns sorted by effective ROAS.
     * 
     * GET /api/campaigns/all?user_id=X&gross_margin=0.30
     */
    @GetMapping("/all")
    public ResponseEntity<List<CampaignRankingResult>> getAllCampaigns(
            @RequestParam("user_id") UUID userId,
            @RequestParam(value = "gross_margin", required = false) BigDecimal grossMargin) {
        
        log.info("Getting all campaigns sorted for user {}", userId);
        List<CampaignRankingResult> campaigns = campaignService.getAllCampaignsSorted(userId, grossMargin);
        return ResponseEntity.ok(campaigns);
    }

    /**
     * Get campaigns above a performance threshold.
     * 
     * GET /api/campaigns/above-threshold?user_id=X&min_roas=1.0&gross_margin=0.30
     */
    @GetMapping("/above-threshold")
    public ResponseEntity<List<CampaignRankingResult>> getCampaignsAboveThreshold(
            @RequestParam("user_id") UUID userId,
            @RequestParam("min_roas") BigDecimal minRoas,
            @RequestParam(value = "gross_margin", required = false) BigDecimal grossMargin) {
        
        log.info("Getting campaigns above threshold {} for user {}", minRoas, userId);
        List<CampaignRankingResult> campaigns = 
            campaignService.getCampaignsAboveThreshold(userId, minRoas, grossMargin);
        return ResponseEntity.ok(campaigns);
    }

    /**
     * Get underperforming campaigns below a threshold.
     * 
     * GET /api/campaigns/underperforming?user_id=X&max_roas=0.5&gross_margin=0.30
     */
    @GetMapping("/underperforming")
    public ResponseEntity<List<CampaignRankingResult>> getUnderperformingCampaigns(
            @RequestParam("user_id") UUID userId,
            @RequestParam("max_roas") BigDecimal maxRoas,
            @RequestParam(value = "gross_margin", required = false) BigDecimal grossMargin) {
        
        log.info("Getting underperforming campaigns below {} for user {}", maxRoas, userId);
        List<CampaignRankingResult> campaigns = 
            campaignService.getUnderperformingCampaigns(userId, maxRoas, grossMargin);
        return ResponseEntity.ok(campaigns);
    }

    /**
     * Get campaign performance summary.
     * 
     * GET /api/campaigns/summary?user_id=X&gross_margin=0.30
     */
    @GetMapping("/summary")
    public ResponseEntity<CampaignPerformanceSummary> getPerformanceSummary(
            @RequestParam("user_id") UUID userId,
            @RequestParam(value = "gross_margin", required = false) BigDecimal grossMargin) {
        
        log.info("Getting performance summary for user {}", userId);
        CampaignPerformanceSummary summary = campaignService.getPerformanceSummary(userId, grossMargin);
        return ResponseEntity.ok(summary);
    }

    /**
     * Response DTO for ranked campaigns endpoint.
     */
    @lombok.Data
    @lombok.Builder
    @lombok.NoArgsConstructor
    @lombok.AllArgsConstructor
    public static class RankedCampaignsResponse {
        private UUID userId;
        private List<CampaignRankingResult> topCampaigns;
        private List<CampaignRankingResult> bottomCampaigns;
        private BigDecimal grossMarginUsed;
    }
}
