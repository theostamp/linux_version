"use client";

import React from "react";
import { Home } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioInsights } from "@/hooks/useOfficeDashboard";

interface OccupancyCardProps {
  data?: PortfolioInsights;
  loading?: boolean;
}

const COLORS = ["#10b981", "#f59e0b", "#94a3b8"];

const formatNumber = (value: number) =>
  new Intl.NumberFormat("el-GR").format(value);

export function OccupancyCard({ data, loading = false }: OccupancyCardProps) {
  const breakdown = data?.occupancy_breakdown;
  const chartData = [
    { label: "Κατοικημένα", value: breakdown?.occupied || 0 },
    { label: "Κενά", value: breakdown?.empty || 0 },
    { label: "Κλειστά", value: breakdown?.closed || 0 },
  ].filter((entry) => entry.value > 0);

  const total = chartData.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Κατάσταση Κατοίκησης
          </CardTitle>
          <p className="text-sm text-muted-foreground">Διαθεσιμότητα διαμερισμάτων</p>
        </div>
        <div className="rounded-full bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-300">
          <Home className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-40 rounded-xl bg-muted/40 animate-pulse" />
        ) : total === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Δεν υπάρχουν δεδομένα κατοίκησης.
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-[200px_1fr] items-center">
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={2}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `${formatNumber(value)} διαμερίσματα`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {chartData.map((entry, index) => (
                <div key={entry.label} className="flex items-center justify-between gap-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-foreground">{entry.label}</span>
                  </div>
                  <span className="font-semibold text-foreground">
                    {formatNumber(entry.value)}
                  </span>
                </div>
              ))}
              <div className="border-t border-border/60 pt-3 text-xs text-muted-foreground">
                Σύνολο: {formatNumber(total)} διαμερίσματα
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OccupancyCard;
