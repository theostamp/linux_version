'use client';

import * as React from 'react';
import Link from 'next/link';
import { Flame, Wind, Clock, Activity, AlertTriangle, Gauge } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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
  headerControl?: React.ReactNode;
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
    icon: Flame,
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
    description: 'Η κατανάλωση ξεπέρασε το ημερήσιο όριο κατά 12%.',
  },
  {
    title: 'Αλλαγή σε Eco mode',
    description: 'Το σύστημα τέθηκε σε Eco λόγω χαμηλής εξωτερικής θερμοκρασίας.',
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
  headerControl,
  zoneToggleEnabled = false,
  onZoneToggle,
  onCurveChange,
  onMinExternalTempChange,
}: HeatingDashboardTemplateProps) {
  const isDemo = mode === 'demo';
  const [curveValue, setCurveValue] = React.useState(data.curve.value);
  const [minExternalTemp, setMinExternalTemp] = React.useState(data.curve.minExternalTemp);
  const [selectedMode, setSelectedMode] = React.useState(data.schedule[0]?.mode ?? 'Auto');

  React.useEffect(() => {
    setCurveValue(data.curve.value);
  }, [data.curve.value]);

  React.useEffect(() => {
    setMinExternalTemp(data.curve.minExternalTemp);
  }, [data.curve.minExternalTemp]);

  React.useEffect(() => {
    setSelectedMode(data.schedule[0]?.mode ?? 'Auto');
  }, [data.schedule]);

  const curveLabel =
    curveValue >= 75 ? 'Comfort' : curveValue >= 55 ? 'Ισορροπημένο' : curveValue >= 35 ? 'Eco' : 'Low';
  const supplyTarget = Math.round(50 + curveValue * 0.25);
  const budgetPercent =
    data.budget.limitHours > 0 ? Math.min(100, Math.round((data.budget.usedHours / data.budget.limitHours) * 100)) : 0;
  const modeOptions = ['Auto', 'Eco', 'Manual'];
  const surfaceClass =
    'rounded-[28px] border border-white/80 bg-white/85 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] backdrop-blur';
  const scheduleTarget = data.schedule[0]?.target ?? null;
  const primaryZone = data.zones[0];
  const primaryActive = primaryZone?.active ?? false;
  const systemState = selectedMode === 'Eco' ? 'Eco' : primaryActive ? 'Θέρμανση' : 'Off';
  const primaryStatus =
    primaryZone?.status ?? (data.zones.length > 0 ? 'Σε αναμονή' : 'Χωρίς δεδομένα');

  const formatTemperature = (value?: string | number | null) => {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'number') return `${value}°C`;
    return value;
  };

  const currentTempValue = formatTemperature(primaryZone?.temperature ?? scheduleTarget ?? supplyTarget);
  const targetTempValue = formatTemperature(scheduleTarget ?? primaryZone?.target ?? supplyTarget);
  const canTogglePrimary = Boolean(primaryZone?.id && zoneToggleEnabled && onZoneToggle);

  const statFor = (label: string) => data.stats.find((stat) => stat.label === label);
  const externalStat = statFor('Εξωτερική θερμοκρασία');
  const hoursStat = statFor('Χρόνος λειτουργίας');
  const boilerStat = statFor('Θερμοκρασία προσαγωγής') ?? statFor('Κατάσταση λέβητα');
  const infoCards = [
    {
      title: 'Εξωτερική θερμοκρασία',
      value: externalStat?.value ?? '—',
      helper: externalStat?.helper ?? 'Χωρίς αισθητήρα',
      icon: Wind,
    },
    {
      title: 'Ώρες λειτουργίας',
      value: hoursStat?.value ?? `${data.budget.usedHours.toFixed(1)}h`,
      helper: hoursStat?.helper ?? 'Σήμερα',
      icon: Clock,
    },
    {
      title: 'Προϋπολογισμός ημέρας',
      value: `${data.budget.usedHours.toFixed(1)} / ${data.budget.limitHours}h`,
      helper: data.budget.note ?? 'Όριο λειτουργίας σε ώρες',
      icon: Gauge,
      progress: budgetPercent,
    },
    {
      title: 'Κατάσταση λέβητα',
      value: boilerStat?.value ?? formatTemperature(supplyTarget),
      helper: boilerStat?.helper ?? 'Προσαγωγή',
      icon: Flame,
    },
  ];

  const handleCurveChange = (value: number) => {
    setCurveValue(value);
    onCurveChange?.(value);
  };

  const handleMinExternalTempChange = (value: number) => {
    setMinExternalTemp(value);
    onMinExternalTempChange?.(value);
  };

  return (
    <section className="relative overflow-hidden rounded-[34px] border border-slate-200/60 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 p-5 shadow-[0_35px_120px_-60px_rgba(15,23,42,0.45)] sm:p-8">
      <div className="absolute -top-24 right-8 h-56 w-56 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="absolute -bottom-24 left-8 h-60 w-60 rounded-full bg-emerald-200/40 blur-3xl" />
      <div className="relative space-y-6 sm:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            {isDemo ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Demo</Badge>
                <Badge variant="outline">Mock δεδομένα</Badge>
              </div>
            ) : null}
            <div>
              <h2 className="text-3xl font-semibold text-slate-900">Θέρμανση</h2>
              <p className="text-sm text-slate-500">
                {buildingName
                  ? `Κτίριο: ${buildingName}`
                  : 'Κεντρικός έλεγχος θέρμανσης με smart θερμοστάτη.'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {headerControl}
            {isDemo && upgradeHref ? (
              <Button asChild size="lg" className="rounded-full px-6">
                <Link href={upgradeHref}>Αναβάθμιση Premium + IoT</Link>
              </Button>
            ) : null}
          </div>
        </div>

        {isDemo ? (
          <Card className="border-dashed bg-white/70">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4 text-sm text-slate-500">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>Η Premium + IoT συνδρομή δεν είναι ενεργή. Τα στοιχεία είναι ενδεικτικά.</span>
              </div>
              <span className="text-xs uppercase tracking-[0.2em]">Live δεδομένα με ενεργοποίηση</span>
            </CardContent>
          </Card>
        ) : null}

        <Card className={cn(surfaceClass, 'border-white/70')}>
          <CardContent className="p-5 sm:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-slate-500">Κεντρικός έλεγχος</p>
                <h3 className="text-xl font-semibold text-slate-900">Smart Thermostat</h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                  {systemState}
                </Badge>
                <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                  {selectedMode}
                </Badge>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-center">
              <div className="flex justify-center">
                <div className="relative h-52 w-52 sm:h-64 sm:w-64">
                  <div className="absolute inset-0 rounded-full bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]" />
                  <div className="absolute inset-3 rounded-full border border-slate-200/70" />
                  <div className="absolute inset-8 rounded-full bg-gradient-to-br from-amber-50 via-white to-emerald-50 shadow-inner" />
                  <div className="relative flex h-full w-full flex-col items-center justify-center text-center">
                    <p className="text-[10px] uppercase tracking-[0.35em] text-slate-500">Τώρα</p>
                    <p className="text-5xl font-semibold text-slate-900">{currentTempValue}</p>
                    <p className="text-sm text-slate-500">Στόχος {targetTempValue}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Λειτουργία</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {modeOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setSelectedMode(option)}
                        className={cn(
                          'rounded-full px-4 py-2 text-sm font-semibold transition',
                          selectedMode === option
                            ? 'bg-slate-900 text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,0.45)]'
                            : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                        )}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="uppercase tracking-[0.2em]">Κατάσταση</span>
                    <span className="text-sm font-semibold text-slate-900">{primaryStatus}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (primaryZone && onZoneToggle && zoneToggleEnabled) {
                        onZoneToggle(primaryZone.id, !primaryZone.active);
                      }
                    }}
                    disabled={!canTogglePrimary}
                    aria-pressed={primaryActive}
                    className={cn(
                      'mt-3 w-full rounded-full px-4 py-3 text-sm font-semibold transition',
                      primaryActive
                        ? 'bg-slate-900 text-white shadow-[0_12px_24px_-14px_rgba(15,23,42,0.45)]'
                        : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300',
                      !canTogglePrimary && 'cursor-not-allowed opacity-60'
                    )}
                  >
                    {primaryActive ? 'Απενεργοποίηση' : 'Ενεργοποίηση'}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="uppercase tracking-[0.2em]">Καμπύλη</span>
                  <Badge variant="outline">{curveLabel}</Badge>
                </div>
                <div className="mt-4 space-y-3">
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-slate-500">Ένταση</span>
                    <span className="text-3xl font-semibold text-slate-900">{curveValue}%</span>
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
                      '[&::-webkit-slider-thumb]:h-6',
                      '[&::-webkit-slider-thumb]:w-6',
                      '[&::-webkit-slider-thumb]:rounded-full',
                      '[&::-webkit-slider-thumb]:bg-amber-500',
                      '[&::-webkit-slider-thumb]:shadow',
                      '[&::-moz-range-thumb]:h-6',
                      '[&::-moz-range-thumb]:w-6',
                      '[&::-moz-range-thumb]:rounded-full',
                      '[&::-moz-range-thumb]:border-0',
                      '[&::-moz-range-thumb]:bg-amber-500'
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    Προσαρμόζει την απόδοση με βάση την εξωτερική θερμοκρασία.
                  </p>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="uppercase tracking-[0.2em]">Εξωτερικό όριο</span>
                  <span className="text-3xl font-semibold text-slate-900">{minExternalTemp}°C</span>
                </div>
                <div className="mt-4 space-y-3">
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
                      '[&::-webkit-slider-thumb]:h-6',
                      '[&::-webkit-slider-thumb]:w-6',
                      '[&::-webkit-slider-thumb]:rounded-full',
                      '[&::-webkit-slider-thumb]:bg-slate-900',
                      '[&::-webkit-slider-thumb]:shadow',
                      '[&::-moz-range-thumb]:h-6',
                      '[&::-moz-range-thumb]:w-6',
                      '[&::-moz-range-thumb]:rounded-full',
                      '[&::-moz-range-thumb]:border-0',
                      '[&::-moz-range-thumb]:bg-slate-900'
                    )}
                  />
                  <p className="text-xs text-slate-500">
                    Η θέρμανση ενεργοποιείται όταν η εξωτερική θερμοκρασία πέσει κάτω από το όριο.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {infoCards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title} className={cn(surfaceClass, 'border-white/60')}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span className="uppercase tracking-[0.18em]">{card.title}</span>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </div>
                  <p className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl">{card.value}</p>
                  {typeof card.progress === 'number' ? (
                    <Progress value={card.progress} className="mt-3 h-2" />
                  ) : null}
                  <p className="mt-2 text-xs text-slate-500">{card.helper}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Card className={cn(surfaceClass, 'border-white/60')}>
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Ειδοποιήσεις</p>
                <h3 className="text-lg font-semibold text-slate-900">Ροή συμβάντων</h3>
              </div>
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                {data.alerts.length}
              </Badge>
            </div>
            <div className="mt-4 space-y-3">
              {data.alerts.length === 0 ? (
                <div className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm text-slate-500">
                  Δεν υπάρχουν ενεργές ειδοποιήσεις αυτή τη στιγμή.
                </div>
              ) : (
                data.alerts.map((alert) => (
                  <div
                    key={alert.title}
                    className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/90 p-4 text-sm"
                  >
                    <div className="mt-1 rounded-full bg-amber-100 p-2 text-amber-600">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{alert.title}</p>
                      <p className="mt-1 text-xs text-slate-500">{alert.description}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {isDemo ? (
              <Button variant="outline" className="mt-4 w-full" disabled>
                Προβολή πλήρους ιστορικού (Demo)
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

type HeatingDemoDashboardProps = {
  buildingName?: string | null;
  upgradeHref: string;
  headerControl?: React.ReactNode;
};

export function HeatingDemoDashboard({ buildingName, upgradeHref, headerControl }: HeatingDemoDashboardProps) {
  return (
    <HeatingDashboardTemplate
      mode="demo"
      buildingName={buildingName}
      upgradeHref={upgradeHref}
      headerControl={headerControl}
      data={demoHeatingData}
      zoneToggleEnabled={false}
    />
  );
}
