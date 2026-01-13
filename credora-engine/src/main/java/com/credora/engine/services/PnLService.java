package com.credora.engine.services;

import com.credora.engine.dsa.SkuCostMap;
import com.credora.engine.models.PnLReport;
import com.credora.engine.models.Product;
import com.credora.engine.models.Transaction;
import com.credora.engine.repositories.PnLReportRepository;
import com.credora.engine.repositories.ProductRepository;
import com.credora.engine.repositories.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Service for P&L (Profit & Loss) calculations.
 * 
 * Implements the core financial calculations:
 * - Revenue = sum(order_amounts)
 * - Refunds = sum(refund_amounts)
 * - Net Revenue = Revenue - Refunds
 * - COGS = sum(quantity × unit_cost) for orders
 * - Gross Profit = Net Revenue - COGS
 * - Operating Costs = Ad Spend + Other Expenses
 * - Net Profit = Gross Profit - Operating Costs
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class PnLService {

    private final TransactionRepository transactionRepository;
    private final ProductRepository productRepository;
    private final PnLReportRepository pnlReportRepository;

    /**
     * Calculate P&L for a user within a date range.
     * 
     * @param userId User UUID
     * @param startDate Start date (inclusive)
     * @param endDate End date (inclusive)
     * @return Calculated P&L report
     */
    @Transactional(readOnly = true)
    public PnLReport calculatePnL(UUID userId, LocalDate startDate, LocalDate endDate) {
        log.info("Calculating P&L for user {} from {} to {}", userId, startDate, endDate);

        // Convert dates to Instant for query
        Instant startInstant = startDate.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant endInstant = endDate.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();

        // Fetch all transactions in date range
        List<Transaction> transactions = transactionRepository.findByUserIdAndDateRange(
                userId, startInstant, endInstant);

        // Build SKU cost map from products
        SkuCostMap skuCostMap = buildSkuCostMap(userId);

        // Calculate each component
        BigDecimal revenue = calculateRevenue(transactions);
        BigDecimal refunds = calculateRefunds(transactions);
        BigDecimal cogs = skuCostMap.calculateCOGS(transactions);
        BigDecimal adSpend = calculateAdSpend(transactions);
        BigDecimal otherExpenses = calculateOtherExpenses(transactions);

        // Build and return the report with calculated derived fields
        PnLReport report = PnLReport.calculate(
                userId,
                startDate,
                endDate,
                revenue,
                refunds,
                cogs,
                adSpend,
                otherExpenses
        );

        log.info("P&L calculated: revenue={}, netProfit={}", revenue, report.getNetProfit());
        return report;
    }


    /**
     * Calculate P&L and save to database.
     */
    @Transactional
    public PnLReport calculateAndSavePnL(UUID userId, LocalDate startDate, LocalDate endDate) {
        PnLReport report = calculatePnL(userId, startDate, endDate);
        
        // Check if report already exists for this period
        Optional<PnLReport> existing = pnlReportRepository
                .findByUserIdAndStartDateAndEndDate(userId, startDate, endDate);
        
        if (existing.isPresent()) {
            // Update existing report
            PnLReport existingReport = existing.get();
            existingReport.setRevenue(report.getRevenue());
            existingReport.setRefunds(report.getRefunds());
            existingReport.setCogs(report.getCogs());
            existingReport.setAdSpend(report.getAdSpend());
            existingReport.setOtherExpenses(report.getOtherExpenses());
            existingReport.calculateDerivedFields();
            return pnlReportRepository.save(existingReport);
        }
        
        return pnlReportRepository.save(report);
    }

    /**
     * Build SKU cost map from user's products.
     */
    private SkuCostMap buildSkuCostMap(UUID userId) {
        SkuCostMap costMap = new SkuCostMap();
        List<Product> products = productRepository.findByUserId(userId);
        
        for (Product product : products) {
            if (product.getUnitCost() != null) {
                costMap.put(product.getId(), product.getUnitCost());
            }
        }
        
        log.debug("Built SKU cost map with {} products", costMap.size());
        return costMap;
    }

    /**
     * Calculate total revenue from order transactions.
     * Revenue = sum(amount_usd) for all ORDER type transactions
     * 
     * Requirement: 3.1
     */
    public BigDecimal calculateRevenue(List<Transaction> transactions) {
        return transactions.stream()
                .filter(Transaction::isRevenue)
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate total refunds.
     * Refunds = sum(amount_usd) for all REFUND type transactions
     * 
     * Requirement: 3.1
     */
    public BigDecimal calculateRefunds(List<Transaction> transactions) {
        return transactions.stream()
                .filter(Transaction::isRefund)
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate net revenue.
     * Net Revenue = Revenue - Refunds
     * 
     * Requirement: 3.1
     */
    public BigDecimal calculateNetRevenue(List<Transaction> transactions) {
        return calculateRevenue(transactions).subtract(calculateRefunds(transactions));
    }

    /**
     * Calculate COGS using the SKU cost map.
     * COGS = sum(quantity × unit_cost) for all order transactions
     * 
     * Requirement: 3.2
     */
    public BigDecimal calculateCOGS(List<Transaction> transactions, SkuCostMap skuCostMap) {
        return skuCostMap.calculateCOGS(transactions);
    }

    /**
     * Calculate gross profit.
     * Gross Profit = Net Revenue - COGS
     * 
     * Requirement: 3.3
     */
    public BigDecimal calculateGrossProfit(BigDecimal netRevenue, BigDecimal cogs) {
        return netRevenue.subtract(cogs);
    }

    /**
     * Calculate ad spend from transactions.
     * Ad Spend = sum(amount_usd) for all AD_SPEND type transactions
     * 
     * Requirement: 3.4
     */
    public BigDecimal calculateAdSpend(List<Transaction> transactions) {
        return transactions.stream()
                .filter(t -> Transaction.Types.AD_SPEND.equals(t.getType()))
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate other operating expenses.
     * Other Expenses = sum(amount_usd) for all EXPENSE type transactions
     * 
     * Requirement: 3.4
     */
    public BigDecimal calculateOtherExpenses(List<Transaction> transactions) {
        return transactions.stream()
                .filter(t -> Transaction.Types.EXPENSE.equals(t.getType()))
                .map(Transaction::getEffectiveAmountUsd)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Calculate total operating costs.
     * Operating Costs = Ad Spend + Other Expenses
     * 
     * Requirement: 3.4
     */
    public BigDecimal calculateOperatingCosts(List<Transaction> transactions) {
        return calculateAdSpend(transactions).add(calculateOtherExpenses(transactions));
    }

    /**
     * Calculate net profit.
     * Net Profit = Gross Profit - Operating Costs
     * 
     * Requirement: 3.5
     */
    public BigDecimal calculateNetProfit(BigDecimal grossProfit, BigDecimal operatingCosts) {
        return grossProfit.subtract(operatingCosts);
    }

    /**
     * Get cached P&L report if available.
     */
    @Transactional(readOnly = true)
    public Optional<PnLReport> getCachedPnL(UUID userId, LocalDate startDate, LocalDate endDate) {
        return pnlReportRepository.findByUserIdAndStartDateAndEndDate(userId, startDate, endDate);
    }

    /**
     * Get all P&L reports for a user.
     */
    @Transactional(readOnly = true)
    public List<PnLReport> getPnLHistory(UUID userId) {
        return pnlReportRepository.findByUserIdOrderByStartDateDesc(userId);
    }
}
