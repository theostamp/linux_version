"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Building, Home, Monitor, Phone, ChevronRight, Check } from "lucide-react";

/**
 * Τιμολογιακή Πολιτική:
 * - Free: 1-7 διαμερίσματα → €0
 * - Cloud: 8-20 → €18, 21-30 → €22, 31+ → €25
 * - Kiosk: 8-20 → €28, 21-30 → €35, 31+ → €40
 */

interface PricingTier {
  minApartments: number;
  maxApartments: number | null;
  monthlyPrice: number;
}

interface PlanCategory {
  id: "free" | "cloud" | "kiosk";
  name: string;
  description: string;
  icon: React.ReactNode;
  tiers: PricingTier[];
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const PRICING_DATA: PlanCategory[] = [
  {
    id: "free",
    name: "Free",
    description: "Βασικό φύλλο κοινοχρήστων",
    icon: <Home className="h-5 w-5" />,
    tiers: [{ minApartments: 1, maxApartments: 7, monthlyPrice: 0 }],
    features: [
      "Έως 7 διαμερίσματα",
      "Βασικό φύλλο κοινοχρήστων",
      "1 πολυκατοικία",
    ],
  },
  {
    id: "cloud",
    name: "Cloud",
    description: "Πλήρης πλατφόρμα χωρίς οθόνη",
    icon: <Building className="h-5 w-5" />,
    tiers: [
      { minApartments: 8, maxApartments: 20, monthlyPrice: 18 },
      { minApartments: 21, maxApartments: 30, monthlyPrice: 22 },
      { minApartments: 31, maxApartments: null, monthlyPrice: 25 },
    ],
    features: [
      "Απεριόριστα διαμερίσματα",
      "Ανακοινώσεις & ψηφοφορίες",
      "Αιτήματα συντήρησης",
      "Πρόσβαση ενοίκων (web/mobile)",
      "Έως 5 πολυκατοικίες online",
    ],
  },
  {
    id: "kiosk",
    name: "Info Point",
    description: "Με σημείο ενημέρωσης στην είσοδο",
    icon: <Monitor className="h-5 w-5" />,
    highlighted: true,
    badge: "Δημοφιλές",
    tiers: [
      { minApartments: 8, maxApartments: 20, monthlyPrice: 28 },
      { minApartments: 21, maxApartments: 30, monthlyPrice: 35 },
      { minApartments: 31, maxApartments: null, monthlyPrice: 40 },
    ],
    features: [
      "Όλα τα Cloud features",
      "Οθόνη ενημέρωσης στην είσοδο",
      "Hardware & εγκατάσταση",
      "Ενσωματωμένο internet",
      "Τεχνική υποστήριξη 24/7",
    ],
  },
];

function getPriceForApartments(
  plan: PlanCategory,
  apartmentCount: number
): number | null {
  for (const tier of plan.tiers) {
    if (
      apartmentCount >= tier.minApartments &&
      (tier.maxApartments === null || apartmentCount <= tier.maxApartments)
    ) {
      return tier.monthlyPrice;
    }
  }
  return null;
}

function getTierLabel(apartmentCount: number): string {
  if (apartmentCount <= 7) return "1-7";
  if (apartmentCount <= 20) return "8-20";
  if (apartmentCount <= 30) return "21-30";
  return "31+";
}

interface PricingCalculatorProps {
  onSelectPlan?: (plan: string, apartments: number, price: number) => void;
  initialApartments?: number;
  showCTA?: boolean;
  compact?: boolean;
}

export function PricingCalculator({
  onSelectPlan,
  initialApartments = 15,
  showCTA = true,
  compact = false,
}: PricingCalculatorProps) {
  const [apartments, setApartments] = useState(initialApartments);
  const [selectedPlan, setSelectedPlan] = useState<"cloud" | "kiosk">("kiosk");
  const [isYearly, setIsYearly] = useState(false);

  // Determine if Free tier applies
  const isFreeEligible = apartments <= 7;

  // Calculate prices
  const getPrice = useCallback(
    (planId: "cloud" | "kiosk"): number | null => {
      if (isFreeEligible && planId === "cloud") return 0;
      const plan = PRICING_DATA.find((p) => p.id === planId);
      if (!plan) return null;
      return getPriceForApartments(plan, apartments);
    },
    [apartments, isFreeEligible]
  );

  const cloudPrice = getPrice("cloud");
  const kioskPrice = getPrice("kiosk");

  const currentPrice = selectedPlan === "cloud" ? cloudPrice : kioskPrice;
  const yearlyPrice = currentPrice ? currentPrice * 10 : null; // 2 μήνες δωρεάν
  const yearlySavings = currentPrice ? currentPrice * 2 : null;

  const displayPrice = isYearly ? yearlyPrice : currentPrice;

  // Handle plan selection - navigate to signup with params
  const handleSelectPlan = () => {
    const effectivePlan = isFreeEligible ? "free" : selectedPlan;
    const params = new URLSearchParams({
      plan: effectivePlan,
      apartments: apartments.toString(),
    });
    
    // Navigate to signup
    window.location.href = `/signup?${params.toString()}`;
    
    // Also call callback if provided
    if (onSelectPlan && currentPrice !== null) {
      onSelectPlan(effectivePlan, apartments, currentPrice);
    }
  };

  return (
    <div className={`w-full ${compact ? "" : "max-w-4xl mx-auto"}`}>
      {/* Header */}
      <div className="text-center mb-8">
        <h3 className="text-xl font-bold text-slate-50 sm:text-2xl">
          Υπολόγισε το κόστος
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          Σύρε το slider για να δεις την τιμή για την πολυκατοικία σου
        </p>
      </div>

      {/* Slider Section */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 backdrop-blur-sm">
        {/* Apartment Count Display */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 px-4 py-2">
            <Home className="h-4 w-4 text-emerald-400" />
            <span className="text-2xl font-bold text-emerald-400">
              {apartments}
            </span>
            <span className="text-sm text-slate-400">διαμερίσματα</span>
          </div>
          <p className="mt-2 text-xs text-slate-500">
            Κλίμακα: {getTierLabel(apartments)} διαμερίσματα
          </p>
        </div>

        {/* Slider */}
        <div className="mb-8 px-2">
          <input
            type="range"
            min="1"
            max="60"
            value={apartments}
            onChange={(e) => setApartments(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none
                       [&::-webkit-slider-thumb]:w-6
                       [&::-webkit-slider-thumb]:h-6
                       [&::-webkit-slider-thumb]:rounded-full
                       [&::-webkit-slider-thumb]:bg-emerald-500
                       [&::-webkit-slider-thumb]:shadow-lg
                       [&::-webkit-slider-thumb]:shadow-emerald-500/50
                       [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:transition-transform
                       [&::-webkit-slider-thumb]:hover:scale-110
                       [&::-moz-range-thumb]:w-6
                       [&::-moz-range-thumb]:h-6
                       [&::-moz-range-thumb]:rounded-full
                       [&::-moz-range-thumb]:bg-emerald-500
                       [&::-moz-range-thumb]:border-0
                       [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>1</span>
            <span>7</span>
            <span>20</span>
            <span>30</span>
            <span>60+</span>
          </div>
        </div>

        {/* Free Tier Notice */}
        {isFreeEligible && (
          <div className="mb-6 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center">
            <p className="text-sm font-medium text-emerald-400">
              🎉 Η πολυκατοικία σου χωράει στο δωρεάν πακέτο!
            </p>
            <p className="mt-1 text-xs text-slate-400">
              Έως 7 διαμερίσματα - Βασικό φύλλο κοινοχρήστων
            </p>
          </div>
        )}

        {/* Plan Selection */}
        {!isFreeEligible && (
          <div className="mb-6">
            <p className="mb-3 text-sm text-slate-400">Επίλεξε πακέτο:</p>
            <div className="grid grid-cols-2 gap-3">
              {/* Cloud Option */}
              <button
                onClick={() => setSelectedPlan("cloud")}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  selectedPlan === "cloud"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-slate-300" />
                  <span className="font-medium text-slate-200">Cloud</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Χωρίς οθόνη</p>
                <p className="mt-2 text-lg font-bold text-emerald-400">
                  €{cloudPrice}
                  <span className="text-xs font-normal text-slate-500">
                    /μήνα
                  </span>
                </p>
                {selectedPlan === "cloud" && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1">
                    <Check className="h-3 w-3 text-slate-950" />
                  </div>
                )}
              </button>

              {/* Kiosk Option */}
              <button
                onClick={() => setSelectedPlan("kiosk")}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  selectedPlan === "kiosk"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                {/* Badge */}
                <span className="absolute -right-2 -top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  Δημοφιλές
                </span>
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-slate-300" />
                  <span className="font-medium text-slate-200">Info Point</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Με οθόνη εισόδου</p>
                <p className="mt-2 text-lg font-bold text-emerald-400">
                  €{kioskPrice}
                  <span className="text-xs font-normal text-slate-500">
                    /μήνα
                  </span>
                </p>
                {selectedPlan === "kiosk" && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1">
                    <Check className="h-3 w-3 text-slate-950" />
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        {!isFreeEligible && (
          <div className="mb-6 flex items-center justify-center gap-3">
            <span
              className={`text-sm ${!isYearly ? "text-slate-200" : "text-slate-500"}`}
            >
              Μηνιαία
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isYearly ? "bg-emerald-500" : "bg-slate-700"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isYearly ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm ${isYearly ? "text-slate-200" : "text-slate-500"}`}
            >
              Ετήσια
            </span>
            {isYearly && yearlySavings && (
              <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-400">
                -€{yearlySavings}
              </span>
            )}
          </div>
        )}

        {/* Price Display */}
        <div className="rounded-xl bg-slate-950 p-6 text-center">
          <p className="text-sm text-slate-400">
            {isFreeEligible ? "Το πακέτο σου:" : "Συνολικό κόστος:"}
          </p>
          <div className="mt-2 flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-emerald-400">
              €{isFreeEligible ? 0 : displayPrice}
            </span>
            <span className="text-slate-500">
              /{isYearly ? "έτος" : "μήνα"}
            </span>
          </div>
          {!isFreeEligible && isYearly && yearlySavings && (
            <p className="mt-1 text-xs text-emerald-400">
              Εξοικονόμηση €{yearlySavings}/έτος (2 μήνες δωρεάν)
            </p>
          )}
          {!isFreeEligible && (
            <p className="mt-2 text-xs text-slate-500">
              {apartments} διαμερίσματα × {selectedPlan === "cloud" ? "Cloud" : "Info Point"}
            </p>
          )}
        </div>

        {/* CTA Button */}
        {showCTA && (
          <button
            onClick={handleSelectPlan}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30 hover:scale-[1.02]"
          >
            {isFreeEligible ? "Ξεκίνα δωρεάν" : "Ξεκίνα τώρα"}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Contact for 5+ buildings */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            Για γραφεία διαχείρισης με 5+ πολυκατοικίες:{" "}
            <a
              href="#cta"
              className="text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Επικοινωνήστε μαζί μας
            </a>
          </p>
        </div>
      </div>

      {/* Features Comparison (optional, show on full mode) */}
      {!compact && selectedPlan && !isFreeEligible && (
        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
          <p className="mb-3 text-sm font-medium text-slate-300">
            {selectedPlan === "kiosk" ? "Info Point" : "Cloud"} περιλαμβάνει:
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {PRICING_DATA.find((p) => p.id === selectedPlan)?.features.map(
              (feature) => (
                <li
                  key={feature}
                  className="flex items-center gap-2 text-xs text-slate-400"
                >
                  <Check className="h-3 w-3 text-emerald-400" />
                  {feature}
                </li>
              )
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PricingCalculator;

