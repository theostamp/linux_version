"use client";

import React from "react";
import { Building2, ShieldCheck, Sparkles, Shield } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PortfolioInsights } from "@/hooks/useOfficeDashboard";

interface BuildingDirectoryCardProps {
  data?: PortfolioInsights;
  loading?: boolean;
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat("el-GR").format(value);

export function BuildingDirectoryCard({ data, loading = false }: BuildingDirectoryCardProps) {
  const buildings = data?.building_directory || [];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Κατάλογος Κτιρίων
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Επιλεγμένα κτίρια με βασικά στοιχεία
          </p>
        </div>
        <div className="rounded-full bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-300">
          <Building2 className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-56 rounded-xl bg-muted/40 animate-pulse" />
        ) : buildings.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            Δεν υπάρχουν διαθέσιμα κτίρια.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Κτίριο</TableHead>
                <TableHead>Πόλη</TableHead>
                <TableHead>Διαμερίσματα</TableHead>
                <TableHead>Κατάσταση</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {buildings.map((building) => {
                const isPremium = building.premium_enabled || building.iot_enabled;
                return (
                  <TableRow key={building.id}>
                    <TableCell className="font-medium text-foreground">
                      {building.name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{building.city}</TableCell>
                    <TableCell>{formatNumber(building.apartments_count)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {building.iot_enabled && (
                          <Badge variant="warning">
                            <Sparkles className="mr-1 h-3 w-3" />
                            Premium + IoT
                          </Badge>
                        )}
                        {!building.iot_enabled && building.premium_enabled && (
                          <Badge variant="success">
                            <ShieldCheck className="mr-1 h-3 w-3" />
                            Premium
                          </Badge>
                        )}
                        {!isPremium && building.trial_active && (
                          <Badge variant="secondary">
                            <Shield className="mr-1 h-3 w-3" />
                            Trial
                          </Badge>
                        )}
                        {!isPremium && !building.trial_active && (
                          <Badge variant="outline">Standard</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default BuildingDirectoryCard;
