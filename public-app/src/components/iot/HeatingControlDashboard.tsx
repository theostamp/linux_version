'use client';

import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { HeatingDashboardTemplate, type HeatingDashboardData } from '@/components/iot/HeatingDemoDashboard';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, Flame, Power, Clock, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';

interface HeatingDevice {
  id: number;
  name: string;
  device_id: string;
  is_active: boolean;
  current_status: boolean;
  last_seen: string;
  current_session: {
    started_at: string;
    duration_minutes?: number;
  } | null;
}

type HeatingScheduleItem = {
  day: string;
  slots: string[];
  target: string;
  mode: string;
};

type HeatingControlProfile = {
  curve_value: number;
  min_external_temp: number;
  schedule: HeatingScheduleItem[];
  updated_at?: string | null;
};

const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('el-GR', { hour: '2-digit', minute: '2-digit' });
};

const formatDate = (value?: string | null) => {
  if (!value) return 'Χωρίς δεδομένα';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Χωρίς δεδομένα';
  return date.toLocaleDateString('el-GR', { day: '2-digit', month: 'short' });
};

const minutesSince = (value?: string | null) => {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (Number.isNaN(time)) return null;
  return Math.round((Date.now() - time) / 60000);
};

const getLatestSeen = (devices?: HeatingDevice[]) => {
  if (!devices || devices.length === 0) return null;
  return devices.reduce<string | null>((latest, device) => {
    if (!device.last_seen) return latest;
    if (!latest) return device.last_seen;
    const latestTime = new Date(latest).getTime();
    const currentTime = new Date(device.last_seen).getTime();
    if (Number.isNaN(currentTime)) return latest;
    if (Number.isNaN(latestTime)) return device.last_seen;
    return currentTime > latestTime ? device.last_seen : latest;
  }, null);
};

export const HeatingControlDashboard = ({
  buildingName,
  buildingId,
  headerControl,
}: {
  buildingName?: string | null;
  buildingId?: number | null;
  headerControl?: React.ReactNode;
}) => {
  const queryClient = useQueryClient();
  const { data: devices, isLoading, refetch } = useQuery<HeatingDevice[]>({
    queryKey: ['heating-devices'],
    queryFn: async () => api.get('/iot/devices/'),
    refetchInterval: 10000,
  });

  const { data: profile } = useQuery<HeatingControlProfile>({
    queryKey: ['heating-settings', buildingId],
    enabled: Boolean(buildingId),
    queryFn: async () => api.get(`/iot/buildings/${buildingId}/settings/`),
    staleTime: 60_000,
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (payload: Partial<HeatingControlProfile>) => {
      if (!buildingId) {
        throw new Error('Missing building id');
      }
      return api.patch<HeatingControlProfile>(`/iot/buildings/${buildingId}/settings/`, payload);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['heating-settings', buildingId], data);
    },
    onError: () => {
      toast.error('Αποτυχία ενημέρωσης ρυθμίσεων Smart Heating.');
    },
  });

  const pendingSettingsRef = React.useRef<Partial<HeatingControlProfile>>({});
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleSettingsUpdate = (payload: Partial<HeatingControlProfile>) => {
    if (!buildingId) return;
    pendingSettingsRef.current = { ...pendingSettingsRef.current, ...payload };
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const nextPayload = pendingSettingsRef.current;
      pendingSettingsRef.current = {};
      if (Object.keys(nextPayload).length > 0) {
        updateSettingsMutation.mutate(nextPayload);
      }
    }, 500);
  };

  React.useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const handleToggle = async (deviceId: number, nextState: boolean) => {
    try {
      await api.post(`/iot/devices/${deviceId}/report_status/`, {
        state: nextState ? 'on' : 'off',
      });
      toast.success(`Η θέρμανση ${nextState ? 'ενεργοποιήθηκε' : 'απενεργοποιήθηκε'}`);
      refetch();
    } catch (error) {
      toast.error('Σφάλμα επικοινωνίας με τη συσκευή');
    }
  };

  const totalDevices = devices?.length ?? 0;
  const activeDevices = devices?.filter((device) => device.current_status).length ?? 0;
  const latestSeen = getLatestSeen(devices);
  const totalMinutesToday = (devices ?? []).reduce((sum, device) => {
    if (!device.current_session) return sum;
    if (typeof device.current_session.duration_minutes === 'number') {
      return sum + device.current_session.duration_minutes;
    }
    const startedAt = new Date(device.current_session.started_at).getTime();
    if (Number.isNaN(startedAt)) return sum;
    return sum + Math.max(0, Math.round((Date.now() - startedAt) / 60000));
  }, 0);
  const totalHours = totalMinutesToday / 60;
  const hasDevices = totalDevices > 0;
  const schedule = Array.isArray(profile?.schedule) ? profile?.schedule ?? [] : [];
  const curveValue = profile?.curve_value ?? 60;
  const minExternalTemp = profile?.min_external_temp ?? 8;

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!devices || devices.length === 0) {
    return (
      <CardEmptyState
        title="Δεν βρέθηκαν συσκευές IoT"
        description="Η υπηρεσία Smart Heating δεν είναι ενεργοποιημένη για αυτό το κτίριο ή δεν έχουν συνδεθεί συσκευές."
      />
    );
  }

  const stats: HeatingDashboardData['stats'] = [
    {
      label: 'Ενεργές ζώνες',
      value: hasDevices ? `${activeDevices}/${totalDevices}` : '—',
      helper: activeDevices > 0 ? 'Auto λειτουργία' : 'Σε αναμονή',
      icon: Flame,
    },
    {
      label: 'Συνδεδεμένες συσκευές',
      value: hasDevices ? `${totalDevices}` : '—',
      helper: hasDevices ? 'IoT controllers' : 'Χωρίς συσκευές',
      icon: Power,
    },
    {
      label: 'Χρόνος λειτουργίας',
      value: hasDevices ? `${totalHours.toFixed(1)}h` : '—',
      helper: 'Σήμερα',
      icon: Clock,
    },
    {
      label: 'Τελευταία ενημέρωση',
      value: formatTime(latestSeen),
      helper: formatDate(latestSeen),
      icon: RefreshCcw,
    },
  ];

  const zones: HeatingDashboardData['zones'] = [...(devices ?? [])]
    .sort((a, b) => a.id - b.id)
    .map((device) => {
    const deviceLabel = device.device_id?.toUpperCase().includes('SHELLY') ? 'Shelly Relay' : 'Virtual';
    const status = device.current_status ? 'Σε λειτουργία' : device.is_active ? 'Σε αναμονή' : 'Κλειστή';
    const mode = device.is_active ? 'Auto' : 'Manual';

    return {
      id: device.id,
      name: device.name,
      status,
      temperature: null,
      target: null,
      mode,
      device: deviceLabel,
      active: device.current_status,
      lastUpdate: formatTime(device.last_seen),
    };
  });

  const alerts: HeatingDashboardData['alerts'] = [];
  const staleDevices = devices.filter((device) => {
    const minutes = minutesSince(device.last_seen);
    return minutes !== null && minutes > 30;
  });

  if (activeDevices === 0) {
    alerts.push({
      title: 'Σύστημα σε αναμονή',
      description: 'Δεν υπάρχει ενεργή θέρμανση αυτή τη στιγμή.',
    });
  }

  if (staleDevices.length > 0) {
    alerts.push({
      title: 'Χαμηλή επικοινωνία συσκευών',
      description: `Χωρίς πρόσφατη ενημέρωση από ${staleDevices.length} συσκευές.`,
    });
  }

  if (totalHours > 0 && totalHours / 10 >= 0.85) {
    alerts.push({
      title: 'Πλησιάζεις το ημερήσιο όριο',
      description: 'Η χρήση πλησιάζει το 85% του ορίου λειτουργίας.',
    });
  }

  const dashboardData: HeatingDashboardData = {
    stats,
    schedule,
    zones,
    alerts,
    budget: {
      usedHours: hasDevices ? totalHours : 0,
      limitHours: 10,
      note: 'Το όριο μπορεί να ρυθμιστεί ανά κτίριο όταν ενεργοποιηθεί η διαχείριση.',
    },
    curve: {
      value: curveValue,
      minExternalTemp: minExternalTemp,
    },
  };

  return (
    <HeatingDashboardTemplate
      mode="live"
      buildingName={buildingName}
      headerControl={headerControl}
      data={dashboardData}
      zoneToggleEnabled
      onZoneToggle={handleToggle}
      onCurveChange={(value) => scheduleSettingsUpdate({ curve_value: value })}
      onMinExternalTempChange={(value) => scheduleSettingsUpdate({ min_external_temp: value })}
    />
  );
};

const CardEmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
      <AlertCircle className="h-6 w-6 text-slate-400" />
    </div>
    <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
    <p className="mt-2 text-sm text-muted-foreground">{description}</p>
  </div>
);

const DashboardSkeleton = () => (
  <div className="space-y-6">
    <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
    <div className="grid gap-4 md:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-32 rounded-xl" />
      ))}
    </div>
    <Skeleton className="h-[300px] rounded-xl" />
  </div>
);
