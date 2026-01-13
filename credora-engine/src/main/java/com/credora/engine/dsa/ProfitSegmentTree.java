package com.credora.engine.dsa;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Segment Tree for O(log n) profit range queries over date ranges.
 * 
 * Used for efficient querying of:
 * - Total profit over any date range
 * - Average daily profit
 * - Profit trends analysis
 * 
 * Time Complexity:
 * - Build: O(n)
 * - Range Query: O(log n)
 * - Point Update: O(log n)
 * 
 * Requirements: 5.7
 */
public class ProfitSegmentTree {

    private BigDecimal[] tree;
    private int n;
    private LocalDate startDate;
    private Map<LocalDate, Integer> dateToIndex;

    /**
     * Build segment tree from daily profit data.
     * 
     * @param dailyProfits Array of daily profits (index 0 = first day)
     * @param startDate The date corresponding to index 0
     */
    public ProfitSegmentTree(BigDecimal[] dailyProfits, LocalDate startDate) {
        if (dailyProfits == null || dailyProfits.length == 0) {
            this.n = 0;
            this.tree = new BigDecimal[0];
            this.startDate = startDate;
            this.dateToIndex = new HashMap<>();
            return;
        }

        this.n = dailyProfits.length;
        this.tree = new BigDecimal[4 * n];
        this.startDate = startDate;
        this.dateToIndex = new HashMap<>();

        // Initialize tree with zeros
        Arrays.fill(tree, BigDecimal.ZERO);

        // Build date index
        for (int i = 0; i < n; i++) {
            dateToIndex.put(startDate.plusDays(i), i);
        }

        // Build the segment tree
        build(dailyProfits, 0, 0, n - 1);
    }

    /**
     * Build segment tree from a map of date to profit.
     * 
     * @param profitsByDate Map of dates to profit values
     */
    public ProfitSegmentTree(Map<LocalDate, BigDecimal> profitsByDate) {
        if (profitsByDate == null || profitsByDate.isEmpty()) {
            this.n = 0;
            this.tree = new BigDecimal[0];
            this.startDate = LocalDate.now();
            this.dateToIndex = new HashMap<>();
            return;
        }

        // Find date range
        LocalDate minDate = profitsByDate.keySet().stream().min(LocalDate::compareTo).orElse(LocalDate.now());
        LocalDate maxDate = profitsByDate.keySet().stream().max(LocalDate::compareTo).orElse(LocalDate.now());

        this.startDate = minDate;
        this.n = (int) (maxDate.toEpochDay() - minDate.toEpochDay()) + 1;
        this.tree = new BigDecimal[4 * n];
        this.dateToIndex = new HashMap<>();

        Arrays.fill(tree, BigDecimal.ZERO);

        // Build array and date index
        BigDecimal[] dailyProfits = new BigDecimal[n];
        for (int i = 0; i < n; i++) {
            LocalDate date = minDate.plusDays(i);
            dateToIndex.put(date, i);
            dailyProfits[i] = profitsByDate.getOrDefault(date, BigDecimal.ZERO);
        }

        build(dailyProfits, 0, 0, n - 1);
    }

    /**
     * Recursively build the segment tree.
     */
    private void build(BigDecimal[] arr, int node, int start, int end) {
        if (start == end) {
            tree[node] = arr[start] != null ? arr[start] : BigDecimal.ZERO;
        } else {
            int mid = (start + end) / 2;
            int leftChild = 2 * node + 1;
            int rightChild = 2 * node + 2;

            build(arr, leftChild, start, mid);
            build(arr, rightChild, mid + 1, end);

            tree[node] = tree[leftChild].add(tree[rightChild]);
        }
    }

    /**
     * Query profit sum for index range [l, r].
     * 
     * @param l Left index (inclusive)
     * @param r Right index (inclusive)
     * @return Sum of profits in range
     */
    public BigDecimal queryRange(int l, int r) {
        if (n == 0 || l > r || l < 0 || r >= n) {
            return BigDecimal.ZERO;
        }
        return query(0, 0, n - 1, l, r);
    }

    /**
     * Query profit sum for date range.
     * 
     * @param fromDate Start date (inclusive)
     * @param toDate End date (inclusive)
     * @return Sum of profits in date range
     */
    public BigDecimal queryDateRange(LocalDate fromDate, LocalDate toDate) {
        if (n == 0 || fromDate == null || toDate == null) {
            return BigDecimal.ZERO;
        }

        int l = getIndexForDate(fromDate);
        int r = getIndexForDate(toDate);

        if (l < 0) l = 0;
        if (r >= n) r = n - 1;
        if (l > r) return BigDecimal.ZERO;

        return queryRange(l, r);
    }

    /**
     * Recursive query implementation.
     */
    private BigDecimal query(int node, int start, int end, int l, int r) {
        if (r < start || end < l) {
            return BigDecimal.ZERO;
        }
        if (l <= start && end <= r) {
            return tree[node];
        }

        int mid = (start + end) / 2;
        int leftChild = 2 * node + 1;
        int rightChild = 2 * node + 2;

        BigDecimal leftSum = query(leftChild, start, mid, l, r);
        BigDecimal rightSum = query(rightChild, mid + 1, end, l, r);

        return leftSum.add(rightSum);
    }

    /**
     * Update profit for a specific index.
     * 
     * @param index Array index
     * @param newValue New profit value
     */
    public void update(int index, BigDecimal newValue) {
        if (index < 0 || index >= n) return;
        update(0, 0, n - 1, index, newValue);
    }

    /**
     * Update profit for a specific date.
     * 
     * @param date The date to update
     * @param newValue New profit value
     */
    public void updateDate(LocalDate date, BigDecimal newValue) {
        Integer index = dateToIndex.get(date);
        if (index != null) {
            update(index, newValue);
        }
    }

    /**
     * Recursive update implementation.
     */
    private void update(int node, int start, int end, int index, BigDecimal newValue) {
        if (start == end) {
            tree[node] = newValue != null ? newValue : BigDecimal.ZERO;
        } else {
            int mid = (start + end) / 2;
            int leftChild = 2 * node + 1;
            int rightChild = 2 * node + 2;

            if (index <= mid) {
                update(leftChild, start, mid, index, newValue);
            } else {
                update(rightChild, mid + 1, end, index, newValue);
            }

            tree[node] = tree[leftChild].add(tree[rightChild]);
        }
    }

    /**
     * Get total profit across all days.
     */
    public BigDecimal getTotalProfit() {
        if (n == 0) return BigDecimal.ZERO;
        return tree[0];
    }

    /**
     * Get average daily profit.
     */
    public BigDecimal getAverageDailyProfit() {
        if (n == 0) return BigDecimal.ZERO;
        return tree[0].divide(BigDecimal.valueOf(n), 2, java.math.RoundingMode.HALF_UP);
    }

    /**
     * Get average daily profit for a date range.
     */
    public BigDecimal getAverageDailyProfit(LocalDate fromDate, LocalDate toDate) {
        BigDecimal sum = queryDateRange(fromDate, toDate);
        int days = (int) (toDate.toEpochDay() - fromDate.toEpochDay()) + 1;
        if (days <= 0) return BigDecimal.ZERO;
        return sum.divide(BigDecimal.valueOf(days), 2, java.math.RoundingMode.HALF_UP);
    }

    /**
     * Get the number of days in the tree.
     */
    public int getDayCount() {
        return n;
    }

    /**
     * Get the start date.
     */
    public LocalDate getStartDate() {
        return startDate;
    }

    /**
     * Get the end date.
     */
    public LocalDate getEndDate() {
        if (n == 0) return startDate;
        return startDate.plusDays(n - 1);
    }

    /**
     * Get index for a date.
     */
    private int getIndexForDate(LocalDate date) {
        Integer index = dateToIndex.get(date);
        if (index != null) return index;
        
        // Calculate index based on date offset
        return (int) (date.toEpochDay() - startDate.toEpochDay());
    }
}
