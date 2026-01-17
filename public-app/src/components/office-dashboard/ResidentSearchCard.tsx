"use client";

import React, { useEffect, useState } from "react";
import { Search, User } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useOfficeResidentSearch } from "@/hooks/useOfficeResidents";

const ROLE_LABELS: Record<string, string> = {
  owner: "Ιδιοκτήτης",
  tenant: "Ενοικιαστής",
};

export function ResidentSearchCard() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebounced(query.trim());
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const { data, isLoading } = useOfficeResidentSearch(debounced);
  const results = data?.results || [];

  return (
    <Card className="border-border/60 shadow-sm">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-base font-semibold text-foreground">
            Αναζήτηση Κατοίκων
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ονομαστική αναζήτηση ιδιοκτητών ή ενοικιαστών
          </p>
        </div>
        <div className="rounded-full bg-slate-100 p-2 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Search className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Πληκτρολογήστε όνομα, τηλέφωνο ή διαμέρισμα..."
            className="pl-9"
          />
        </div>

        {debounced.length < 2 ? (
          <div className="rounded-xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
            Πληκτρολογήστε τουλάχιστον 2 χαρακτήρες για αναζήτηση.
          </div>
        ) : isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-xl border border-border/60 p-6 text-center text-sm text-muted-foreground">
            Δεν βρέθηκαν αποτελέσματα.
          </div>
        ) : (
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {results.map((resident, index) => (
              <div
                key={`${resident.name}-${resident.apartment_number}-${index}`}
                className="flex items-start gap-3 rounded-xl border border-border/60 p-3"
              >
                <div className="mt-1 rounded-full bg-primary/10 p-2 text-primary">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{resident.name}</p>
                    <Badge variant={resident.role === "owner" ? "secondary" : "success"}>
                      {ROLE_LABELS[resident.role] || resident.role}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {resident.building_name} · Διαμέρισμα {resident.apartment_number}
                  </p>
                  {(resident.phone || resident.email) && (
                    <p className="text-xs text-muted-foreground">
                      {resident.phone || resident.email}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ResidentSearchCard;
