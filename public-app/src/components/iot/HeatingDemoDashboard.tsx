'use client';

import * as React from 'react';
import Link from 'next/link';
import { Flame, Thermometer, Wind, Clock, Calendar, Activity, AlertTriangle, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

type StatItem = {
  label: string;
  value: string;
  helper: string;
  icon: React.ComponentType<{ className?: string }>;
};

type ScheduleItem = {
  day: string;
  slots: string[];
  target: string;
  mode: string;
};

type ZoneItem = {
  id: number;
  name: string;
  status: string;
  temperature?: string | null;
  target?: string | null;
  mode: string;
  device?: string | null;
  active: boolean;
  lastUpdate?: string | null;
};

type AlertItem = {
  title: string;
  description: string;
};

type HeatingBudget = {
  usedHours: number;
  limitHours: number;
  note?: string;
};

export type HeatingDashboardData = {
  stats: StatItem[];
  schedule: ScheduleItem[];
  zones: ZoneItem[];
  alerts: AlertItem[];
  budget: HeatingBudget;
  curve: {
    value: number;
    minExternalTemp: number;
  };
};

type HeatingDashboardTemplateProps = {
  buildingName?: string | null;
  upgradeHref?: string;
  mode?: 'demo' | 'live';
  data: HeatingDashboardData;
  zoneToggleEnabled?: boolean;
  onZoneToggle?: (zoneId: number, nextState: boolean) => void;
  onCurveChange?: (value: number) => void;
  onMinExternalTempChange?: (value: number) => void;
};

const demoStats: StatItem[] = [
  {
    label: 'Ενεργές ζώνες',
    value: '3/5',
    helper: 'Auto λειτουργία',
    icon: Flame,
  },
  {
    label: 'Εξωτερική θερμοκρασία',
    value: '9.5°C',
    helper: 'Αισθητήρας αυλής',
    icon: Wind,
  },
  {
    label: 'Θερμοκρασία προσαγωγής',
    value: '62°C',
    helper: 'Λέβητας',
    icon: Thermometer,
  },
  {
    label: 'Χρόνος λειτουργίας',
    value: '6.4h',
    helper: 'Σήμερα',
    icon: Clock,
  },
];

const demoSchedule: ScheduleItem[] = [
  {
    day: 'Δευ - Παρ',
    slots: ['06:30–09:30', '18:00–23:00'],
    target: '22°C',
    mode: 'Auto',
  },
  {
    day: 'Σάβ',
    slots: ['08:00–23:30'],
    target: '21°C',
    mode: 'Auto',
  },
  {
    day: 'Κυρ',
    slots: ['09:00–22:00'],
    target: '21°C',
    mode: 'Eco',
  },
];

const demoZones: ZoneItem[] = [
  {
    id: 1,
    name: 'Ζώνη Α — Είσοδος',
    status: 'Σε λειτουργία',
    temperature: '21.8°C',
    target: '22°C',
    mode: 'Auto',
    device: 'Shelly Relay',
    active: true,
    lastUpdate: '09:12',
  },
  {
    id: 2,
    name: 'Ζώνη Β — Διαμερίσματα',
    status: 'Σε λειτουργία',
    temperature: '22.3°C',
    target: '22°C',
    mode: 'Auto',
    device: 'Shelly Relay',
    active: true,
    lastUpdate: '09:09',
  },
  {
    id: 3,
    name: 'Ζώνη Γ — Κοινόχρηστοι',
    status: 'Σε αναμονή',
    temperature: '20.2°C',
    target: '20°C',
    mode: 'Eco',
    device: 'Virtual',
    active: false,
    lastUpdate: '08:58',
  },
  {
    id: 4,
    name: 'Ζώνη Δ — Υπόγειο',
    status: 'Κλειστή',
    temperature: '18.9°C',
    target: '19°C',
    mode: 'Manual',
    device: 'Virtual',
    active: false,
    lastUpdate: '08:41',
  },
  {
    id: 5,
    name: 'Λέβητας',
    status: 'Σε λειτουργία',
    temperature: '62°C',
    target: '65°C',
    mode: 'Auto',
    device: 'Boiler',
    active: true,
    lastUpdate: '09:12',
  },
];

const demoAlerts: AlertItem[] = [
  {
    title: 'Κατανάλωση εκτός στόχου',
    description: 'Η ζώνη Β ξεπέρασε το ημερήσιο όριο κατά 12%.',
  },
  {
    title: 'Αλλαγή σε Eco mode',
    description: 'Η ζώνη Γ τέθηκε σε Eco λόγω χαμηλής εξωτερικής θερμοκρασίας.',
  },
  {
    title: 'Προγραμματισμένη συντήρηση',
    description: 'Προτείνεται έλεγχος καυστήρα εντός 14 ημερών.',
  },
];

export const demoHeatingData: HeatingDashboardData = {
  stats: demoStats,
  schedule: demoSchedule,
  zones: demoZones,
  alerts: demoAlerts,
  budget: {
    usedHours: 6.4,
    limitHours: 10,
    note: 'Οι ειδοποιήσεις ενεργοποιούνται όταν ξεπεραστεί το 85% του ορίου.',
  },
  curve: {
    value: 62,
    minExternalTemp: 8,
  },
};

export function HeatingDashboardTemplate({
  buildingName,
  upgradeHref,
  mode = 'live',
  data,
  zoneToggleEnabled = false,
  onZoneToggle,
  onCurveChange,
  onMinExternalTempChange,
}: HeatingDashboardTemplateProps) {
  const isDemo = mode === 'demo';
  const [curveValue, setCurveValue] = React.useState(data.curve.value);
  const [minExternalTemp, setMinExternalTemp] = React.useState(data.curve.minExternalTemp);

  React.useEffect(() => {
    setCurveValue(data.curve.value);
  }, [data.curve.value]);

  React.useEffect(() => {
    setMinExternalTemp(data.curve.minExternalTemp);
  }, [data.curve.minExternalTemp]);

  const curveLabel =
    curveValue >= 75 ? 'Comfort' : curveValue >= 55 ? 'Ισορροπημένο' : curveValue >= 35 ? 'Eco' : 'Low';
  const supplyTarget = Math.round(50 + curveValue * 0.25);
  const budgetPercent =
    data.budget.limitHours > 0 ? Math.min(100, Math.round((data.budget.usedHours / data.budget.limitHours) * 100)) : 0;

  const handleCurveChange = (value: number) => {
    setCurveValue(value);
    onCurveChange?.(value);
  };

  const handleMinExternalTempChange = (value: number) => {
    setMinExternalTemp(value);
    onMinExternalTempChange?.(value);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          {isDemo ? (
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">Demo</Badge>
              <Badge variant="outline">Mock δεδομένα</Badge>
            </div>
          ) : null}
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Smart Heating Dashboard</h2>
            <p className="text-sm text-muted-foreground">
              {isDemo
                ? 'Πρότυπο διαχείρισης θέρμανσης με ενδεικτικά δεδομένα'
                : 'Διαχείριση κεντρικής θέρμανσης και αυτοματισμών IoT'}
              {buildingName ? ` για ${buildingName}` : ''}.
            </p>
          </div>
        </div>
        {isDemo && upgradeHref ? (
          <Button asChild>
            <Link href={upgradeHref}>Αναβάθμιση Premium + IoT</Link>
          </Button>
        ) : null}
      </div>

      {isDemo ? (
        <Card className="border-dashed bg-muted/20">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <span>Η Premium + IoT συνδρομή δεν είναι ενεργή. Τα στοιχεία είναι ενδεικτικά.</span>
            </div>
            <span className="text-xs uppercase tracking-wide">Live δεδομένα με ενεργοποίηση</span>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Κατάσταση συστήματος</CardTitle>
            <CardDescription>Συνοπτική εικόνα λειτουργίας</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {data.stats.length === 0 ? (
              <p className="text-sm text-muted-foreground">Δεν υπάρχουν διαθέσιμα δεδομένα.</p>
            ) : (
              data.stats.map((stat) => {
                const Icon = stat.icon;
                return (
                  <div
                    key={stat.label}
                    className="rounded-xl border border-slate-200/70 bg-white/80 p-3"
                  >
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{stat.label}</span>
                      <Icon className="h-4 w-4 text-slate-400" />
                    </div>
                    <p className="mt-2 text-lg font-semibold text-slate-900">{stat.value}</p>
                    <p className="text-xs text-muted-foreground">{stat.helper}</p>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Προϋπολογισμός ημέρας</CardTitle>
            <CardDescription>Όριο λειτουργίας σε ώρες</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Χρήση</span>
              <span className="font-semibold">
                {data.budget.usedHours.toFixed(1)} / {data.budget.limitHours}h
              </span>
            </div>
            <Progress value={budgetPercent} className="h-2" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Στόχος</span>
              <span>{Math.max(0, 100 - budgetPercent)}% διαθέσιμο</span>
            </div>
            {data.budget.note ? (
              <div className="mt-4 rounded-lg border border-slate-200/70 bg-slate-50/60 p-3 text-xs text-muted-foreground">
                {data.budget.note}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Πρόγραμμα λειτουργίας</CardTitle>
            <CardDescription>Προγραμματισμός ανά ημέρα</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.schedule.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Δεν έχουν οριστεί ωράρια ακόμα. Οι ρυθμίσεις θα εμφανιστούν εδώ.
              </p>
            ) : (
              data.schedule.map((schedule) => (
                <div
                  key={schedule.day}
                  className="rounded-xl border border-slate-200/70 bg-white/90 p-4 text-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span className="font-semibold">{schedule.day}</span>
                    </div>
                    <Badge variant="secondary">{schedule.mode}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    <span>Στόχος: {schedule.target}</span>
                    {schedule.slots.map((slot) => (
                      <span key={slot} className="rounded-full bg-slate-100 px-2 py-1">
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Παράμετροι λειτουργίας</CardTitle>
            <CardDescription>Ρυθμίσεις με λειτουργικούς sliders</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Καμπύλη λειτουργίας</span>
                <Badge variant="outline">{curveLabel}</Badge>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Ένταση</span>
                  <span className="font-semibold text-slate-900">{curveValue}%</span>
                </div>
                <input
                  type="range"
                  min={20}
                  max={90}
                  value={curveValue}
                  onChange={(event) => handleCurveChange(Number(event.target.value))}
                  className={cn(
                    'h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-100',
                    '[&::-webkit-slider-thumb]:appearance-none',
                    '[&::-webkit-slider-thumb]:h-4',
                    '[&::-webkit-slider-thumb]:w-4',
                    '[&::-webkit-slider-thumb]:rounded-full',
                    '[&::-webkit-slider-thumb]:bg-orange-500',
                    '[&::-webkit-slider-thumb]:shadow',
                    '[&::-moz-range-thumb]:h-4',
                    '[&::-moz-range-thumb]:w-4',
                    '[&::-moz-range-thumb]:rounded-full',
                    '[&::-moz-range-thumb]:border-0',
                    '[&::-moz-range-thumb]:bg-orange-500'
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Προσαρμογή βάσει εξωτερικής θερμοκρασίας και ζήτησης χώρων.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Ελάχιστη θερμοκρασία εκκίνησης</span>
                <span className="font-semibold text-slate-900">{minExternalTemp}°C</span>
              </div>
              <div className="mt-3 space-y-2">
                <input
                  type="range"
                  min={-5}
                  max={15}
                  step={1}
                  value={minExternalTemp}
                  onChange={(event) => handleMinExternalTempChange(Number(event.target.value))}
                  className={cn(
                    'h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-100',
                    '[&::-webkit-slider-thumb]:appearance-none',
                    '[&::-webkit-slider-thumb]:h-4',
                    '[&::-webkit-slider-thumb]:w-4',
                    '[&::-webkit-slider-thumb]:rounded-full',
                    '[&::-webkit-slider-thumb]:bg-slate-900',
                    '[&::-webkit-slider-thumb]:shadow',
                    '[&::-moz-range-thumb]:h-4',
                    '[&::-moz-range-thumb]:w-4',
                    '[&::-moz-range-thumb]:rounded-full',
                    '[&::-moz-range-thumb]:border-0',
                    '[&::-moz-range-thumb]:bg-slate-900'
                  )}
                />
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Gauge className="h-3.5 w-3.5" />
                  <span>Η θέρμανση ενεργοποιείται κάτω από το όριο.</span>
                </div>
              </div>
            </div>
            <div className="rounded-xl border border-slate-200/70 bg-white/90 p-4">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Στόχος προσαγωγής</span>
                <Badge variant="secondary">{supplyTarget}°C</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Η προσαγωγή υπολογίζεται δυναμικά από την καμπύλη και την εξωτερική θερμοκρασία.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ζώνες & συσκευές</CardTitle>
            <CardDescription>Κατάσταση ανά ζώνη</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.zones.length === 0 ? (
              <p className="text-sm text-muted-foreground">Δεν υπάρχουν διαθέσιμες ζώνες.</p>
            ) : (
              data.zones.map((zone) => {
                const metadata = [
                  zone.status,
                  zone.temperature ? `Θερμ.: ${zone.temperature}` : null,
                  zone.target ? `Στόχος: ${zone.target}` : null,
                  zone.device ? zone.device : null,
                  zone.lastUpdate ? `Ενημέρωση ${zone.lastUpdate}` : null,
                ].filter(Boolean) as string[];

                return (
                  <div
                    key={zone.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-white/90 p-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">{zone.name}</span>
                        <Badge variant={zone.active ? 'secondary' : 'outline'}>{zone.mode}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {metadata.map((item) => (
                          <span key={item}>{item}</span>
                        ))}
                      </div>
                    </div>
                    <Switch
                      checked={zone.active}
                      disabled={!zoneToggleEnabled}
                      onCheckedChange={(nextState) => onZoneToggle?.(zone.id, nextState)}
                      aria-label={`Toggle ${zone.name}`}
                    />
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Συμβάντα & ειδοποιήσεις</CardTitle>
            <CardDescription>Πρόσφατες ενημερώσεις</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.alerts.length === 0 ? (
              <div className="rounded-xl border border-slate-200/70 bg-white/90 p-4 text-sm text-muted-foreground">
                Δεν υπάρχουν ενεργές ειδοποιήσεις αυτή τη στιγμή.
              </div>
            ) : (
              data.alerts.map((alert) => (
                <div
                  key={alert.title}
                  className="flex items-start gap-3 rounded-xl border border-slate-200/70 bg-white/90 p-4 text-sm"
                >
                  <div className="mt-1 rounded-full bg-amber-100 p-2 text-amber-600">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{alert.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{alert.description}</p>
                  </div>
                </div>
              ))
            )}
            {isDemo ? (
              <Button variant="outline" className="w-full" disabled>
                Προβολή πλήρους ιστορικού (Demo)
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

type HeatingDemoDashboardProps = {
  buildingName?: string | null;
  upgradeHref: string;
};

export function HeatingDemoDashboard({ buildingName, upgradeHref }: HeatingDemoDashboardProps) {
  return (
    <HeatingDashboardTemplate
      mode="demo"
      buildingName={buildingName}
      upgradeHref={upgradeHref}
      data={demoHeatingData}
      zoneToggleEnabled={false}
    />
  );
}
