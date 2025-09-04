'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiGet, extractCount, getActiveBuildingId } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Users, 
  Calendar, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  Building,
  FileCheck
} from 'lucide-react';
import Link from 'next/link';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { useRole } from '@/lib/auth';

interface ProjectStats {
  total_projects: number;
  active_projects: number;
  completed_projects: number;
  pending_offers: number;
  active_contracts: number;
  total_budget: number;
  total_spent: number;
  average_completion_rate: number;
}

export default function ProjectsDashboard() {
  useBuildingEvents();
  const { isAdmin, isManager } = useRole();
  const buildingId = getActiveBuildingId();
  const projectsQ = useQuery({ queryKey: ['projects', { building: buildingId }], queryFn: () => apiGet(`/api/projects/projects/`, { building: buildingId }) });
  const activeProjectsQ = useQuery({ queryKey: ['projects', { building: buildingId, status: 'in_progress' }], queryFn: () => apiGet(`/api/projects/projects/`, { building: buildingId, status: 'in_progress' }) });
  const completedProjectsQ = useQuery({ queryKey: ['projects', { building: buildingId, status: 'completed' }], queryFn: () => apiGet(`/api/projects/projects/`, { building: buildingId, status: 'completed' }) });
  const pendingOffersQ = useQuery({ queryKey: ['offers', { status: 'pending' }], queryFn: () => apiGet(`/api/projects/offers/`, { status: 'pending' }) });
  const activeContractsQ = useQuery({ queryKey: ['contracts', { status: 'active' }], queryFn: () => apiGet(`/api/projects/contracts/`, { status: 'active' }) });

  const loading = projectsQ.isLoading || activeProjectsQ.isLoading || completedProjectsQ.isLoading || pendingOffersQ.isLoading || activeContractsQ.isLoading;
  const stats: ProjectStats = {
    total_projects: extractCount(projectsQ.data ?? []),
    active_projects: extractCount(activeProjectsQ.data ?? []),
    completed_projects: extractCount(completedProjectsQ.data ?? []),
    pending_offers: extractCount(pendingOffersQ.data ?? []),
    active_contracts: extractCount(activeContractsQ.data ?? []),
    total_budget: 0,
    total_spent: 0,
    average_completion_rate: 0,
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
          <h1 className="text-3xl font-bold tracking-tight">Προσφορές & Έργα</h1>
          <p className="text-muted-foreground">
            Διαχείριση έργων, προσφορών και συμβολαίων
          </p>
        </div>
        {(isAdmin || isManager) && (
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/projects/new">
                <FileText className="w-4 h-4 mr-2" />
                Νέο Έργο
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/projects/offers/new">
                <Award className="w-4 h-4 mr-2" />
                Νέα Προσφορά
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Συνολικά Έργα"
          value={stats.total_projects}
          description="Όλα τα έργα"
          icon={<FileText className="w-4 h-4" />}
          color="default"
          href="/projects"
        />
        <StatCard
          title="Ενεργά Έργα"
          value={stats.active_projects}
          description="Σε εξέλιξη"
          icon={<Clock className="w-4 h-4" />}
          color="warning"
          href="/projects?status=in_progress"
        />
        <StatCard
          title="Εκκρεμείς Προσφορές"
          value={stats.pending_offers}
          description="Περιμένουν αξιολόγηση"
          icon={<Award className="w-4 h-4" />}
          color="danger"
          href="/projects/offers?status=pending"
        />
        <StatCard
          title="Ενεργά Συμβόλαια"
          value={stats.active_contracts}
          description="Σε ισχύ"
          icon={<FileCheck className="w-4 h-4" />}
          color="success"
          href="/projects/contracts?status=active"
        />
      </div>

      {/* Project Overview */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Επισκόπηση Έργων
            </CardTitle>
            <CardDescription>
              Κατάσταση και πρόοδος έργων
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Ολοκληρωμένα Έργα</span>
              <span className="text-lg font-bold text-green-600">
                {stats.completed_projects}/{stats.total_projects}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Μέσος Όρος Ολοκλήρωσης</span>
                <span>{stats.average_completion_rate}%</span>
              </div>
              <Progress value={stats.average_completion_rate} className="h-2" />
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">{stats.active_projects}</div>
                <div className="text-xs text-blue-600">Σε Εξέλιξη</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{stats.completed_projects}</div>
                <div className="text-xs text-green-600">Ολοκληρωμένα</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Οικονομική Επισκόπηση
            </CardTitle>
            <CardDescription>
              Προϋπολογισμός και έξοδα έργων
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Συνολικός Προϋπολογισμός</span>
              <span className="text-lg font-bold text-blue-600">
                €{stats.total_budget.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Συνολικά Έξοδα</span>
              <span className="text-lg font-bold text-red-600">
                €{stats.total_spent.toLocaleString()}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Ποσοστό Χρήσης</span>
                <span>{Math.round((stats.total_spent / stats.total_budget) * 100)}%</span>
              </div>
              <Progress 
                value={(stats.total_spent / stats.total_budget) * 100} 
                className="h-2" 
              />
            </div>
            <div className="pt-2">
              <div className="text-sm text-muted-foreground">
                Διαθέσιμο: €{(stats.total_budget - stats.total_spent).toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>
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
              <Link href="/projects">
                <FileText className="w-6 h-6 mb-2" />
                <span>Διαχείριση Έργων</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/projects/offers">
                <Award className="w-6 h-6 mb-2" />
                <span>Προσφορές</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/projects/contracts">
                <FileCheck className="w-6 h-6 mb-2" />
                <span>Συμβόλαια</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/projects/reports">
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
            Τελευταίες ενημερώσεις έργων και προσφορών
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Ολοκληρώθηκε έργο ανακαίνισης κοινοχρήστων χώρων</p>
                <p className="text-xs text-muted-foreground">Πριν 1 ημέρα</p>
              </div>
              <Badge variant="secondary">Ολοκληρώθηκε</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-yellow-50 rounded-lg">
                <Award className="w-4 h-4 text-yellow-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Προστέθηκε νέα προσφορά για έργο ηλεκτρολογικών</p>
                <p className="text-xs text-muted-foreground">€12,500 - Πριν 2 ημέρες</p>
              </div>
              <Badge variant="outline">Εκκρεμεί</Badge>
            </div>
            <div className="flex items-center space-x-4">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileCheck className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">Υπογράφηκε νέο συμβόλαιο για συντήρηση ανελκυστήρων</p>
                <p className="text-xs text-muted-foreground">€8,000/μήνα - Πριν 3 ημέρες</p>
              </div>
              <Badge variant="secondary">Ενεργό</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 