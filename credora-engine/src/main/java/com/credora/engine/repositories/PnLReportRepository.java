package com.credora.engine.repositories;

import com.credora.engine.models.PnLReport;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Repository for PnLReport entities.
 * 
 * Requirements: 1.1
 */
@Repository
public interface PnLReportRepository extends JpaRepository<PnLReport, UUID> {

    /**
     * Find P&L report for a specific date range.
     */
    Optional<PnLReport> findByUserIdAndStartDateAndEndDate(
            UUID userId, LocalDate startDate, LocalDate endDate);

    /**
     * Find all P&L reports for a user.
     */
    List<PnLReport> findByUserIdOrderByStartDateDesc(UUID userId);

    /**
     * Find P&L reports within a date range.
     */
    List<PnLReport> findByUserIdAndStartDateGreaterThanEqualAndEndDateLessThanEqual(
            UUID userId, LocalDate startDate, LocalDate endDate);

    /**
     * Delete old cached reports.
     */
    void deleteByUserIdAndStartDateAndEndDate(
            UUID userId, LocalDate startDate, LocalDate endDate);
}
