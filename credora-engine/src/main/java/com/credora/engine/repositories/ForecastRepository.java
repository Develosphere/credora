package com.credora.engine.repositories;

import com.credora.engine.models.Forecast;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for Forecast entities.
 * 
 * Requirements: 1.1
 */
@Repository
public interface ForecastRepository extends JpaRepository<Forecast, UUID> {

    /**
     * Find latest forecast for a user.
     */
    Optional<Forecast> findFirstByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Find latest forecast for a user (alias).
     */
    Optional<Forecast> findTopByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Find forecast for a specific date.
     */
    Optional<Forecast> findByUserIdAndForecastDate(UUID userId, LocalDate forecastDate);

    /**
     * Find all forecasts for a user ordered by forecast date.
     */
    List<Forecast> findByUserIdOrderByForecastDateDesc(UUID userId);

    /**
     * Find all forecasts for a user ordered by creation time.
     */
    List<Forecast> findByUserIdOrderByCreatedAtDesc(UUID userId);

    /**
     * Count forecasts for a user.
     */
    long countByUserId(UUID userId);
}
