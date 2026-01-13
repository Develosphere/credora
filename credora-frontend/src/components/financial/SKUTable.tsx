"use client";

/**
 * SKUTable component
 * Displays sortable table with expandable rows for SKU profitability breakdown
 */

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, ChevronRight, ArrowUpDown } from "lucide-react";
import type { SKUAnalysis } from "@/lib/api/types";
import { formatCurrency, formatPercent, formatROAS, formatDays } from "@/lib/utils/formatters";

export type SortField = keyof Pick<
  SKUAnalysis,
  "name" | "profitPerUnit" | "refundRate" | "trueRoas" | "inventoryDays" | "totalRevenue" | "totalProfit"
>;

export type SortDirection = "asc" | "desc";

export interface SKUTableProps {
  data: SKUAnalysis[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSort: (field: SortField) => void;
  filterText: string;
}

interface ColumnConfig {
  field: SortField;
  label: string;
  format: (value: number | string) => string;
  align: "left" | "right";
}

const columns: ColumnConfig[] = [
  { field: "name", label: "SKU Name", format: (v) => String(v), align: "left" },
  { field: "profitPerUnit", label: "Profit/Unit", format: (v) => formatCurrency(Number(v)), align: "right" },
  { field: "refundRate", label: "Refund Rate", format: (v) => formatPercent(Number(v)), align: "right" },
  { field: "trueRoas", label: "True ROAS", format: (v) => formatROAS(Number(v)), align: "right" },
  { field: "inventoryDays", label: "Inventory Days", format: (v) => formatDays(Number(v)), align: "right" },
  { field: "totalRevenue", label: "Total Revenue", format: (v) => formatCurrency(Number(v)), align: "right" },
  { field: "totalProfit", label: "Total Profit", format: (v) => formatCurrency(Number(v)), align: "right" },
];

/**
 * Sort SKU data by field and direction
 */
export function sortSKUData(
  data: SKUAnalysis[],
  field: SortField,
  direction: SortDirection
): SKUAnalysis[] {
  return [...data].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (typeof aVal === "string" && typeof bVal === "string") {
      const comparison = aVal.localeCompare(bVal);
      return direction === "asc" ? comparison : -comparison;
    }

    const aNum = Number(aVal);
    const bNum = Number(bVal);
    return direction === "asc" ? aNum - bNum : bNum - aNum;
  });
}

/**
 * Filter SKU data by text search
 */
export function filterSKUData(data: SKUAnalysis[], filterText: string): SKUAnalysis[] {
  if (!filterText.trim()) return data;
  const searchLower = filterText.toLowerCase().trim();
  return data.filter(
    (sku) =>
      sku.name.toLowerCase().includes(searchLower) ||
      sku.skuId.toLowerCase().includes(searchLower)
  );
}

function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) {
  if (field !== currentField) {
    return <ArrowUpDown className="h-4 w-4 text-gray-400" />;
  }
  return direction === "asc" ? (
    <ChevronUp className="h-4 w-4 text-blue-600" />
  ) : (
    <ChevronDown className="h-4 w-4 text-blue-600" />
  );
}

interface ExpandedRowProps {
  sku: SKUAnalysis;
}

function ExpandedRow({ sku }: ExpandedRowProps) {
  return (
    <tr className="bg-gray-50">
      <td colSpan={8} className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500">SKU ID:</span>
            <span className="ml-2 font-mono text-gray-900">{sku.skuId}</span>
          </div>
          <div>
            <span className="text-gray-500">CAC:</span>
            <span className="ml-2 font-medium text-gray-900">{formatCurrency(sku.cac)}</span>
          </div>
          <div>
            <span className="text-gray-500">Profit per Unit:</span>
            <span className={`ml-2 font-medium ${sku.profitPerUnit >= 0 ? "text-green-600" : "text-red-600"}`}>
              {formatCurrency(sku.profitPerUnit)}
            </span>
          </div>
          <div>
            <span className="text-gray-500">Inventory Days:</span>
            <span className="ml-2 font-medium text-gray-900">{formatDays(sku.inventoryDays)}</span>
          </div>
        </div>
        <div className="mt-4 p-3 bg-white rounded border border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Profitability Breakdown</h4>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Revenue:</span>
              <span className="font-mono">{formatCurrency(sku.totalRevenue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Refund Rate:</span>
              <span className="font-mono">{formatPercent(sku.refundRate)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Net Profit:</span>
              <span className={`font-mono ${sku.totalProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(sku.totalProfit)}
              </span>
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

export function SKUTable({ data, sortField, sortDirection, onSort, filterText }: SKUTableProps) {
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Apply filtering and sorting
  const processedData = useMemo(() => {
    const filtered = filterSKUData(data, filterText);
    return sortSKUData(filtered, sortField, sortDirection);
  }, [data, filterText, sortField, sortDirection]);

  const toggleRow = (skuId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(skuId)) {
        next.delete(skuId);
      } else {
        next.add(skuId);
      }
      return next;
    });
  };

  if (processedData.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <p className="text-gray-500">
          {filterText ? "No SKUs match your filter criteria" : "No SKU data available"}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3"></th>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                  onClick={() => onSort(col.field)}
                >
                  <div className={`flex items-center gap-1 ${col.align === "right" ? "justify-end" : ""}`}>
                    <span>{col.label}</span>
                    <SortIcon field={col.field} currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {processedData.map((sku) => {
              const isExpanded = expandedRows.has(sku.skuId);
              return (
                <>
                  <tr
                    key={sku.skuId}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => toggleRow(sku.skuId)}
                  >
                    <td className="px-3 py-4">
                      <ChevronRight
                        className={`h-4 w-4 text-gray-400 transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      />
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.field}
                        className={`px-6 py-4 whitespace-nowrap text-sm ${
                          col.align === "right" ? "text-right font-mono" : "text-left"
                        } ${
                          col.field === "name" ? "font-medium text-gray-900" : "text-gray-700"
                        } ${
                          col.field === "totalProfit" && sku.totalProfit < 0 ? "text-red-600" : ""
                        } ${
                          col.field === "totalProfit" && sku.totalProfit >= 0 ? "text-green-600" : ""
                        }`}
                      >
                        {col.format(sku[col.field])}
                      </td>
                    ))}
                  </tr>
                  {isExpanded && <ExpandedRow key={`${sku.skuId}-expanded`} sku={sku} />}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for SKU table
 */
export function SKUTableSkeleton() {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="w-10 px-3 py-3"></th>
              {columns.map((col) => (
                <th
                  key={col.field}
                  className={`px-6 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    col.align === "right" ? "text-right" : "text-left"
                  }`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                <td className="px-3 py-4">
                  <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                </td>
                {columns.map((col) => (
                  <td key={col.field} className="px-6 py-4">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-20" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
