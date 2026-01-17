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
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Calculator className="h-7 w-7 text-credora-orange" />
          What-If Simulator
        </h1>
        <p className="text-gray-400 mt-1">
          Simulate business scenarios to make informed decisions
        </p>
      </div>

      {/* Scenario Type Selector - Requirements: 11.1 */}
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4">
          Select Scenario Type
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SCENARIO_TYPES.map((scenario) => (
            <button
              key={scenario.value}
              onClick={() => handleScenarioChange(scenario.value)}
              className={`p-5 rounded-2xl border-2 text-left transition-all duration-300 ${
                selectedScenario === scenario.value
                  ? "border-credora-orange bg-credora-orange/10 shadow-lg shadow-credora-orange/10"
                  : "border-[#333] hover:border-credora-orange/30 bg-[#1a1a1a]"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2.5 rounded-xl transition-all duration-300 ${
                    selectedScenario === scenario.value
                      ? "bg-gradient-to-br from-credora-orange to-credora-red text-white"
                      : "bg-[#282828] text-gray-400"
                  }`}
                >
                  {scenario.icon}
                </div>
                <div>
                  <h3
                    className={`font-semibold ${
                      selectedScenario === scenario.value
                        ? "text-credora-orange"
                        : "text-white"
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
      <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Configure {SCENARIO_TYPES.find((s) => s.value === selectedScenario)?.label}
        </h2>
        {renderForm()}
      </div>

      {/* Results Section - Requirements: 11.3, 11.4, 11.5 */}
      <div className="animate-slide-up">
        <h2 className="text-lg font-semibold text-white mb-4">
          Simulation Results
        </h2>
        {renderResults()}
      </div>
    </div>
  );
}
