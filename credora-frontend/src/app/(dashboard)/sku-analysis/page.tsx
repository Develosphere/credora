"use client";

/**
 * SKU Analytics Page
 * Displays sortable and filterable table of SKU unit economics
 */

import { useState } from "react";
import { Search, Package } from "lucide-react";
import { useSKU } from "@/lib/hooks/useSKU";
import { SKUTable, SKUTableSkeleton, type SortField, type SortDirection } from "@/components/financial/SKUTable";

export default function SKUAnalysisPage() {
  const [sortField, setSortField] = useState<SortField>("totalProfit");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [filterText, setFilterText] = useState("");

  const { data, isLoading, isError, error, refetch } = useSKU();

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">SKU Analytics</h1>
        <p className="text-gray-400 mt-1">
          Analyze product profitability and unit economics
        </p>
      </div>

      {/* Filter Controls */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search by SKU name or ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-[#282828] border border-[#333] text-white placeholder-gray-500 rounded-xl shadow-sm focus:ring-2 focus:ring-credora-orange/20 focus:border-credora-orange/50 transition-all duration-200"
            />
          </div>

          {/* Summary Stats */}
          {data && (
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-credora-orange/10 px-4 py-2 rounded-xl">
              <Package className="h-4 w-4 text-credora-orange" />
              <span>
                {data.length} SKU{data.length !== 1 ? "s" : ""} total
              </span>
            </div>
          )}
        </div>
      </div>

      {/* SKU Table Content */}
      {isLoading && <SKUTableSkeleton />}

      {isError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-400 font-semibold">
                Failed to load SKU data
              </h3>
              <p className="text-gray-400 text-sm mt-1">
                {error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-xl hover:bg-red-500/30 transition-colors duration-200 font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {data && !isLoading && !isError && (
        <div className="animate-slide-up">
          <SKUTable
            data={data}
            sortField={sortField}
            sortDirection={sortDirection}
            onSort={handleSort}
            filterText={filterText}
          />
        </div>
      )}
    </div>
  );
}
