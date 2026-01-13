package com.credora.engine.dsa;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Graph-based DSA for modeling Campaign → SKU → Profit relationships.
 * 
 * Used for:
 * - Customer Acquisition Cost (CAC) calculation via graph traversal
 * - Ad spend attribution to SKUs
 * - Profit attribution analysis
 * 
 * Graph Structure:
 * - Campaign nodes connect to SKU nodes with attributed spend edges
 * - SKU nodes connect to profit values
 * 
 * Time Complexity:
 * - addCampaignSkuLink: O(1) amortized
 * - calculateCAC: O(E) where E = edges for the SKU
 * - getAttributedSpend: O(1)
 * 
 * Requirements: 5.2, 5.6
 */
public class ProfitGraph {

    /**
     * Edge representing a relationship with a weight (spend/profit).
     */
    public static class Edge {
        private final String targetId;
        private final BigDecimal weight;
        private final int conversions;

        public Edge(String targetId, BigDecimal weight, int conversions) {
            this.targetId = targetId;
            this.weight = weight;
            this.conversions = conversions;
        }

        public String getTargetId() { return targetId; }
        public BigDecimal getWeight() { return weight; }
        public int getConversions() { return conversions; }
    }

    /**
     * Node types in the graph.
     */
    public enum NodeType {
        CAMPAIGN,
        SKU,
        PROFIT
    }

    // Adjacency list: nodeId -> list of edges
    private final Map<String, List<Edge>> adjacencyList;
    
    // Node type mapping
    private final Map<String, NodeType> nodeTypes;
    
    // Reverse index: SKU -> campaigns that target it
    private final Map<String, Set<String>> skuToCampaigns;

    public ProfitGraph() {
        this.adjacencyList = new HashMap<>();
        this.nodeTypes = new HashMap<>();
        this.skuToCampaigns = new HashMap<>();
    }

    /**
     * Add a link from a campaign to a SKU with attributed spend.
     * 
     * @param campaignId Campaign identifier
     * @param skuId SKU identifier
     * @param attributedSpend Amount of ad spend attributed to this SKU
     * @param conversions Number of conversions from this campaign to this SKU
     */
    public void addCampaignSkuLink(String campaignId, String skuId, 
                                    BigDecimal attributedSpend, int conversions) {
        if (campaignId == null || skuId == null) return;
        
        // Register node types
        nodeTypes.put(campaignId, NodeType.CAMPAIGN);
        nodeTypes.put(skuId, NodeType.SKU);
        
        // Add edge from campaign to SKU
        adjacencyList.computeIfAbsent(campaignId, k -> new ArrayList<>())
                .add(new Edge(skuId, attributedSpend, conversions));
        
        // Update reverse index
        skuToCampaigns.computeIfAbsent(skuId, k -> new HashSet<>())
                .add(campaignId);
    }

    /**
     * Add profit data for a SKU.
     * 
     * @param skuId SKU identifier
     * @param profit Total profit for this SKU
     */
    public void addSkuProfitLink(String skuId, BigDecimal profit) {
        if (skuId == null) return;
        
        nodeTypes.put(skuId, NodeType.SKU);
        String profitNodeId = "PROFIT_" + skuId;
        nodeTypes.put(profitNodeId, NodeType.PROFIT);
        
        adjacencyList.computeIfAbsent(skuId, k -> new ArrayList<>())
                .add(new Edge(profitNodeId, profit, 0));
    }

    /**
     * Calculate Customer Acquisition Cost (CAC) for a SKU.
     * CAC = Total Ad Spend Attributed to SKU / Total Conversions
     * 
     * Requirement: 5.2
     * 
     * @param skuId SKU identifier
     * @return CAC value, or ZERO if no conversions
     */
    public BigDecimal calculateCAC(String skuId) {
        if (skuId == null) return BigDecimal.ZERO;
        
        Set<String> campaigns = skuToCampaigns.get(skuId);
        if (campaigns == null || campaigns.isEmpty()) {
            return BigDecimal.ZERO;
        }
        
        BigDecimal totalAdSpend = BigDecimal.ZERO;
        int totalConversions = 0;
        
        for (String campaignId : campaigns) {
            List<Edge> edges = adjacencyList.get(campaignId);
            if (edges != null) {
                for (Edge edge : edges) {
                    if (skuId.equals(edge.getTargetId())) {
                        totalAdSpend = totalAdSpend.add(edge.getWeight());
                        totalConversions += edge.getConversions();
                    }
                }
            }
        }
        
        if (totalConversions <= 0) {
            return BigDecimal.ZERO;
        }
        
        return totalAdSpend.divide(BigDecimal.valueOf(totalConversions), 2, RoundingMode.HALF_UP);
    }

    /**
     * Get total attributed spend for a SKU from all campaigns.
     * 
     * @param skuId SKU identifier
     * @return Total attributed ad spend
     */
    public BigDecimal getTotalAttributedSpend(String skuId) {
        if (skuId == null) return BigDecimal.ZERO;
        
        Set<String> campaigns = skuToCampaigns.get(skuId);
        if (campaigns == null) return BigDecimal.ZERO;
        
        BigDecimal total = BigDecimal.ZERO;
        for (String campaignId : campaigns) {
            total = total.add(getAttributedSpend(campaignId, skuId));
        }
        return total;
    }

    /**
     * Get attributed spend from a specific campaign to a SKU.
     * 
     * @param campaignId Campaign identifier
     * @param skuId SKU identifier
     * @return Attributed spend amount
     */
    public BigDecimal getAttributedSpend(String campaignId, String skuId) {
        List<Edge> edges = adjacencyList.get(campaignId);
        if (edges == null) return BigDecimal.ZERO;
        
        return edges.stream()
                .filter(e -> skuId.equals(e.getTargetId()))
                .map(Edge::getWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Get total conversions for a SKU from all campaigns.
     * 
     * @param skuId SKU identifier
     * @return Total conversions
     */
    public int getTotalConversions(String skuId) {
        if (skuId == null) return 0;
        
        Set<String> campaigns = skuToCampaigns.get(skuId);
        if (campaigns == null) return 0;
        
        int total = 0;
        for (String campaignId : campaigns) {
            total += getConversions(campaignId, skuId);
        }
        return total;
    }

    /**
     * Get conversions from a specific campaign to a SKU.
     * 
     * @param campaignId Campaign identifier
     * @param skuId SKU identifier
     * @return Number of conversions
     */
    public int getConversions(String campaignId, String skuId) {
        List<Edge> edges = adjacencyList.get(campaignId);
        if (edges == null) return 0;
        
        return edges.stream()
                .filter(e -> skuId.equals(e.getTargetId()))
                .mapToInt(Edge::getConversions)
                .sum();
    }

    /**
     * Get all campaigns that target a specific SKU.
     * 
     * @param skuId SKU identifier
     * @return Set of campaign IDs
     */
    public Set<String> getCampaignsForSku(String skuId) {
        return skuToCampaigns.getOrDefault(skuId, Collections.emptySet());
    }

    /**
     * Get all SKUs targeted by a campaign.
     * 
     * @param campaignId Campaign identifier
     * @return Set of SKU IDs
     */
    public Set<String> getSkusForCampaign(String campaignId) {
        List<Edge> edges = adjacencyList.get(campaignId);
        if (edges == null) return Collections.emptySet();
        
        Set<String> skus = new HashSet<>();
        for (Edge edge : edges) {
            if (nodeTypes.get(edge.getTargetId()) == NodeType.SKU) {
                skus.add(edge.getTargetId());
            }
        }
        return skus;
    }

    /**
     * Get profit for a SKU.
     * 
     * @param skuId SKU identifier
     * @return Profit value or ZERO
     */
    public BigDecimal getSkuProfit(String skuId) {
        List<Edge> edges = adjacencyList.get(skuId);
        if (edges == null) return BigDecimal.ZERO;
        
        return edges.stream()
                .filter(e -> e.getTargetId().startsWith("PROFIT_"))
                .map(Edge::getWeight)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Get number of nodes in the graph.
     */
    public int getNodeCount() {
        return nodeTypes.size();
    }

    /**
     * Get number of edges in the graph.
     */
    public int getEdgeCount() {
        return adjacencyList.values().stream()
                .mapToInt(List::size)
                .sum();
    }

    /**
     * Clear the graph.
     */
    public void clear() {
        adjacencyList.clear();
        nodeTypes.clear();
        skuToCampaigns.clear();
    }
}
