package com.credora.engine.dsa;

import com.credora.engine.dsa.SimulationQueue.*;
import net.jqwik.api.*;
import net.jqwik.api.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Property-based tests for SimulationQueue and What-If simulations.
 * 
 * **Feature: fpa-engine, Property 12: Ad Spend Simulation Cascade**
 * **Feature: fpa-engine, Property 13: Inventory Simulation Cash Flow**
 * **Feature: fpa-engine, Property 14: Simulation Event Order**
 * 
 * **Validates: Requirements 7.1, 7.3, 7.6**
 */
class SimulationQueuePropertyTest {

    @Provide
    Arbitrary<SimulationMetrics> baselineMetrics() {
        return Combinators.combine(
            Arbitraries.longs().between(1000L, 1000000L),
            Arbitraries.longs().between(100L, 100000L),
            Arbitraries.integers().between(10, 10000),
            Arbitraries.bigDecimals().between(BigDecimal.valueOf(1000), BigDecimal.valueOf(1000000)).ofScale(2),
            Arbitraries.bigDecimals().between(BigDecimal.valueOf(100), BigDecimal.valueOf(100000)).ofScale(2)
        ).as((impressions, clicks, conversions, revenue, adSpend) ->
            SimulationMetrics.builder()
                .impressions(impressions)
                .clicks(clicks)
                .conversions(conversions)
                .revenue(revenue)
                .adSpend(adSpend)
                .profit(revenue.subtract(adSpend))
                .cashFlow(revenue.subtract(adSpend))
                .build()
        );
    }

    @Provide
    Arbitrary<BigDecimal> decreasePercent() {
        return Arbitraries.bigDecimals().between(BigDecimal.valueOf(-90), BigDecimal.valueOf(-1)).ofScale(2);
    }

    @Provide
    Arbitrary<LocalDateTime> timestamp() {
        return Arbitraries.longs().between(0, 365)
            .map(days -> LocalDateTime.now().plusDays(days));
    }

    @Provide
    Arbitrary<List<LocalDateTime>> timestampList() {
        return timestamp().list().ofMinSize(2).ofMaxSize(20);
    }


    // ==================== Property 12: Ad Spend Simulation Cascade ====================

    /**
     * **Feature: fpa-engine, Property 12: Ad Spend Simulation Cascade**
     * 
     * For any "decrease ad spend by X%" simulation, the projected metrics SHALL satisfy:
     * projected_impressions ≤ baseline_impressions
     * 
     * **Validates: Requirements 7.1**
     */
    @Property(tries = 100)
    void adSpendDecreaseReducesImpressions(
            @ForAll("baselineMetrics") SimulationMetrics baseline,
            @ForAll("decreasePercent") BigDecimal decreasePercent) {
        
        SimulationQueue queue = new SimulationQueue();
        
        // Schedule ad spend decrease event
        SimulationEvent event = SimulationEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .type(EventType.AD_SPEND_CHANGE)
            .timestamp(LocalDateTime.now())
            .parameters(Map.of("changePercent", decreasePercent))
            .build();
        
        queue.scheduleEvent(event);
        
        Scenario scenario = Scenario.builder()
            .scenarioId(UUID.randomUUID().toString())
            .name("Ad Spend Decrease Test")
            .type(ScenarioType.AD_SPEND_DECREASE)
            .baseline(baseline)
            .build();
        
        SimulationResult result = queue.runSimulation(scenario);
        
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getProjected().getImpressions())
            .as("Projected impressions should be <= baseline when ad spend decreases")
            .isLessThanOrEqualTo(baseline.getImpressions());
    }

    /**
     * **Feature: fpa-engine, Property 12: Ad Spend Simulation Cascade**
     * 
     * For any "decrease ad spend by X%" simulation:
     * projected_clicks ≤ baseline_clicks
     * 
     * **Validates: Requirements 7.1**
     */
    @Property(tries = 100)
    void adSpendDecreaseReducesClicks(
            @ForAll("baselineMetrics") SimulationMetrics baseline,
            @ForAll("decreasePercent") BigDecimal decreasePercent) {
        
        SimulationQueue queue = new SimulationQueue();
        
        SimulationEvent event = SimulationEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .type(EventType.AD_SPEND_CHANGE)
            .timestamp(LocalDateTime.now())
            .parameters(Map.of("changePercent", decreasePercent))
            .build();
        
        queue.scheduleEvent(event);
        
        Scenario scenario = Scenario.builder()
            .scenarioId(UUID.randomUUID().toString())
            .baseline(baseline)
            .build();
        
        SimulationResult result = queue.runSimulation(scenario);
        
        assertThat(result.getProjected().getClicks())
            .as("Projected clicks should be <= baseline when ad spend decreases")
            .isLessThanOrEqualTo(baseline.getClicks());
    }

    /**
     * **Feature: fpa-engine, Property 12: Ad Spend Simulation Cascade**
     * 
     * For any "decrease ad spend by X%" simulation:
     * projected_conversions ≤ baseline_conversions
     * 
     * **Validates: Requirements 7.1**
     */
    @Property(tries = 100)
    void adSpendDecreaseReducesConversions(
            @ForAll("baselineMetrics") SimulationMetrics baseline,
            @ForAll("decreasePercent") BigDecimal decreasePercent) {
        
        SimulationQueue queue = new SimulationQueue();
        
        SimulationEvent event = SimulationEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .type(EventType.AD_SPEND_CHANGE)
            .timestamp(LocalDateTime.now())
            .parameters(Map.of("changePercent", decreasePercent))
            .build();
        
        queue.scheduleEvent(event);
        
        Scenario scenario = Scenario.builder()
            .scenarioId(UUID.randomUUID().toString())
            .baseline(baseline)
            .build();
        
        SimulationResult result = queue.runSimulation(scenario);
        
        assertThat(result.getProjected().getConversions())
            .as("Projected conversions should be <= baseline when ad spend decreases")
            .isLessThanOrEqualTo(baseline.getConversions());
    }

    /**
     * **Feature: fpa-engine, Property 12: Ad Spend Simulation Cascade**
     * 
     * For any "decrease ad spend by X%" simulation:
     * projected_revenue ≤ baseline_revenue
     * 
     * **Validates: Requirements 7.1**
     */
    @Property(tries = 100)
    void adSpendDecreaseReducesRevenue(
            @ForAll("baselineMetrics") SimulationMetrics baseline,
            @ForAll("decreasePercent") BigDecimal decreasePercent) {
        
        SimulationQueue queue = new SimulationQueue();
        
        SimulationEvent event = SimulationEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .type(EventType.AD_SPEND_CHANGE)
            .timestamp(LocalDateTime.now())
            .parameters(Map.of("changePercent", decreasePercent))
            .build();
        
        queue.scheduleEvent(event);
        
        Scenario scenario = Scenario.builder()
            .scenarioId(UUID.randomUUID().toString())
            .baseline(baseline)
            .build();
        
        SimulationResult result = queue.runSimulation(scenario);
        
        assertThat(result.getProjected().getRevenue())
            .as("Projected revenue should be <= baseline when ad spend decreases")
            .isLessThanOrEqualTo(baseline.getRevenue());
    }


    // ==================== Property 13: Inventory Simulation Cash Flow ====================

    /**
     * **Feature: fpa-engine, Property 13: Inventory Simulation Cash Flow**
     * 
     * For any "order X extra units" simulation:
     * cash_outflow SHALL equal X × unit_cost
     * 
     * **Validates: Requirements 7.3**
     */
    @Property(tries = 100)
    void inventoryOrderCashOutflowEqualsUnitsTimesCost(
            @ForAll @IntRange(min = 1, max = 10000) int units,
            @ForAll @BigRange(min = "1.00", max = "1000.00") BigDecimal unitCost) {
        
        SimulationQueue queue = new SimulationQueue();
        
        SimulationMetrics baseline = SimulationMetrics.builder()
            .inventory(100)
            .cashFlow(BigDecimal.valueOf(10000))
            .build();
        
        SimulationEvent event = SimulationEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .type(EventType.INVENTORY_ORDER)
            .timestamp(LocalDateTime.now())
            .parameters(Map.of("units", units, "unitCost", unitCost))
            .build();
        
        queue.scheduleEvent(event);
        
        Scenario scenario = Scenario.builder()
            .scenarioId(UUID.randomUUID().toString())
            .baseline(baseline)
            .build();
        
        SimulationResult result = queue.runSimulation(scenario);
        
        BigDecimal expectedCashOutflow = unitCost.multiply(BigDecimal.valueOf(units));
        BigDecimal actualCashChange = result.getProjected().getCashFlow().subtract(baseline.getCashFlow());
        
        assertThat(actualCashChange.negate())
            .as("Cash outflow should equal units × unit_cost")
            .isEqualByComparingTo(expectedCashOutflow);
    }

    /**
     * **Feature: fpa-engine, Property 13: Inventory Simulation Cash Flow**
     * 
     * For any "order X extra units" simulation:
     * inventory increases by exactly X units
     * 
     * **Validates: Requirements 7.3**
     */
    @Property(tries = 100)
    void inventoryOrderIncreasesInventoryByUnits(
            @ForAll @IntRange(min = 1, max = 10000) int units,
            @ForAll @IntRange(min = 0, max = 10000) int initialInventory) {
        
        SimulationQueue queue = new SimulationQueue();
        
        SimulationMetrics baseline = SimulationMetrics.builder()
            .inventory(initialInventory)
            .cashFlow(BigDecimal.valueOf(10000))
            .build();
        
        SimulationEvent event = SimulationEvent.builder()
            .eventId(UUID.randomUUID().toString())
            .type(EventType.INVENTORY_ORDER)
            .timestamp(LocalDateTime.now())
            .parameters(Map.of("units", units, "unitCost", BigDecimal.valueOf(50)))
            .build();
        
        queue.scheduleEvent(event);
        
        Scenario scenario = Scenario.builder()
            .scenarioId(UUID.randomUUID().toString())
            .baseline(baseline)
            .build();
        
        SimulationResult result = queue.runSimulation(scenario);
        
        assertThat(result.getProjected().getInventory())
            .as("Inventory should increase by exactly the ordered units")
            .isEqualTo(initialInventory + units);
    }

    // ==================== Property 14: Simulation Event Order ====================

    /**
     * **Feature: fpa-engine, Property 14: Simulation Event Order**
     * 
     * For any simulation with multiple events, events SHALL be processed
     * in chronological order (earlier timestamps before later timestamps).
     * 
     * **Validates: Requirements 7.6**
     */
    @Property(tries = 100)
    void eventsAreProcessedInChronologicalOrder(
            @ForAll("timestampList") List<LocalDateTime> timestamps) {
        
        SimulationQueue queue = new SimulationQueue();
        
        // Schedule events with random timestamps
        List<SimulationEvent> scheduledEvents = new ArrayList<>();
        for (LocalDateTime ts : timestamps) {
            SimulationEvent event = SimulationEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .type(EventType.IMPRESSION_CHANGE)
                .timestamp(ts)
                .parameters(Map.of("changePercent", BigDecimal.valueOf(1)))
                .build();
            scheduledEvents.add(event);
            queue.scheduleEvent(event);
        }
        
        // Process events and verify order
        List<LocalDateTime> processedOrder = new ArrayList<>();
        while (queue.hasEvents()) {
            SimulationEvent event = queue.processNextEvent();
            processedOrder.add(event.getTimestamp());
        }
        
        // Verify chronological order
        for (int i = 0; i < processedOrder.size() - 1; i++) {
            assertThat(processedOrder.get(i))
                .as("Event at position %d should have timestamp <= event at position %d", i, i + 1)
                .isBeforeOrEqualTo(processedOrder.get(i + 1));
        }
    }

    /**
     * **Feature: fpa-engine, Property 14: Simulation Event Order**
     * 
     * Events scheduled at the same timestamp should all be processed.
     * 
     * **Validates: Requirements 7.6**
     */
    @Property(tries = 100)
    void allEventsAtSameTimestampAreProcessed(
            @ForAll @IntRange(min = 2, max = 10) int eventCount) {
        
        SimulationQueue queue = new SimulationQueue();
        LocalDateTime sameTimestamp = LocalDateTime.now();
        
        for (int i = 0; i < eventCount; i++) {
            SimulationEvent event = SimulationEvent.builder()
                .eventId("event-" + i)
                .type(EventType.IMPRESSION_CHANGE)
                .timestamp(sameTimestamp)
                .parameters(Map.of("changePercent", BigDecimal.valueOf(1)))
                .build();
            queue.scheduleEvent(event);
        }
        
        assertThat(queue.size()).isEqualTo(eventCount);
        
        int processed = 0;
        while (queue.hasEvents()) {
            queue.processNextEvent();
            processed++;
        }
        
        assertThat(processed)
            .as("All events should be processed")
            .isEqualTo(eventCount);
    }

    /**
     * **Feature: fpa-engine, Property 14: Simulation Event Order**
     * 
     * getAllEventsInOrder returns events sorted by timestamp.
     * 
     * **Validates: Requirements 7.6**
     */
    @Property(tries = 100)
    void getAllEventsInOrderReturnsSortedEvents(
            @ForAll("timestampList") List<LocalDateTime> timestamps) {
        
        SimulationQueue queue = new SimulationQueue();
        
        for (LocalDateTime ts : timestamps) {
            SimulationEvent event = SimulationEvent.builder()
                .eventId(UUID.randomUUID().toString())
                .type(EventType.CLICK_CHANGE)
                .timestamp(ts)
                .parameters(Map.of("changePercent", BigDecimal.ZERO))
                .build();
            queue.scheduleEvent(event);
        }
        
        List<SimulationEvent> orderedEvents = queue.getAllEventsInOrder();
        
        for (int i = 0; i < orderedEvents.size() - 1; i++) {
            assertThat(orderedEvents.get(i).getTimestamp())
                .as("Events should be in chronological order")
                .isBeforeOrEqualTo(orderedEvents.get(i + 1).getTimestamp());
        }
    }

    // ==================== Additional Properties ====================

    /**
     * Simulation with null scenario returns error result.
     */
    @Property(tries = 50)
    void nullScenarioReturnsError() {
        SimulationQueue queue = new SimulationQueue();
        SimulationResult result = queue.runSimulation(null);
        
        assertThat(result.isSuccess()).isFalse();
        assertThat(result.getErrorMessage()).isNotNull();
    }

    /**
     * Empty queue simulation returns success with baseline metrics.
     */
    @Property(tries = 100)
    void emptyQueueSimulationReturnsBaseline(
            @ForAll("baselineMetrics") SimulationMetrics baseline) {
        
        SimulationQueue queue = new SimulationQueue();
        
        Scenario scenario = Scenario.builder()
            .scenarioId(UUID.randomUUID().toString())
            .baseline(baseline)
            .build();
        
        SimulationResult result = queue.runSimulation(scenario);
        
        assertThat(result.isSuccess()).isTrue();
        assertThat(result.getEventsProcessed()).isEqualTo(0);
        assertThat(result.getProjected().getImpressions()).isEqualTo(baseline.getImpressions());
    }
}
