'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Flame, Clock, Calendar, Power, AlertCircle, RefreshCcw } from 'lucide-react';
import { toast } from 'sonner';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

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

export const HeatingControlDashboard = () => {
  // Fetch devices
  const { data: devices, isLoading, refetch } = useQuery<HeatingDevice[]>({
    queryKey: ['heating-devices'],
    queryFn: async () => {
      const res = await api.get('/iot/devices/');
      return res.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds for "live" feel
  });

  const handleToggle = async (deviceId: number, currentState: boolean) => {
    try {
      const newState = !currentState;
      // Optimistic update would be good here, but for now we wait for server
      await api.post(`/iot/devices/${deviceId}/report_status/`, {
        state: newState ? 'on' : 'off'
      });
      toast.success(`Η θέρμανση ${newState ? 'ενεργοποιήθηκε' : 'απενεργοποιήθηκε'}`);
      refetch();
    } catch (error) {
      toast.error('Σφάλμα επικοινωνίας με τη συσκευή');
    }
  };

  // Calculate stats
  const activeDevices = devices?.filter(d => d.current_status).length || 0;
  const totalDurationToday = 145; // Mocked for now - would come from aggregation endpoint

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (!devices || devices.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6 flex flex-col items-center justify-center h-64 text-center">
          <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-4">
            <AlertCircle className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold">Δεν βρέθηκαν συσκευές IoT</h3>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm">
            Η υπηρεσία Smart Heating δεν είναι ενεργοποιημένη για αυτό το κτίριο ή δεν έχουν συνδεθεί συσκευές.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Smart Heating Control</h2>
          <p className="text-muted-foreground">Διαχείριση κεντρικής θέρμανσης και αυτονομίας</p>
        </div>
        <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeDevices > 0 ? 'bg-green-400' : 'bg-slate-400'}`}></span>
              <span className={`relative inline-flex rounded-full h-3 w-3 ${activeDevices > 0 ? 'bg-green-500' : 'bg-slate-500'}`}></span>
            </span>
            <span className="text-sm font-medium text-muted-foreground">
                {activeDevices > 0 ? `${activeDevices} ενεργές ζώνες` : 'Σύστημα σε αναμονή'}
            </span>
        </div>
      </div>

      {/* Main Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {devices.map((device) => (
          <Card key={device.id} className={`overflow-hidden border-l-4 ${device.current_status ? 'border-l-orange-500 shadow-md shadow-orange-500/10' : 'border-l-slate-300'}`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium truncate pr-2">
                {device.name}
              </CardTitle>
              {device.current_status ? (
                <Flame className="h-4 w-4 text-orange-500 animate-pulse" />
              ) : (
                <Power className="h-4 w-4 text-slate-400" />
              )}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold mb-1">
                {device.current_status ? 'ON' : 'OFF'}
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {device.current_status && device.current_session
                  ? `Σε λειτουργία για ${Math.round((new Date().getTime() - new Date(device.current_session.started_at).getTime()) / 60000)} λεπτά`
                  : `Τελευταία χρήση: ${new Date(device.last_seen).toLocaleTimeString('el-GR', {hour: '2-digit', minute:'2-digit'})}`
                }
              </p>
              <div className="flex items-center justify-between">
                <Badge variant={device.is_active ? 'secondary' : 'outline'}>
                    {device.device_id.includes('SHELLY') ? 'Shelly Relay' : 'Virtual'}
                </Badge>
                <Switch
                    checked={device.current_status}
                    onCheckedChange={() => handleToggle(device.id, device.current_status)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analytics Section */}
      <div className="grid gap-4 md:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Ιστορικό Κατανάλωσης (7 ημέρες)</CardTitle>
            <CardDescription>Συνολικές ώρες λειτουργίας ανά ημέρα</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={mockChartData}>
                <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} tickFormatter={(value) => `${value}h`} />
                <Tooltip />
                <Area
                    type="monotone"
                    dataKey="hours"
                    stroke="#f97316"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorHours)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="col-span-3">
            <CardHeader>
                <CardTitle>Σύνοψη Μήνα</CardTitle>
                <CardDescription>Δεκέμβριος 2025</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-8">
                    <div className="flex items-center">
                        <div className="w-full space-y-1">
                            <p className="text-sm font-medium leading-none">Συνολικές Ώρες</p>
                            <p className="text-3xl font-bold">142.5 h</p>
                            <div className="w-full h-2 bg-slate-100 rounded-full mt-2 overflow-hidden">
                                <div className="h-full bg-orange-500 w-[65%]" />
                            </div>
                            <p className="text-xs text-muted-foreground pt-1">65% του ορίου προϋπολογισμού</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="w-3 h-3" /> Μέση Διάρκεια
                            </p>
                            <p className="text-xl font-bold">45 min</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Συνεδρίες
                            </p>
                            <p className="text-xl font-bold">182</p>
                        </div>
                    </div>

                    <Button variant="outline" className="w-full" onClick={() => refetch()}>
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        Ανανέωση Δεδομένων
                    </Button>
                </div>
            </CardContent>
        </Card>
      </div>
    </div>
  );
};

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

const mockChartData = [
  { day: 'Δευ', hours: 4.2 },
  { day: 'Τρι', hours: 3.8 },
  { day: 'Τετ', hours: 5.1 },
  { day: 'Πεμ', hours: 2.5 },
  { day: 'Παρ', hours: 6.0 },
  { day: 'Σαβ', hours: 8.2 },
  { day: 'Κυρ', hours: 7.5 },
];

