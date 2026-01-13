"use client";

/**
 * PnLStatement component
 * Renders an accounting-style P&L statement with proper formatting
 */

import type { PnLReport } from "@/lib/api/types";
import { formatCurrency, formatPercent } from "@/lib/utils/formatters";

interface PnLStatementProps {
  data: PnLReport;
}

interface LineItemProps {
  label: string;
  value: number;
  isSubtotal?: boolean;
  isTotal?: boolean;
  isNegative?: boolean;
  indent?: boolean;
}

function LineItem({
  label,
  value,
  isSubtotal = false,
  isTotal = false,
  isNegative = false,
  indent = false,
}: LineItemProps) {
  const displayValue = isNegative ? -Math.abs(value) : value;
  
  return (
    <div
      className={`flex justify-between py-2 ${
        isTotal
          ? "border-t-2 border-b-2 border-gray-800 font-bold text-lg"
          : isSubtotal
          ? "border-t border-gray-300 font-semibold"
          : ""
      } ${indent ? "pl-4" : ""}`}
    >
      <span className={isTotal ? "text-gray-900" : "text-gray-700"}>
        {label}
      </span>
      <span
        className={`font-mono ${
          displayValue < 0 ? "text-red-600" : "text-gray-900"
        } ${isTotal ? "text-lg" : ""}`}
      >
        {isNegative && value > 0 ? "(" : ""}
        {formatCurrency(Math.abs(value))}
        {isNegative && value > 0 ? ")" : ""}
      </span>
    </div>
  );
}

interface MarginDisplayProps {
  label: string;
  value: number;
}

function MarginDisplay({ label, value }: MarginDisplayProps) {
  return (
    <div className="flex justify-between py-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span
        className={`font-mono ${value < 0 ? "text-red-600" : "text-green-600"}`}
      >
        {formatPercent(value)}
      </span>
    </div>
  );
}

export function PnLStatement({ data }: PnLStatementProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="space-y-1">
        {/* Revenue Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Revenue
          </h3>
          <LineItem label="Gross Revenue" value={data.revenue} />
          <LineItem
            label="Less: Refunds"
            value={data.refunds}
            isNegative
            indent
          />
          <LineItem label="Net Revenue" value={data.netRevenue} isSubtotal />
        </div>

        {/* Cost of Goods Sold Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Cost of Goods Sold
          </h3>
          <LineItem label="COGS" value={data.cogs} isNegative indent />
          <LineItem label="Gross Profit" value={data.grossProfit} isSubtotal />
          <MarginDisplay label="Gross Margin" value={data.grossMargin} />
        </div>

        {/* Operating Expenses Section */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
            Operating Expenses
          </h3>
          <LineItem label="Advertising Spend" value={data.adSpend} isNegative indent />
          <LineItem
            label="Other Expenses"
            value={data.otherExpenses}
            isNegative
            indent
          />
          <LineItem
            label="Total Operating Costs"
            value={data.operatingCosts}
            isSubtotal
            isNegative
          />
        </div>

        {/* Net Profit */}
        <div className="pt-2">
          <LineItem label="Net Profit" value={data.netProfit} isTotal />
          <MarginDisplay label="Net Margin" value={data.netMargin} />
        </div>
      </div>
    </div>
  );
}
