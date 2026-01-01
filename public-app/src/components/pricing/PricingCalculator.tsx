"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  const minApartments = 4;
  const maxApartments = 60;
  const [apartments, setApartments] = useState(initialApartments);
  const [selectedPlan, setSelectedPlan] = useState<"web" | "premium" | "premium_iot">("premium");
  const [isYearly, setIsYearly] = useState(false);
  const sliderRef = useRef<HTMLInputElement>(null);
  const [sliderBubbleLeft, setSliderBubbleLeft] = useState(0);
  const [sliderWidth, setSliderWidth] = useState(0);
  const sliderThumbSize = 24;

  const updateSliderBubble = useCallback(() => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const percent = (apartments - minApartments) / (maxApartments - minApartments);
    const left = percent * (rect.width - sliderThumbSize) + sliderThumbSize / 2;
    setSliderBubbleLeft(left);
    setSliderWidth(rect.width);
  }, [apartments, minApartments, maxApartments, sliderThumbSize]);

  useEffect(() => {
    updateSliderBubble();
    if (typeof window === "undefined") return;
    const handleResize = () => updateSliderBubble();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateSliderBubble]);

  // Determine if Free tier applies (Web only)
  const freeEligible = isFreeEligible(apartments);
  const isWebFree = freeEligible && selectedPlan === "web";

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
    const effectivePlan = isWebFree ? "free" : selectedPlan;
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
      <div className="text-left mb-8">
        <h3 className="text-xl font-bold text-accent-primary sm:text-2xl">
          Υπολόγισε το κόστος
        </h3>
        <p className="mt-2 text-sm text-[var(--text-dark-secondary)]">
          Σύρε το slider για να δεις την τιμή για την πολυκατοικία σου
        </p>
      </div>

      {/* Slider Section */}
      <div className="rounded-2xl border border-gray-200 bg-[var(--bg-main-light)] p-6 shadow-card-soft">
        {/* Apartment Count Display */}
        <div className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent-primary/10 px-4 py-2">
            <Home className="h-4 w-4 text-accent-primary" />
            <span className="text-2xl font-bold text-accent-primary">
              {apartments}
            </span>
            <span className="text-sm text-[var(--text-dark-secondary)]">διαμερίσματα</span>
          </div>
          <p className="mt-2 text-xs text-[var(--text-dark-secondary)]">
            Τιμολόγηση ανά διαμέρισμα
          </p>
        </div>

        {/* Slider */}
        <div className="mb-8 px-2">
          <div className="relative">
            <div className="pointer-events-none absolute -top-9 left-0 right-0">
              <div
                className="absolute flex h-7 min-w-[2.25rem] items-center justify-center rounded-full bg-accent-primary px-2 text-xs font-semibold text-white shadow-lg shadow-accent-primary/30"
                style={{
                  left: sliderBubbleLeft ? `${sliderBubbleLeft}px` : "0px",
                  transform: "translateX(-50%)",
                }}
              >
                {apartments}
              </div>
            </div>
            <input
              ref={sliderRef}
              type="range"
              min={minApartments}
              max={maxApartments}
              value={apartments}
              onChange={(e) => setApartments(parseInt(e.target.value))}
              className="w-full h-2 bg-[var(--bg-sidebar)] rounded-lg appearance-none cursor-pointer
                         [&::-webkit-slider-thumb]:appearance-none
                         [&::-webkit-slider-thumb]:w-6
                         [&::-webkit-slider-thumb]:h-6
                         [&::-webkit-slider-thumb]:rounded-full
                         [&::-webkit-slider-thumb]:bg-accent-primary
                         [&::-webkit-slider-thumb]:shadow-lg
                         [&::-webkit-slider-thumb]:shadow-accent-primary/50
                         [&::-webkit-slider-thumb]:cursor-pointer
                         [&::-webkit-slider-thumb]:transition-transform
                         [&::-webkit-slider-thumb]:hover:scale-110
                         [&::-moz-range-thumb]:w-6
                         [&::-moz-range-thumb]:h-6
                         [&::-moz-range-thumb]:rounded-full
                         [&::-moz-range-thumb]:bg-accent-primary
                         [&::-moz-range-thumb]:border-0
                         [&::-moz-range-thumb]:cursor-pointer"
            />
          </div>
          <div className="relative mt-2 h-4 text-xs text-[var(--text-dark-secondary)]">
            {[
              { value: 4, label: "4" },
              { value: 7, label: "7" },
              { value: 20, label: "20" },
              { value: 40, label: "40" },
              { value: 60, label: "60+" },
            ].map((tick) => {
              const percent = (tick.value - minApartments) / (maxApartments - minApartments);
              const left = sliderWidth
                ? percent * (sliderWidth - sliderThumbSize) + sliderThumbSize / 2
                : `${percent * 100}%`;
              return (
                <span
                  key={tick.label}
                  className="absolute"
                  style={{
                    left: typeof left === "number" ? `${left}px` : left,
                    transform: "translateX(-50%)",
                  }}
                >
                  {tick.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Free Tier Notice */}
        {isWebFree && (
          <div className="mb-6 rounded-xl border border-accent-secondary/30 bg-accent-secondary/10 p-4 text-center">
            <p className="text-sm font-medium text-accent-secondary">
              🎉 Το Web πακέτο είναι δωρεάν για έως 7 διαμερίσματα!
            </p>
            <p className="mt-1 text-xs text-[var(--text-dark-secondary)]">
              Έως 7 διαμερίσματα - Βασικό φύλλο κοινοχρήστων
            </p>
          </div>
        )}

        {/* Plan Selection */}
        <div className="mb-6">
          <p className="mb-3 text-sm text-[var(--text-dark-secondary)]">Επίλεξε πακέτο:</p>
          <div className="grid gap-3 md:grid-cols-3">
            {/* Web Option */}
            <button
              onClick={() => setSelectedPlan("web")}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                selectedPlan === "web"
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-gray-200 bg-[var(--bg-white)] hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-[var(--text-dark-secondary)]" />
                <span className="font-medium text-accent-primary">Web</span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-dark-secondary)]">Χωρίς οθόνη</p>
              <p className="mt-2 text-lg font-bold text-accent-primary">
                €{webPrice}
                <span className="text-xs font-normal text-[var(--text-dark-secondary)]">
                  /μήνα
                </span>
              </p>
              {selectedPlan === "web" && (
                <div className="absolute -right-1 -top-1 rounded-full bg-accent-primary p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>

            {/* Premium Option */}
            <button
              onClick={() => setSelectedPlan("premium")}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                selectedPlan === "premium"
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-gray-200 bg-[var(--bg-white)] hover:border-gray-300"
              }`}
            >
              {/* Badge */}
              <span className="absolute -right-2 -top-2 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-white">
                Δημοφιλές
              </span>
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-[var(--text-dark-secondary)]" />
                <span className="font-medium text-accent-primary">Premium</span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-dark-secondary)]">Web + Kiosk + AI + Αρχείο</p>
              <p className="mt-2 text-lg font-bold text-accent-primary">
                €{premiumPrice}
                <span className="text-xs font-normal text-[var(--text-dark-secondary)]">
                  /μήνα
                </span>
              </p>
              {selectedPlan === "premium" && (
                <div className="absolute -right-1 -top-1 rounded-full bg-accent-primary p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>

            {/* Premium + IoT Option */}
            <button
              onClick={() => setSelectedPlan("premium_iot")}
              className={`relative rounded-xl border p-4 text-left transition-all ${
                selectedPlan === "premium_iot"
                  ? "border-accent-primary bg-accent-primary/10"
                  : "border-gray-200 bg-[var(--bg-white)] hover:border-gray-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5 text-[var(--text-dark-secondary)]" />
                <span className="font-medium text-accent-primary">Premium + IoT</span>
              </div>
              <p className="mt-1 text-xs text-[var(--text-dark-secondary)]">Smart Heating</p>
              <p className="mt-2 text-lg font-bold text-accent-primary">
                €{premiumIotPrice}
                <span className="text-xs font-normal text-[var(--text-dark-secondary)]">
                  /μήνα
                </span>
              </p>
              {selectedPlan === "premium_iot" && (
                <div className="absolute -right-1 -top-1 rounded-full bg-accent-primary p-1">
                  <Check className="h-3 w-3 text-white" />
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Billing Toggle */}
        {selectedPlan && !isWebFree && (
          <div className="mb-6 flex items-center justify-center gap-3">
            <span
              className={`text-sm ${!isYearly ? "text-[var(--text-dark-primary)]" : "text-[var(--text-dark-secondary)]"}`}
            >
              Μηνιαία
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isYearly ? "bg-accent-primary" : "bg-[var(--bg-sidebar)]"
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isYearly ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span
              className={`text-sm ${isYearly ? "text-[var(--text-dark-primary)]" : "text-[var(--text-dark-secondary)]"}`}
            >
              Ετήσια
            </span>
            {isYearly && yearlySavings && (
              <span className="rounded-full bg-accent-primary/20 px-2 py-0.5 text-xs font-medium text-accent-primary">
                -€{yearlySavings}
              </span>
            )}
          </div>
        )}

        {/* Price Display */}
        <div className="rounded-xl bg-[var(--bg-white)] p-6 text-center shadow-card-soft">
          <p className="text-sm text-[var(--text-dark-secondary)]">
            {isWebFree ? "Το πακέτο σου:" : "Συνολικό κόστος:"}
          </p>
          <div className="mt-2 flex items-baseline justify-center gap-1">
            <span className="text-4xl font-bold text-accent-primary">
              €{displayPrice}
            </span>
            <span className="text-accent-primary">
              /{isYearly ? "έτος" : "μήνα"}
            </span>
          </div>
          {!isWebFree && isYearly && yearlySavings && (
            <p className="mt-1 text-xs text-accent-primary">
              Εξοικονόμηση €{yearlySavings}/έτος (2 μήνες δωρεάν)
            </p>
          )}
          {!isWebFree && (
            <p className="mt-2 text-xs text-accent-primary">
              {apartments} διαμερίσματα × {selectedPlan === "web" ? "Web" : selectedPlan === "premium" ? "Premium" : "Premium + IoT"}
            </p>
          )}
        </div>

        {/* CTA Button */}
        {showCTA && (
          <button
            onClick={handleSelectPlan}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-accent-primary px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-accent-primary/25 transition-all hover:opacity-90 hover:shadow-accent-primary/30 hover:scale-[1.02]"
          >
            {isWebFree ? "Ξεκίνα δωρεάν" : "Ξεκίνα τώρα"}
            <ChevronRight className="h-4 w-4" />
          </button>
        )}

        {/* Contact for 5+ buildings */}
        <div className="mt-4 text-center">
          <p className="text-xs text-[var(--text-dark-secondary)]">
            Για γραφεία διαχείρισης με 5+ πολυκατοικίες:{" "}
            <a
              href="#cta"
              className="text-accent-primary transition-colors hover:opacity-80"
            >
              Επικοινωνήστε μαζί μας
            </a>
          </p>
        </div>
      </div>

      {/* Features Comparison (optional, show on full mode) */}
      {!compact && selectedPlan && !isWebFree && (
        <div className="mt-6 rounded-xl border border-gray-200 bg-[var(--bg-white)] p-4 shadow-card-soft">
          <p className="mb-3 text-sm font-medium text-accent-primary">
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
                  className="flex items-center gap-2 text-xs text-[var(--text-dark-secondary)]"
                >
                  <Check className="h-3 w-3 text-accent-primary" />
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
