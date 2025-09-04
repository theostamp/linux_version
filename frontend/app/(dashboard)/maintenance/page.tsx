'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, extractCount, getActiveBuildingId } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Wrench, 
  FileText, 
  Calendar, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp
} from 'lucide-react';
import Link from 'next/link';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { useRole } from '@/lib/auth';

interface MaintenanceStats {
  total_contractors: number;
  active_contractors: number;
  pending_receipts: number;
  scheduled_maintenance: number;
  urgent_maintenance: number;
  completed_maintenance: number;
  total_spent: number;
}

export default function MaintenanceDashboard() {
  useBuildingEvents();
  const { isAdmin, isManager } = useRole();
  const buildingId = getActiveBuildingId();

  const contractorsQ = useQuery({
    queryKey: ['contractors', { building: buildingId }],
    queryFn: () => apiGet(`/api/maintenance/contractors/`),
  });
  const receiptsQ = useQuery({
    queryKey: ['receipts', { building: buildingId, payment_status: 'pending' }],
    queryFn: () => apiGet(`/api/maintenance/receipts/`, { building: buildingId, payment_status: 'pending' }),
  });
  const scheduledQ = useQuery({
    queryKey: ['scheduled-maintenance', { building: buildingId }],
    queryFn: () => apiGet(`/api/maintenance/scheduled-maintenance/`, { building: buildingId }),
  });
  const urgentScheduledQ = useQuery({
    queryKey: ['scheduled-maintenance', { building: buildingId, priority: 'urgent' }],
    queryFn: () => apiGet(`/api/maintenance/scheduled-maintenance/`, { building: buildingId, priority: 'urgent' }),
  });

  const loading = contractorsQ.isLoading || receiptsQ.isLoading || scheduledQ.isLoading || urgentScheduledQ.isLoading;
  const stats: MaintenanceStats = {
    total_contractors: extractCount(contractorsQ.data ?? []),
    active_contractors: extractCount(contractorsQ.data ?? []),
    pending_receipts: extractCount(receiptsQ.data ?? []),
    scheduled_maintenance: extractCount(scheduledQ.data ?? []),
    urgent_maintenance: extractCount(urgentScheduledQ.data ?? []),
    completed_maintenance: 0,
    total_spent: 0,
  };

  const StatCard = ({ 
    title, 
    value, 
    description, 
    icon, 
    color = "default",
    href 
  }: {
    title: string;
    value: string | number;
    description?: string;
    icon: React.ReactNode;
    color?: "default" | "success" | "warning" | "danger";
    href?: string;
  }) => {
    const colorClasses = {
      default: "bg-blue-50 text-blue-600",
      success: "bg-green-50 text-green-600",
      warning: "bg-yellow-50 text-yellow-600",
      danger: "bg-red-50 text-red-600",
    };

    const CardWrapper = href ? Link : 'div';
    const cardProps = href ? { href } : {};

    return (
      <CardWrapper {...cardProps} className={href ? "block hover:shadow-md transition-shadow" : ""}>
        <Card className="h-full">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
              {icon}
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </CardContent>
        </Card>
      </CardWrapper>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Τεχνικά & Συντήρηση</h1>
          <p className="text-muted-foreground">
            Διαχείριση συνεργείων, αποδείξεων και προγραμματισμένων έργων
          </p>
        </div>
        {(isAdmin || isManager) && (
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/maintenance/contractors/new">
                <Users className="w-4 h-4 mr-2" />
                Νέο Συνεργείο
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/maintenance/scheduled/new">
                <Calendar className="w-4 h-4 mr-2" />
                Προγραμματισμένο Έργο
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Συνεργεία"
          value={`${stats.active_contractors}/${stats.total_contractors}`}
          description="Ενεργά συνεργεία"
          icon={<Users className="w-4 h-4" />}
          color="default"
          href="/maintenance/contractors"
        />
        <StatCard
          title="Εκκρεμείς Αποδείξεις"
          value={stats.pending_receipts}
          description="Αποδείξεις για επεξεργασία"
          icon={<FileText className="w-4 h-4" />}
          color="warning"
          href="/maintenance/receipts"
        />
        <StatCard
          title="Προγραμματισμένα Έργα"
          value={stats.scheduled_maintenance}
          description="Έργα σε εξέλιξη"
          icon={<Calendar className="w-4 h-4" />}
          color="default"
          href="/maintenance/scheduled"
        />
        <StatCard
          title="Επείγοντα Έργα"
          value={stats.urgent_maintenance}
          description="Απαιτούν άμεση προσοχή"
          icon={<AlertTriangle className="w-4 h-4" />}
          color="danger"
          href="/maintenance/scheduled?priority=urgent"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <StatCard
          title="Ολοκληρωμένα Έργα"
          value={stats.completed_maintenance}
          description="Φέτος"
          icon={<CheckCircle className="w-4 h-4" />}
          color="success"
        />
        <StatCard
          title="Συνολικά Έξοδα"
          value={`€${stats.total_spent.toLocaleString()}`}
          description="Φέτος"
          icon={<TrendingUp className="w-4 h-4" />}
          color="default"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Γρήγορες Ενέργειες</CardTitle>
          <CardDescription>
            Συχνές λειτουργίες για γρήγορη πρόσβαση
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/maintenance/receipts/new">
                <FileText className="w-6 h-6 mb-2" />
                <span>Ανέβασμα Απόδειξης</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/maintenance/contractors">
                <Users className="w-6 h-6 mb-2" />
                <span>Διαχείριση Συνεργείων</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/maintenance/scheduled">
                <Calendar className="w-6 h-6 mb-2" />
                <span>Προγραμματισμένα Έργα</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/maintenance/reports">
                <TrendingUp className="w-6 h-6 mb-2" />
                <span>Reports</span>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Πρόσφατη Δραστηριότητα</CardTitle>
          <CardDescription>
            Τελευταίες ενημερώσεις και ενέργειες
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Ολοκληρώθηκε έργο συντήρησης ανελκυστήρα</p>
                <p className="text-xs text-muted-foreground">Πριν 2 ώρες</p>
              </div>
              <Badge variant="secondary">Ολοκληρώθηκε</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Προστέθηκε νέα απόδειξη από συνεργείο καθαρισμού</p>
                <p className="text-xs text-muted-foreground">Πριν 1 ημέρα</p>
              </div>
              <Badge variant="outline">Εκκρεμεί</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Προστέθηκε νέο συνεργείο ηλεκτρολογικών</p>
                <p className="text-xs text-muted-foreground">Πριν 2 ημέρες</p>
              </div>
              <Badge variant="secondary">Νέο</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 