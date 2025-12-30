"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Building, Home, Monitor, Phone, ChevronRight, Check } from "lucide-react";
import { getMonthlyPrice, getYearlyPrice, isFreeEligible, PlanId } from "@/lib/pricing";

/**
 * Τιμολογιακή Πολιτική:
 * - Free: 1-7 διαμερίσματα → €0
 * - Web: €1.0/διαμέρισμα
 * - Premium: €1.8/διαμέρισμα
 * - Premium + IoT: €2.3/διαμέρισμα
 */

interface PlanCategory {
  id: PlanId;
  name: string;
  description: string;
  icon: React.ReactNode;
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
    features: [
      "Έως 7 διαμερίσματα",
      "Βασικό φύλλο κοινοχρήστων",
      "1 πολυκατοικία",
    ],
  },
  {
    id: "web",
    name: "Web",
    description: "Πλήρης πλατφόρμα χωρίς οθόνη",
    icon: <Building className="h-5 w-5" />,
    features: [
      "Απεριόριστα διαμερίσματα",
      "Ανακοινώσεις & ψηφοφορίες",
      "Αιτήματα συντήρησης",
      "Πρόσβαση ενοίκων (web/mobile)",
      "Dashboard διαχείρισης",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    description: "Web + kiosk + AI + αρχείο",
    icon: <Monitor className="h-5 w-5" />,
    highlighted: true,
    badge: "Δημοφιλές",
    features: [
      "Όλα τα Web features",
      "Kiosk display στην είσοδο",
      "Διαχείριση scenes & widgets",
      "AI παραστατικά & αυτοματισμοί",
      "Ηλεκτρονικό αρχείο",
    ],
  },
  {
    id: "premium_iot",
    name: "Premium + IoT",
    description: "Premium + Smart Heating",
    icon: <Monitor className="h-5 w-5" />,
    features: [
      "Όλα τα Premium features",
      "Smart Heating dashboard",
      "Ειδοποιήσεις βλάβης/διαρροών",
      "Στατιστικά κατανάλωσης",
      "Προβλέψεις & βελτιστοποίηση",
    ],
  },
];

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
  const [selectedPlan, setSelectedPlan] = useState<"web" | "premium" | "premium_iot">("premium");
  const [isYearly, setIsYearly] = useState(false);

  // Determine if Free tier applies
  const freeEligible = isFreeEligible(apartments);

  // Calculate prices
  const getPrice = useCallback(
    (planId: "web" | "premium" | "premium_iot"): number | null => {
      return getMonthlyPrice(planId, apartments);
    },
    [apartments]
  );

  const webPrice = getPrice("web");
  const premiumPrice = getPrice("premium");
  const premiumIotPrice = getPrice("premium_iot");

  const currentPrice =
    selectedPlan === "web"
      ? webPrice
      : selectedPlan === "premium"
      ? premiumPrice
      : premiumIotPrice;
  const yearlyPrice = currentPrice ? getYearlyPrice(currentPrice) : null; // 2 μήνες δωρεάν
  const yearlySavings = currentPrice ? currentPrice * 2 : null;

  const displayPrice = isYearly ? yearlyPrice : currentPrice;

  // Handle plan selection - navigate to signup with params
  const handleSelectPlan = () => {
    const effectivePlan = freeEligible ? "free" : selectedPlan;
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
      <div className="rounded-2xl border border-gray-200 bg-slate-900/70 p-6 backdrop-blur-sm">
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
            Τιμολόγηση ανά διαμέρισμα
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
            <span>40</span>
            <span>60+</span>
          </div>
        </div>

        {/* Free Tier Notice */}
        {freeEligible && (
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
        {!freeEligible && (
          <div className="mb-6">
            <p className="mb-3 text-sm text-slate-400">Επίλεξε πακέτο:</p>
            <div className="grid gap-3 md:grid-cols-3">
              {/* Web Option */}
              <button
                onClick={() => setSelectedPlan("web")}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  selectedPlan === "web"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-gray-200 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-slate-300" />
                  <span className="font-medium text-slate-200">Web</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Χωρίς οθόνη</p>
                <p className="mt-2 text-lg font-bold text-emerald-400">
                  €{webPrice}
                  <span className="text-xs font-normal text-slate-500">
                    /μήνα
                  </span>
                </p>
                {selectedPlan === "web" && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1">
                    <Check className="h-3 w-3 text-slate-950" />
                  </div>
                )}
              </button>

              {/* Premium Option */}
              <button
                onClick={() => setSelectedPlan("premium")}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  selectedPlan === "premium"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-gray-200 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                {/* Badge */}
                <span className="absolute -right-2 -top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-950">
                  Δημοφιλές
                </span>
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-slate-300" />
                  <span className="font-medium text-slate-200">Premium</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Web + Kiosk + AI + Αρχείο</p>
                <p className="mt-2 text-lg font-bold text-emerald-400">
                  €{premiumPrice}
                  <span className="text-xs font-normal text-slate-500">
                    /μήνα
                  </span>
                </p>
                {selectedPlan === "premium" && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1">
                    <Check className="h-3 w-3 text-slate-950" />
                  </div>
                )}
              </button>

              {/* Premium + IoT Option */}
              <button
                onClick={() => setSelectedPlan("premium_iot")}
                className={`relative rounded-xl border p-4 text-left transition-all ${
                  selectedPlan === "premium_iot"
                    ? "border-emerald-500 bg-emerald-500/10"
                    : "border-gray-200 bg-slate-800/50 hover:border-slate-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-slate-300" />
                  <span className="font-medium text-slate-200">Premium + IoT</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">Smart Heating</p>
                <p className="mt-2 text-lg font-bold text-emerald-400">
                  €{premiumIotPrice}
                  <span className="text-xs font-normal text-slate-500">
                    /μήνα
                  </span>
                </p>
                {selectedPlan === "premium_iot" && (
                  <div className="absolute -right-1 -top-1 rounded-full bg-emerald-500 p-1">
                    <Check className="h-3 w-3 text-slate-950" />
                  </div>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Billing Toggle */}
        {!freeEligible && (
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
            {freeEligible ? "Το πακέτο σου:" : "Συνολικό κόστος:"}
          </p>
          <div className="mt-2 flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-emerald-400">
              €{freeEligible ? 0 : displayPrice}
            </span>
            <span className="text-slate-500">
              /{isYearly ? "έτος" : "μήνα"}
            </span>
          </div>
          {!freeEligible && isYearly && yearlySavings && (
            <p className="mt-1 text-xs text-emerald-400">
              Εξοικονόμηση €{yearlySavings}/έτος (2 μήνες δωρεάν)
            </p>
          )}
          {!freeEligible && (
            <p className="mt-2 text-xs text-slate-500">
              {apartments} διαμερίσματα × {selectedPlan === "web" ? "Web" : selectedPlan === "premium" ? "Premium" : "Premium + IoT"}
            </p>
          )}
        </div>

        {/* CTA Button */}
        {showCTA && (
          <button
            onClick={handleSelectPlan}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/25 transition-all hover:bg-emerald-400 hover:shadow-emerald-400/30 hover:scale-[1.02]"
          >
            {freeEligible ? "Ξεκίνα δωρεάν" : "Ξεκίνα τώρα"}
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
      {!compact && selectedPlan && !freeEligible && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-slate-900/50 p-4">
          <p className="mb-3 text-sm font-medium text-slate-300">
            {selectedPlan === "premium"
              ? "Premium"
              : selectedPlan === "premium_iot"
              ? "Premium + IoT"
              : "Web"}{" "}
            περιλαμβάνει:
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
