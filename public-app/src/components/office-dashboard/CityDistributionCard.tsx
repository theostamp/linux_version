"use client";

import React from "react";
import { MapPin } from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PortfolioInsights } from "@/hooks/useOfficeDashboard";

interface CityDistributionCardProps {
  data?: PortfolioInsights;
  loading?: boolean;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("el-GR").format(value);

export function CityDistributionCard({ data, loading = false }: CityDistributionCardProps) {
  const chartData = (data?.city_breakdown || []).slice(0, 6);

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Περιοχές Κάλυψης
          </CardTitle>
          <p className="text-sm text-muted-foreground">Κτίρια ανά πόλη</p>
        </div>
        <div className="rounded-full bg-cyan-500/10 p-2 text-cyan-600 dark:text-cyan-300">
          <MapPin className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-44 rounded-xl bg-muted/40 animate-pulse" />
        ) : chartData.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Δεν υπάρχουν δεδομένα για τις περιοχές.
          </div>
        ) : (
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis
                  dataKey="city"
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  interval={0}
                  angle={-15}
                  height={40}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  fontSize={11}
                  allowDecimals={false}
                  width={24}
                />
                <Tooltip
                  formatter={(value: number, name: string, props) => {
                    const apartments = props?.payload?.apartments || 0;
                    return [
                      `${formatNumber(value)} κτίρια • ${formatNumber(apartments)} διαμ.`,
                      name,
                    ];
                  }}
                  labelFormatter={(label) => `Πόλη: ${label}`}
                />
                <Bar dataKey="buildings" fill="#22c55e" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default CityDistributionCard;
