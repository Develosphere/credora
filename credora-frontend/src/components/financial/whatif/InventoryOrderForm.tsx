"use client";

/**
 * Inventory Order Scenario Form
 * Requirements: 11.2
 */

import { useState } from "react";
import { Package, DollarSign, Play } from "lucide-react";
import type { WhatIfScenario } from "@/lib/api/types";

interface InventoryOrderFormProps {
  onSubmit: (scenario: WhatIfScenario) => void;
  isLoading?: boolean;
}

export function InventoryOrderForm({ onSubmit, isLoading = false }: InventoryOrderFormProps) {
  const [orderAmount, setOrderAmount] = useState<number>(10000);
  const [leadTimeDays, setLeadTimeDays] = useState<number>(14);
  const [paymentTerms, setPaymentTerms] = useState<"immediate" | "net30" | "net60">("net30");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      type: "INVENTORY_ORDER",
      parameters: {
        orderAmount,
        leadTimeDays,
        paymentTerms,
      },
    });
  };

  const isValid = orderAmount > 0 && leadTimeDays > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Order Amount */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Order Amount
        </label>
        <div className="relative">
          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="number"
            min="1"
            value={orderAmount}
            onChange={(e) => setOrderAmount(Number(e.target.value))}
            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Enter order amount"
          />
        </div>
        {orderAmount <= 0 && (
          <p className="mt-1 text-sm text-red-600">
            Order amount must be greater than 0
          </p>
        )}
      </div>

      {/* Lead Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Lead Time (Days)
        </label>
        <input
          type="number"
          min="1"
          max="180"
          value={leadTimeDays}
          onChange={(e) => setLeadTimeDays(Number(e.target.value))}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="Enter lead time in days"
        />
        {leadTimeDays <= 0 && (
          <p className="mt-1 text-sm text-red-600">
            Lead time must be at least 1 day
          </p>
        )}
      </div>

      {/* Payment Terms */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Payment Terms
        </label>
        <select
          value={paymentTerms}
          onChange={(e) => setPaymentTerms(e.target.value as "immediate" | "net30" | "net60")}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="immediate">Immediate Payment</option>
          <option value="net30">Net 30 Days</option>
          <option value="net60">Net 60 Days</option>
        </select>
      </div>

      {/* Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Package className="h-4 w-4" />
          <span>
            Order <strong>${orderAmount.toLocaleString()}</strong> of inventory with{" "}
            <strong>{leadTimeDays} day</strong> lead time,{" "}
            <strong>
              {paymentTerms === "immediate"
                ? "paid immediately"
                : paymentTerms === "net30"
                ? "paid in 30 days"
                : "paid in 60 days"}
            </strong>
          </span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isValid || isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isLoading ? (
          <>
            <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Running Simulation...
          </>
        ) : (
          <>
            <Play className="h-4 w-4" />
            Run Simulation
          </>
        )}
      </button>
    </form>
  );
}
