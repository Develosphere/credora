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
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">SKU Analytics</h1>
        <p className="text-gray-500 mt-1">
          Analyze product profitability and unit economics
        </p>
      </div>

      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by SKU name or ID..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Summary Stats */}
          {data && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Package className="h-4 w-4" />
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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-800 font-medium">
                Failed to load SKU data
              </h3>
              <p className="text-red-600 text-sm mt-1">
                {error?.message || "An unexpected error occurred"}
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {data && !isLoading && !isError && (
        <SKUTable
          data={data}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          filterText={filterText}
        />
      )}
    </div>
  );
}
