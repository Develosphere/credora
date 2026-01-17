"use client";

/**
 * ForecastChart component
 * Renders a time-series chart with low/mid/high scenario projections
 */

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  ComposedChart,
} from "recharts";
import type { ForecastPoint } from "@/lib/api/types";
import { formatCompactCurrency } from "@/lib/utils/formatters";

interface ForecastChartProps {
  data: ForecastPoint[];
}

export function ForecastChart({ data }: ForecastChartProps) {
  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm p-4 border border-gray-200/60 rounded-xl shadow-xl">
          <p className="font-semibold text-gray-900 mb-2">{formatDate(label)}</p>
          <div className="space-y-1.5 text-sm">
            <p className="text-emerald-600 font-medium">
              High: {formatCompactCurrency(payload[2]?.value || 0)}
            </p>
            <p className="text-primary font-medium">
              Mid: {formatCompactCurrency(payload[1]?.value || 0)}
            </p>
            <p className="text-amber-600 font-medium">
              Low: {formatCompactCurrency(payload[0]?.value || 0)}
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="glass-card rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Cash Flow Projection
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRange" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff6d06" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#ff6d06" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              stroke="#6B7280"
              fontSize={12}
            />
            <YAxis
              tickFormatter={(value) => formatCompactCurrency(value)}
              stroke="#6B7280"
              fontSize={12}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Area
              type="monotone"
              dataKey="low"
              stroke="#F59E0B"
              fill="url(#colorRange)"
              strokeWidth={2}
              name="Low Scenario"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="mid"
              stroke="#ff6d06"
              strokeWidth={3}
              name="Mid Scenario"
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="high"
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="5 5"
              name="High Scenario"
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
          <span className="text-gray-600">Conservative</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-primary"></div>
          <span className="text-gray-600">Expected</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span className="text-gray-600">Optimistic</span>
        </div>
      </div>
    </div>
  );
}
