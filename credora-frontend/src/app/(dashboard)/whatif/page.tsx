"use client";

/**
 * What-If Simulator Page
 * Allows users to simulate business scenarios and see projected outcomes
 * Requirements: 11.1, 11.2, 11.3, 11.4, 11.5
 */

import { useState } from "react";
import { Calculator, TrendingUp, Package, DollarSign } from "lucide-react";
import { useWhatIf } from "@/lib/hooks/useWhatIf";
import { 
  SimulationResults, 
  SimulationResultsEmpty, 
  SimulationResultsLoading,
  SimulationResultsError 
} from "@/components/financial/SimulationResults";
import { AdSpendForm } from "@/components/financial/whatif/AdSpendForm";
import { PriceChangeForm } from "@/components/financial/whatif/PriceChangeForm";
import { InventoryOrderForm } from "@/components/financial/whatif/InventoryOrderForm";
import type { WhatIfScenarioType, WhatIfScenario } from "@/lib/api/types";

const SCENARIO_TYPES: {
  value: WhatIfScenarioType;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    value: "AD_SPEND_CHANGE",
    label: "Ad Spend Change",
    description: "Simulate increasing or decreasing your advertising budget",
    icon: <DollarSign className="h-5 w-5" />,
  },
  {
    value: "PRICE_CHANGE",
    label: "Price Change",
    description: "Simulate changing product prices and see the impact",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    value: "INVENTORY_ORDER",
    label: "Inventory Order",
    description: "Simulate ordering new inventory and its cash flow impact",
    icon: <Package className="h-5 w-5" />,
  },
];

export default function WhatIfPage() {
  const [selectedScenario, setSelectedScenario] =
    useState<WhatIfScenarioType>("AD_SPEND_CHANGE");

  const { mutate, data, isLoading, isError, error, reset, isSuccess } = useWhatIf();

  const handleSimulate = (scenario: WhatIfScenario) => {
    mutate(scenario);
  };

  const handleScenarioChange = (scenarioType: WhatIfScenarioType) => {
    setSelectedScenario(scenarioType);
    reset(); // Clear previous results when changing scenario type
  };

  const renderForm = () => {
    switch (selectedScenario) {
      case "AD_SPEND_CHANGE":
        return <AdSpendForm onSubmit={handleSimulate} isLoading={isLoading} />;
      case "PRICE_CHANGE":
        return <PriceChangeForm onSubmit={handleSimulate} isLoading={isLoading} />;
      case "INVENTORY_ORDER":
        return <InventoryOrderForm onSubmit={handleSimulate} isLoading={isLoading} />;
      default:
        return null;
    }
  };

  const renderResults = () => {
    if (isLoading) {
      return <SimulationResultsLoading />;
    }

    if (isError && error) {
      return <SimulationResultsError error={error} onRetry={reset} />;
    }

    if (isSuccess && data) {
      return <SimulationResults result={data} />;
    }

    return <SimulationResultsEmpty />;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Calculator className="h-7 w-7" />
          What-If Simulator
        </h1>
        <p className="text-gray-500 mt-1">
          Simulate business scenarios to make informed decisions
        </p>
      </div>

      {/* Scenario Type Selector - Requirements: 11.1 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <h2 className="text-sm font-medium text-gray-700 mb-3">
          Select Scenario Type
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SCENARIO_TYPES.map((scenario) => (
            <button
              key={scenario.value}
              onClick={() => handleScenarioChange(scenario.value)}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedScenario === scenario.value
                  ? "border-blue-500 bg-blue-50"
                  : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    selectedScenario === scenario.value
                      ? "bg-blue-100 text-blue-600"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {scenario.icon}
                </div>
                <div>
                  <h3
                    className={`font-medium ${
                      selectedScenario === scenario.value
                        ? "text-blue-900"
                        : "text-gray-900"
                    }`}
                  >
                    {scenario.label}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {scenario.description}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Form - Requirements: 11.2 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Configure {SCENARIO_TYPES.find((s) => s.value === selectedScenario)?.label}
        </h2>
        {renderForm()}
      </div>

      {/* Results Section - Requirements: 11.3, 11.4, 11.5 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Simulation Results
        </h2>
        {renderResults()}
      </div>
    </div>
  );
}
