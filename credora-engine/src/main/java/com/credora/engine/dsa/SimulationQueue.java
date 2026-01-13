package com.credora.engine.dsa;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/**
 * SimulationQueue DSA class for processing what-if simulation events.
 * Uses a Queue to process events in chronological order.
 * 
 * Time Complexity:
 * - scheduleEvent: O(log n) due to priority queue ordering
 * - processNextEvent: O(log n)
 * - runSimulation: O(n log n) where n is total events including cascades
 * 
 * Requirements: 7.6
 */
public class SimulationQueue {

    // Priority queue ordered by event timestamp (chronological order)
    private final PriorityQueue<SimulationEvent> eventQueue;

    public SimulationQueue() {
        this.eventQueue = new PriorityQueue<>(
            Comparator.comparing(SimulationEvent::getTimestamp)
        );
    }

    /**
     * Schedule an event for simulation.
     * 
     * @param event Event to schedule
     */
    public void scheduleEvent(SimulationEvent event) {
        if (event != null) {
            eventQueue.offer(event);
        }
    }

    /**
     * Schedule multiple events.
     * 
     * @param events Events to schedule
     */
    public void scheduleEvents(List<SimulationEvent> events) {
        if (events != null) {
            for (SimulationEvent event : events) {
                scheduleEvent(event);
            }
        }
    }

    /**
     * Process the next event in chronological order.
     * 
     * @return The next event, or null if queue is empty
     */
    public SimulationEvent processNextEvent() {
        return eventQueue.poll();
    }

    /**
     * Peek at the next event without removing it.
     * 
     * @return The next event, or null if queue is empty
     */
    public SimulationEvent peekNextEvent() {
        return eventQueue.peek();
    }


    /**
     * Run a complete simulation with cascading events.
     * 
     * @param scenario The scenario to simulate
     * @return Simulation result
     */
    public SimulationResult runSimulation(Scenario scenario) {
        if (scenario == null) {
            return SimulationResult.builder()
                .success(false)
                .errorMessage("Scenario cannot be null")
                .build();
        }

        // Initialize simulation state from baseline
        SimulationState state = new SimulationState(scenario.getBaseline());
        List<SimulationEvent> processedEvents = new ArrayList<>();

        // Process events in chronological order
        while (!eventQueue.isEmpty()) {
            SimulationEvent event = eventQueue.poll();
            
            // Apply event to state
            state = event.apply(state);
            processedEvents.add(event);

            // Generate and schedule cascading events
            List<SimulationEvent> cascadingEvents = event.getCascadingEvents(state);
            for (SimulationEvent cascaded : cascadingEvents) {
                eventQueue.offer(cascaded);
            }
        }

        return SimulationResult.builder()
            .success(true)
            .baseline(scenario.getBaseline())
            .projected(state.toMetrics())
            .impact(calculateImpact(scenario.getBaseline(), state.toMetrics()))
            .eventsProcessed(processedEvents.size())
            .processedEvents(processedEvents)
            .build();
    }

    /**
     * Calculate the impact between baseline and projected metrics.
     */
    private SimulationMetrics calculateImpact(SimulationMetrics baseline, SimulationMetrics projected) {
        return SimulationMetrics.builder()
            .impressions(projected.getImpressions() - baseline.getImpressions())
            .clicks(projected.getClicks() - baseline.getClicks())
            .conversions(projected.getConversions() - baseline.getConversions())
            .revenue(projected.getRevenue().subtract(baseline.getRevenue()))
            .adSpend(projected.getAdSpend().subtract(baseline.getAdSpend()))
            .profit(projected.getProfit().subtract(baseline.getProfit()))
            .cashFlow(projected.getCashFlow().subtract(baseline.getCashFlow()))
            .build();
    }

    /**
     * Check if there are pending events.
     * 
     * @return true if queue has events
     */
    public boolean hasEvents() {
        return !eventQueue.isEmpty();
    }

    /**
     * Get the number of pending events.
     * 
     * @return Event count
     */
    public int size() {
        return eventQueue.size();
    }

    /**
     * Clear all pending events.
     */
    public void clear() {
        eventQueue.clear();
    }

    /**
     * Get all events in chronological order without removing them.
     * 
     * @return List of events in order
     */
    public List<SimulationEvent> getAllEventsInOrder() {
        List<SimulationEvent> events = new ArrayList<>(eventQueue);
        events.sort(Comparator.comparing(SimulationEvent::getTimestamp));
        return events;
    }

    // ==================== Inner Classes ====================

    /**
     * Simulation event that can be processed and may trigger cascading events.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulationEvent {
        private String eventId;
        private EventType type;
        private LocalDateTime timestamp;
        private Map<String, Object> parameters;

        /**
         * Apply this event to the simulation state.
         * 
         * @param state Current state
         * @return Updated state
         */
        public SimulationState apply(SimulationState state) {
            switch (type) {
                case AD_SPEND_CHANGE:
                    return applyAdSpendChange(state);
                case PRICE_CHANGE:
                    return applyPriceChange(state);
                case INVENTORY_ORDER:
                    return applyInventoryOrder(state);
                case IMPRESSION_CHANGE:
                    return applyImpressionChange(state);
                case CLICK_CHANGE:
                    return applyClickChange(state);
                case CONVERSION_CHANGE:
                    return applyConversionChange(state);
                case REVENUE_CHANGE:
                    return applyRevenueChange(state);
                default:
                    return state;
            }
        }

        private SimulationState applyAdSpendChange(SimulationState state) {
            BigDecimal changePercent = getParameterAsBigDecimal("changePercent");
            BigDecimal multiplier = BigDecimal.ONE.add(changePercent.divide(BigDecimal.valueOf(100)));
            
            state.setAdSpend(state.getAdSpend().multiply(multiplier));
            return state;
        }

        private SimulationState applyPriceChange(SimulationState state) {
            BigDecimal changePercent = getParameterAsBigDecimal("changePercent");
            BigDecimal multiplier = BigDecimal.ONE.add(changePercent.divide(BigDecimal.valueOf(100)));
            
            state.setPrice(state.getPrice().multiply(multiplier));
            return state;
        }

        private SimulationState applyInventoryOrder(SimulationState state) {
            int units = getParameterAsInt("units");
            BigDecimal unitCost = getParameterAsBigDecimal("unitCost");
            
            state.setInventory(state.getInventory() + units);
            state.setCashFlow(state.getCashFlow().subtract(unitCost.multiply(BigDecimal.valueOf(units))));
            return state;
        }

        private SimulationState applyImpressionChange(SimulationState state) {
            BigDecimal changePercent = getParameterAsBigDecimal("changePercent");
            double multiplier = 1.0 + changePercent.doubleValue() / 100.0;
            
            state.setImpressions((long) (state.getImpressions() * multiplier));
            return state;
        }

        private SimulationState applyClickChange(SimulationState state) {
            BigDecimal changePercent = getParameterAsBigDecimal("changePercent");
            double multiplier = 1.0 + changePercent.doubleValue() / 100.0;
            
            state.setClicks((long) (state.getClicks() * multiplier));
            return state;
        }

        private SimulationState applyConversionChange(SimulationState state) {
            BigDecimal changePercent = getParameterAsBigDecimal("changePercent");
            double multiplier = 1.0 + changePercent.doubleValue() / 100.0;
            
            state.setConversions((int) (state.getConversions() * multiplier));
            return state;
        }

        private SimulationState applyRevenueChange(SimulationState state) {
            BigDecimal changePercent = getParameterAsBigDecimal("changePercent");
            BigDecimal multiplier = BigDecimal.ONE.add(changePercent.divide(BigDecimal.valueOf(100)));
            
            state.setRevenue(state.getRevenue().multiply(multiplier));
            return state;
        }

        /**
         * Get cascading events triggered by this event.
         * 
         * @param state Current state after applying this event
         * @return List of cascading events
         */
        public List<SimulationEvent> getCascadingEvents(SimulationState state) {
            List<SimulationEvent> cascading = new ArrayList<>();
            
            switch (type) {
                case AD_SPEND_CHANGE:
                    // Ad spend change cascades to impressions
                    BigDecimal adChangePercent = getParameterAsBigDecimal("changePercent");
                    cascading.add(SimulationEvent.builder()
                        .eventId(UUID.randomUUID().toString())
                        .type(EventType.IMPRESSION_CHANGE)
                        .timestamp(timestamp.plusDays(1))
                        .parameters(Map.of("changePercent", adChangePercent))
                        .build());
                    break;
                    
                case IMPRESSION_CHANGE:
                    // Impressions cascade to clicks (maintaining CTR)
                    BigDecimal impChangePercent = getParameterAsBigDecimal("changePercent");
                    cascading.add(SimulationEvent.builder()
                        .eventId(UUID.randomUUID().toString())
                        .type(EventType.CLICK_CHANGE)
                        .timestamp(timestamp.plusDays(1))
                        .parameters(Map.of("changePercent", impChangePercent))
                        .build());
                    break;
                    
                case CLICK_CHANGE:
                    // Clicks cascade to conversions (maintaining conversion rate)
                    BigDecimal clickChangePercent = getParameterAsBigDecimal("changePercent");
                    cascading.add(SimulationEvent.builder()
                        .eventId(UUID.randomUUID().toString())
                        .type(EventType.CONVERSION_CHANGE)
                        .timestamp(timestamp.plusDays(1))
                        .parameters(Map.of("changePercent", clickChangePercent))
                        .build());
                    break;
                    
                case CONVERSION_CHANGE:
                    // Conversions cascade to revenue
                    BigDecimal convChangePercent = getParameterAsBigDecimal("changePercent");
                    cascading.add(SimulationEvent.builder()
                        .eventId(UUID.randomUUID().toString())
                        .type(EventType.REVENUE_CHANGE)
                        .timestamp(timestamp.plusDays(1))
                        .parameters(Map.of("changePercent", convChangePercent))
                        .build());
                    break;
                    
                default:
                    // No cascading events
                    break;
            }
            
            return cascading;
        }

        private BigDecimal getParameterAsBigDecimal(String key) {
            Object value = parameters.get(key);
            if (value instanceof BigDecimal) {
                return (BigDecimal) value;
            } else if (value instanceof Number) {
                return BigDecimal.valueOf(((Number) value).doubleValue());
            }
            return BigDecimal.ZERO;
        }

        private int getParameterAsInt(String key) {
            Object value = parameters.get(key);
            if (value instanceof Number) {
                return ((Number) value).intValue();
            }
            return 0;
        }
    }


    /**
     * Event types for simulation.
     */
    public enum EventType {
        AD_SPEND_CHANGE,
        PRICE_CHANGE,
        INVENTORY_ORDER,
        IMPRESSION_CHANGE,
        CLICK_CHANGE,
        CONVERSION_CHANGE,
        REVENUE_CHANGE,
        CASH_FLOW_CHANGE
    }

    /**
     * Simulation state that tracks all metrics during simulation.
     */
    @Data
    @NoArgsConstructor
    public static class SimulationState {
        private long impressions;
        private long clicks;
        private int conversions;
        private BigDecimal revenue = BigDecimal.ZERO;
        private BigDecimal adSpend = BigDecimal.ZERO;
        private BigDecimal profit = BigDecimal.ZERO;
        private BigDecimal cashFlow = BigDecimal.ZERO;
        private BigDecimal price = BigDecimal.ZERO;
        private int inventory;

        public SimulationState(SimulationMetrics baseline) {
            if (baseline != null) {
                this.impressions = baseline.getImpressions();
                this.clicks = baseline.getClicks();
                this.conversions = baseline.getConversions();
                this.revenue = baseline.getRevenue() != null ? baseline.getRevenue() : BigDecimal.ZERO;
                this.adSpend = baseline.getAdSpend() != null ? baseline.getAdSpend() : BigDecimal.ZERO;
                this.profit = baseline.getProfit() != null ? baseline.getProfit() : BigDecimal.ZERO;
                this.cashFlow = baseline.getCashFlow() != null ? baseline.getCashFlow() : BigDecimal.ZERO;
                this.price = baseline.getPrice() != null ? baseline.getPrice() : BigDecimal.ZERO;
                this.inventory = baseline.getInventory();
            }
        }

        public SimulationMetrics toMetrics() {
            return SimulationMetrics.builder()
                .impressions(impressions)
                .clicks(clicks)
                .conversions(conversions)
                .revenue(revenue)
                .adSpend(adSpend)
                .profit(profit)
                .cashFlow(cashFlow)
                .price(price)
                .inventory(inventory)
                .build();
        }
    }

    /**
     * Metrics for simulation baseline and results.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulationMetrics {
        @Builder.Default
        private long impressions = 0;
        @Builder.Default
        private long clicks = 0;
        @Builder.Default
        private int conversions = 0;
        @Builder.Default
        private BigDecimal revenue = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal adSpend = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal profit = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal cashFlow = BigDecimal.ZERO;
        @Builder.Default
        private BigDecimal price = BigDecimal.ZERO;
        @Builder.Default
        private int inventory = 0;
    }

    /**
     * Scenario definition for simulation.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Scenario {
        private String scenarioId;
        private String name;
        private ScenarioType type;
        private SimulationMetrics baseline;
        private Map<String, Object> parameters;
    }

    /**
     * Scenario types.
     */
    public enum ScenarioType {
        AD_SPEND_DECREASE,
        AD_SPEND_INCREASE,
        PRICE_INCREASE,
        PRICE_DECREASE,
        INVENTORY_ORDER
    }

    /**
     * Result of a simulation run.
     */
    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SimulationResult {
        private boolean success;
        private String errorMessage;
        private SimulationMetrics baseline;
        private SimulationMetrics projected;
        private SimulationMetrics impact;
        private int eventsProcessed;
        private List<SimulationEvent> processedEvents;
    }
}
