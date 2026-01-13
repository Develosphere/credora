package com.credora.engine.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.Duration;
import java.util.Map;

/**
 * Health check controller for the FP&A Engine.
 * 
 * Requirements: 8.1, 8.4
 */
@RestController
@RequestMapping("/api")
public class HealthController {

    private final Instant startTime = Instant.now();

    /**
     * Health check endpoint.
     * 
     * @return Health status with uptime
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        Duration uptime = Duration.between(startTime, Instant.now());
        
        return ResponseEntity.ok(Map.of(
            "status", "healthy",
            "service", "credora-engine",
            "version", "1.0.0",
            "uptime_seconds", uptime.getSeconds(),
            "uptime_formatted", formatDuration(uptime),
            "timestamp", Instant.now().toString()
        ));
    }

    private String formatDuration(Duration duration) {
        long hours = duration.toHours();
        long minutes = duration.toMinutesPart();
        long seconds = duration.toSecondsPart();
        return String.format("%02d:%02d:%02d", hours, minutes, seconds);
    }
}
