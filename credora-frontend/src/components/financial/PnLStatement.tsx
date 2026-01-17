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
      className={`flex justify-between py-2.5 transition-colors duration-200 hover:bg-[#282828] rounded-lg px-2 -mx-2 ${
        isTotal
          ? "border-t-2 border-b-2 border-credora-orange font-bold text-lg bg-[#1a1a1a]"
          : isSubtotal
          ? "border-t border-[#333] font-semibold"
          : ""
      } ${indent ? "pl-6" : ""}`}
    >
      <span className={isTotal ? "text-white" : "text-gray-300"}>
        {label}
      </span>
      <span
        className={`font-mono ${
          displayValue < 0 ? "text-red-400" : "text-white"
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
    <div className="flex justify-between py-1.5 text-sm px-2 -mx-2">
      <span className="text-gray-500">{label}</span>
      <span
        className={`font-mono font-medium ${value < 0 ? "text-red-400" : "text-emerald-400"}`}
      >
        {formatPercent(value)}
      </span>
    </div>
  );
}

export function PnLStatement({ data }: PnLStatementProps) {
  return (
    <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
      <div className="space-y-1">
        {/* Revenue Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-credora-orange uppercase tracking-wide mb-3">
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
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-credora-orange uppercase tracking-wide mb-3">
            Cost of Goods Sold
          </h3>
          <LineItem label="COGS" value={data.cogs} isNegative indent />
          <LineItem label="Gross Profit" value={data.grossProfit} isSubtotal />
          <MarginDisplay label="Gross Margin" value={data.grossMargin} />
        </div>

        {/* Operating Expenses Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-credora-orange uppercase tracking-wide mb-3">
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
        <div className="pt-3">
          <LineItem label="Net Profit" value={data.netProfit} isTotal />
          <MarginDisplay label="Net Margin" value={data.netMargin} />
        </div>
      </div>
    </div>
  );
}
