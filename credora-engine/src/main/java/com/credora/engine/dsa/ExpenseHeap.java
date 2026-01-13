package com.credora.engine.dsa;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

/**
 * Min-Heap for ranking expenses by due date.
 * 
 * Used for cash planning to identify upcoming expenses in chronological order.
 * 
 * Time Complexity:
 * - addExpense: O(log n)
 * - getNextExpense: O(log n)
 * - getUpcomingExpenses: O(k log n) where k = count
 * - peekNextExpense: O(1)
 * 
 * Requirements: 4.4
 */
public class ExpenseHeap {

    /**
     * Expense record for the heap.
     */
    public static class Expense {
        private final String id;
        private final String description;
        private final BigDecimal amount;
        private final LocalDate dueDate;
        private final String category;
        private final boolean recurring;

        public Expense(String id, String description, BigDecimal amount, 
                       LocalDate dueDate, String category, boolean recurring) {
            this.id = id;
            this.description = description;
            this.amount = amount;
            this.dueDate = dueDate;
            this.category = category;
            this.recurring = recurring;
        }

        public String getId() { return id; }
        public String getDescription() { return description; }
        public BigDecimal getAmount() { return amount; }
        public LocalDate getDueDate() { return dueDate; }
        public String getCategory() { return category; }
        public boolean isRecurring() { return recurring; }

        @Override
        public String toString() {
            return String.format("Expense{%s, $%s, due=%s}", description, amount, dueDate);
        }
    }

    // Min-heap ordered by due date (earliest first)
    private final PriorityQueue<Expense> heap;

    public ExpenseHeap() {
        this.heap = new PriorityQueue<>(Comparator.comparing(Expense::getDueDate));
    }

    /**
     * Add an expense to the heap.
     * 
     * @param expense The expense to add
     */
    public void addExpense(Expense expense) {
        if (expense != null && expense.getDueDate() != null) {
            heap.offer(expense);
        }
    }

    /**
     * Remove and return the next (earliest) expense.
     * 
     * @return The expense with the earliest due date, or null if empty
     */
    public Expense getNextExpense() {
        return heap.poll();
    }

    /**
     * Peek at the next expense without removing it.
     * 
     * @return The expense with the earliest due date, or null if empty
     */
    public Expense peekNextExpense() {
        return heap.peek();
    }

    /**
     * Get the next N upcoming expenses without removing them.
     * 
     * @param count Number of expenses to retrieve
     * @return List of upcoming expenses in chronological order
     */
    public List<Expense> getUpcomingExpenses(int count) {
        if (count <= 0) {
            return Collections.emptyList();
        }

        List<Expense> result = new ArrayList<>();
        PriorityQueue<Expense> temp = new PriorityQueue<>(heap);
        
        for (int i = 0; i < count && !temp.isEmpty(); i++) {
            result.add(temp.poll());
        }
        
        return result;
    }

    /**
     * Get all expenses due within a date range.
     * 
     * @param startDate Start of range (inclusive)
     * @param endDate End of range (inclusive)
     * @return List of expenses in the range, ordered by due date
     */
    public List<Expense> getExpensesInRange(LocalDate startDate, LocalDate endDate) {
        return heap.stream()
                .filter(e -> !e.getDueDate().isBefore(startDate) && !e.getDueDate().isAfter(endDate))
                .sorted(Comparator.comparing(Expense::getDueDate))
                .toList();
    }

    /**
     * Calculate total expenses due within a date range.
     * 
     * @param startDate Start of range (inclusive)
     * @param endDate End of range (inclusive)
     * @return Total amount of expenses in the range
     */
    public BigDecimal getTotalInRange(LocalDate startDate, LocalDate endDate) {
        return getExpensesInRange(startDate, endDate).stream()
                .map(Expense::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    /**
     * Get expenses by category.
     * 
     * @param category The category to filter by
     * @return List of expenses in that category
     */
    public List<Expense> getByCategory(String category) {
        return heap.stream()
                .filter(e -> category.equals(e.getCategory()))
                .sorted(Comparator.comparing(Expense::getDueDate))
                .toList();
    }

    /**
     * Check if there are any overdue expenses.
     * 
     * @return true if any expense is past due
     */
    public boolean hasOverdue() {
        LocalDate today = LocalDate.now();
        return heap.stream().anyMatch(e -> e.getDueDate().isBefore(today));
    }

    /**
     * Get all overdue expenses.
     * 
     * @return List of overdue expenses
     */
    public List<Expense> getOverdueExpenses() {
        LocalDate today = LocalDate.now();
        return heap.stream()
                .filter(e -> e.getDueDate().isBefore(today))
                .sorted(Comparator.comparing(Expense::getDueDate))
                .toList();
    }

    /**
     * Get the number of expenses in the heap.
     */
    public int size() {
        return heap.size();
    }

    /**
     * Check if the heap is empty.
     */
    public boolean isEmpty() {
        return heap.isEmpty();
    }

    /**
     * Clear all expenses from the heap.
     */
    public void clear() {
        heap.clear();
    }

    /**
     * Remove a specific expense by ID.
     * 
     * @param expenseId The ID of the expense to remove
     * @return true if the expense was found and removed
     */
    public boolean removeExpense(String expenseId) {
        return heap.removeIf(e -> expenseId.equals(e.getId()));
    }
}
