"use client";

import React from "react";
import { PieChart as PieIcon, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioInsights } from "@/hooks/useOfficeDashboard";

interface PremiumMixCardProps {
  data?: PortfolioInsights;
  loading?: boolean;
}

const COLORS = ["#6366f1", "#06b6d4", "#94a3b8", "#f59e0b"];

const formatCount = (value: number) =>
  new Intl.NumberFormat("el-GR").format(value);

export function PremiumMixCard({ data, loading = false }: PremiumMixCardProps) {
  const breakdown = data?.premium_breakdown;
  const chartData = [
    { label: "Premium + IoT", value: breakdown?.premium_iot || 0 },
    { label: "Premium", value: breakdown?.premium || 0 },
    { label: "Standard", value: breakdown?.standard || 0 },
    { label: "Trial", value: breakdown?.trial || 0 },
  ].filter((entry) => entry.value > 0);

  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Συνδρομές & Premium
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Κατανομή ενεργών κτιρίων
          </p>
        </div>
        <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-300">
          <Sparkles className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
        ) : total === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
            <PieIcon className="h-8 w-8 opacity-60" />
            <span className="text-sm">Δεν υπάρχουν δεδομένα συνδρομών</span>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[220px_1fr] items-center">
            <div className="h-40 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${formatCount(value)} κτίρια`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {chartData.map((entry, index) => (
                <div key={entry.label} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-foreground">{entry.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">
                    {formatCount(entry.value)}
                  </span>
                </div>
              ))}
              <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                Σύνολο: {formatCount(total)} κτίρια
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PremiumMixCard;
