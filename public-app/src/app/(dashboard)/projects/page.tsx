'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useProjects, useProjectMutations } from '@/hooks/useProjects';
import { useOffers } from '@/hooks/useOffers';
import { getRelativeTimeEl } from '@/lib/date';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  FileCheck,
  Eye,
  DollarSign,
  Search,
  Filter,
  ArrowUpDown,
  Grid3x3,
  List,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { useRole } from '@/lib/auth';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { RefreshButton } from '@/components/ui/RefreshButton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

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

function ProjectsDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  useBuildingEvents();
  const { isAdmin, isManager } = useRole();
  const { currentBuilding, selectedBuilding } = useBuilding();

  // Use same logic as announcements and votes pages for consistency
  const buildingId =
    selectedBuilding === null ? null : (selectedBuilding?.id ?? currentBuilding?.id ?? null);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || 'all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'title' | 'amount' | 'status'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');

  // Delete state
  const [projectToDelete, setProjectToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { projects, isLoading: projectsLoading } = useProjects({ buildingId, pageSize: 1000 });
  const { projects: activeProjects, isLoading: activeProjectsLoading } = useProjects({ buildingId, status: 'in_progress', pageSize: 1000 });
  const { projects: completedProjects, isLoading: completedProjectsLoading } = useProjects({ buildingId, status: 'completed', pageSize: 1000 });
  const { offers: pendingOffers, isLoading: pendingOffersLoading } = useOffers({ buildingId, status: 'submitted', pageSize: 1000 });
  const { offers: approvedOffers, isLoading: approvedOffersLoading } = useOffers({ buildingId, status: 'accepted', pageSize: 1000 });

  // Mutations
  const { delete: deleteProject } = useProjectMutations();

  // Delete handler
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;

    setIsDeleting(true);
    try {
      await deleteProject.mutateAsync(projectToDelete.id);
      setProjectToDelete(null);
      // Success notification could be added here
    } catch (error) {
      console.error('Failed to delete project:', error);
      // Error notification could be added here
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered and sorted projects
  const filteredProjects = useMemo(() => {
    let filtered = [...projects];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p: any) =>
        p.title?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query) ||
        p.selected_contractor?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p: any) => p.status === statusFilter);
    }

    // Priority filter
    if (priorityFilter !== 'all') {
      filtered = filtered.filter((p: any) => p.priority === priorityFilter);
    }

    // Sorting
    filtered.sort((a: any, b: any) => {
      let aVal: any, bVal: any;

      switch (sortBy) {
        case 'title':
          aVal = a.title || '';
          bVal = b.title || '';
          break;
        case 'amount':
          aVal = parseFloat(a.final_cost || a.estimated_cost || '0');
          bVal = parseFloat(b.final_cost || b.estimated_cost || '0');
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'date':
        default:
          aVal = new Date(a.created_at || a.updated_at || 0).getTime();
          bVal = new Date(b.created_at || b.updated_at || 0).getTime();
          break;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    return filtered;
  }, [projects, searchQuery, statusFilter, priorityFilter, sortBy, sortOrder]);

  const loading = projectsLoading || activeProjectsLoading || completedProjectsLoading || pendingOffersLoading || approvedOffersLoading;
  const stats: ProjectStats = {
    total_projects: projects.length,
    active_projects: activeProjects.length,
    completed_projects: completedProjects.length,
    pending_offers: pendingOffers.length,
    active_contracts: approvedOffers.length,
    total_budget: 0,
    total_spent: 0,
    average_completion_rate: 0,
  };

  // using shared helper getRelativeTimeEl

  type ActivityItem = {
    key: string;
    icon: React.ReactNode;
    bgClass: string;
    text: string;
    date: Date;
    badge: { label: string; variant: 'secondary' | 'outline' };
  };

  const toDate = (value: unknown): Date | null => {
    if (!value || typeof value !== 'string') return null;
    const s = value.length === 10 ? `${value}T00:00:00` : value;
    const t = new Date(s);
    return isNaN(t.getTime()) ? null : t;
  };

  type ProjectRow = {
    id: number;
    completed_at?: string;
    updated_at?: string;
    created_at?: string;
  };
  type OfferRow = {
    id: number;
    submitted_at?: string;
    reviewed_at?: string;
    created_at?: string;
  };

  const projectsRows = projects as ProjectRow[];
  const completedRows = completedProjects as ProjectRow[];
  const pendingOffersRows = pendingOffers as OfferRow[];
  const approvedOffersRows = approvedOffers as OfferRow[];

  const getProjectRelevantDate = (r: ProjectRow): Date | null => {
    return (
      toDate(r?.completed_at) ||
      toDate(r?.updated_at) ||
      toDate(r?.created_at) ||
      null
    );
  };
  const byLatest = <T extends ProjectRow | OfferRow>(getDate: (r: T) => Date | null) => (a: T, b: T) => {
    const da = getDate(a)?.getTime() ?? -Infinity;
    const db = getDate(b)?.getTime() ?? -Infinity;
    return db - da;
  };

  const latestCompletedProject = [...completedRows].sort(byLatest(getProjectRelevantDate))[0];
  const latestPendingOffer = [...pendingOffersRows].sort(byLatest((r: OfferRow) => toDate(r?.submitted_at) || toDate(r?.created_at)))[0];
  const latestApprovedOffer = [...approvedOffersRows].sort(byLatest((r: OfferRow) => toDate(r?.reviewed_at) || toDate(r?.submitted_at)))[0];

  const activityItems: ActivityItem[] = [];

  if (latestCompletedProject) {
    const d = getProjectRelevantDate(latestCompletedProject) || new Date();
    activityItems.push({
      key: `project-${latestCompletedProject.id}`,
      icon: <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />,
      bgClass: 'bg-green-50',
      text: latestCompletedProject?.title
        ? `Ολοκληρώθηκε έργο: ${latestCompletedProject.title}`
        : 'Ολοκληρώθηκε έργο',
      date: d,
      badge: { label: 'Ολοκληρώθηκε', variant: 'secondary' },
    });
  }

  if (latestPendingOffer) {
    const d = toDate(latestPendingOffer?.submitted_at) || toDate(latestPendingOffer?.created_at) || new Date();
    const amount = latestPendingOffer?.amount;
    const amountStr = typeof amount === 'number' ? ` — €${amount.toLocaleString()}` : '';
    activityItems.push({
      key: `offer-${latestPendingOffer.id}`,
      icon: <Award className="w-4 h-4 text-yellow-600" />,
      bgClass: 'bg-yellow-50',
      text: latestPendingOffer?.contractor_name
        ? `Νέα προσφορά: ${latestPendingOffer.contractor_name}${amountStr}`
        : `Προστέθηκε νέα προσφορά${amountStr}`,
      date: d,
      badge: { label: 'Εκκρεμεί', variant: 'outline' },
    });
  }

  if (latestApprovedOffer) {
    const d = toDate(latestApprovedOffer?.reviewed_at) || toDate(latestApprovedOffer?.submitted_at) || new Date();
    const amount = latestApprovedOffer?.amount;
    const amountStr = typeof amount === 'number' ? ` — €${amount.toLocaleString()}` : '';
    activityItems.push({
      key: `approved-offer-${latestApprovedOffer.id}`,
      icon: <FileCheck className="w-4 h-4 text-green-600 dark:text-green-400" />,
      bgClass: 'bg-green-50',
      text: latestApprovedOffer?.contractor_name
        ? `Εγκεκριμένη προσφορά: ${latestApprovedOffer.contractor_name}${amountStr}`
        : `Εγκρίθηκε προσφορά${amountStr}`,
      date: d,
      badge: { label: 'Εγκεκριμένη', variant: 'secondary' },
    });
  }

  const StatCard = ({
    title,
    value,
    description,
    icon,
    color = "default",
    href,
    className
  }: {
    title: string;
    value: string | number;
    description?: string;
    icon: React.ReactNode;
    color?: "default" | "success" | "warning" | "danger";
    href?: string;
    className?: string;
  }) => {
    const colorClasses = {
      default: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
      success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
      danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    };

    const handleClick = (e: React.MouseEvent) => {
      if (href && href.includes('#')) {
        const [path, hash] = href.split('#');
        if (path === window.location.pathname || path === '') {
          e.preventDefault();
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }
      }
    };

    const content = (
      <div className="flex flex-col h-full justify-between">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            {icon}
          </div>
        </div>
        <div>
          <div className="text-2xl font-bold font-condensed">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
    );

    return (
      <BentoGridItem
        className={cn("col-span-1", className)}
        header={href ? (
          <Link href={href} className="block h-full hover:opacity-80 transition-opacity" onClick={handleClick}>
            {content}
          </Link>
        ) : content}
      />
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Εργα & Προσφορές</h1>
          <p className="text-muted-foreground">
            Διαχείριση έργων, προσφορών και συμβολαίων
          </p>
        </div>
        <div className="flex gap-2">
          {/* Refresh Button */}
          <RefreshButton
            scope="projects"
            label="Ανανέωση"
            variant="outline"
            size="sm"
          />

          {(isAdmin || isManager) && (
            <>
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
            </>
          )}
        </div>
      </div>

      {/* Main Content - Bento Grid */}
      <BentoGrid className="max-w-[1920px] auto-rows-auto gap-4">

        {/* Row 1: Key Metrics */}
        <StatCard
          title="Συνολικά Έργα"
          value={stats.total_projects}
          description="Όλα τα έργα"
          icon={<FileText className="w-4 h-4" />}
          color="default"
          href="/projects#projects-list"
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
          href="/projects/offers?status=submitted"
        />
        <StatCard
          title="Εγκεκριμένες Προσφορές"
          value={stats.active_contracts}
          description="Επιλεγμένες"
          icon={<FileCheck className="w-4 h-4" />}
          color="success"
          href="/projects/offers?status=accepted"
        />

        {/* Row 2: Overviews & Actions */}
        <BentoGridItem
          className="md:col-span-2"
          title={
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              <span>Επισκόπηση Έργων</span>
            </div>
          }
          description="Κατάσταση και πρόοδος έργων"
          header={
            <div className="space-y-4 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Ολοκληρωμένα Έργα</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400 dark:text-green-400">
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
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.active_projects}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Σε Εξέλιξη</div>
                </div>
                <div className="text-center p-3 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400 dark:text-green-400">{stats.completed_projects}</div>
                  <div className="text-xs text-green-600 dark:text-green-400 dark:text-green-400">Ολοκληρωμένα</div>
                </div>
              </div>
            </div>
          }
        />

        <BentoGridItem
          className="md:col-span-2"
          title={
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              <span>Οικονομική Επισκόπηση</span>
            </div>
          }
          description="Προϋπολογισμός και έξοδα έργων"
          header={
            <div className="space-y-4 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Συνολικός Προϋπολογισμός</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  €{stats.total_budget.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Συνολικά Έξοδα</span>
                <span className="text-lg font-bold text-destructive">
                  €{stats.total_spent.toLocaleString()}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Ποσοστό Χρήσης</span>
                  <span>{Math.round((stats.total_spent / Math.max(1, stats.total_budget)) * 100)}%</span>
                </div>
                <Progress
                  value={(stats.total_spent / Math.max(1, stats.total_budget)) * 100}
                  className="h-2"
                />
              </div>
              <div className="pt-2">
                <div className="text-sm text-muted-foreground">
                  Διαθέσιμο: €{(stats.total_budget - stats.total_spent).toLocaleString()}
                </div>
              </div>
            </div>
          }
        />

        {/* Row 3: Actions & Activity */}
        <BentoGridItem
          className="md:col-span-2 lg:col-span-3"
          title="Γρήγορες Ενέργειες"
          header={
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mt-4">
              <Button
                variant="outline"
                className="h-auto p-4 flex-col hover:bg-muted hover:text-foreground border-border"
                onClick={() => {
                  const element = document.getElementById('projects-list');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  } else {
                    router.push('/projects#projects-list');
                  }
                }}
              >
                <FileText className="w-6 h-6 mb-2 text-primary" />
                <span>Όλα τα Έργα</span>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col hover:bg-muted hover:text-foreground border-border">
                <Link href="/projects/offers">
                  <Award className="w-6 h-6 mb-2 text-yellow-600" />
                  <span>Προσφορές</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col hover:bg-muted hover:text-foreground border-border">
                <Link href="/projects">
                  <Users className="w-6 h-6 mb-2 text-blue-600" />
                  <span>Συμβόλαια</span>
                </Link>
              </Button>
              <Button asChild variant="outline" className="h-auto p-4 flex-col hover:bg-muted hover:text-foreground border-border">
                <Link href="/projects">
                  <TrendingUp className="w-6 h-6 mb-2 text-purple-600" />
                  <span>Αναφορές</span>
                </Link>
              </Button>
            </div>
          }
        />

        <BentoGridItem
          className="md:col-span-2 lg:col-span-1"
          title="Πρόσφατη Δραστηριότητα"
          header={
            <div className="mt-4 space-y-4">
              {activityItems.length === 0 ? (
                <div className="text-sm text-muted-foreground">Δεν υπάρχουν πρόσφατες ενέργειες.</div>
              ) : (
                activityItems.slice(0, 3).map((item) => (
                  <div key={item.key} className="flex items-center space-x-3 p-2 hover:bg-accent/50 rounded-lg transition-colors">
                    <div className={`p-2 rounded-lg ${item.bgClass} shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.text}</p>
                      <p className="text-xs text-muted-foreground">{getRelativeTimeEl(item.date)}</p>
                    </div>
                    <Badge variant={item.badge.variant} className="shrink-0">{item.badge.label}</Badge>
                  </div>
                ))
              )}
            </div>
          }
        />
      </BentoGrid>

      {/* Main Content Area - Projects List */}
      <div id="projects-list" className="bg-background rounded-xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold">Όλα τα Έργα</h2>
            <p className="text-sm text-muted-foreground">
              {filteredProjects.length} από {projects.length} έργα
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-secondary/30 p-1 rounded-lg">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0"
              >
                <List className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0"
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
            </div>
            {(isAdmin || isManager) && (
              <Button asChild>
                <Link href="/projects/new">
                  <FileText className="w-4 h-4 mr-2" />
                  Νέο Έργο
                </Link>
              </Button>
            )}
          </div>
        </div>

        {/* Filter & List Logic */}
        <div className="bg-card rounded-xl border border-border p-6 shadow-sm">
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Αναζήτηση έργων..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Κατάσταση" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Όλες οι Καταστάσεις</SelectItem>
                  <SelectItem value="planning">Σχεδιασμός</SelectItem>
                  <SelectItem value="tendering">Διαγωνισμός</SelectItem>
                  <SelectItem value="evaluation">Αξιολόγηση</SelectItem>
                  <SelectItem value="approved">Εγκεκριμένο</SelectItem>
                  <SelectItem value="in_progress">Σε Εξέλιξη</SelectItem>
                  <SelectItem value="completed">Ολοκληρωμένο</SelectItem>
                  <SelectItem value="cancelled">Ακυρωμένο</SelectItem>
                </SelectContent>
              </Select>

              {/* Priority Filter */}
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Προτεραιότητα" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Όλες οι Προτεραιότητες</SelectItem>
                  <SelectItem value="low">Χαμηλή</SelectItem>
                  <SelectItem value="medium">Μεσαία</SelectItem>
                  <SelectItem value="high">Υψηλή</SelectItem>
                  <SelectItem value="urgent">Επείγον</SelectItem>
                </SelectContent>
              </Select>

              {/* Sort */}
              <Select value={`${sortBy}-${sortOrder}`} onValueChange={(value) => {
                const [by, order] = value.split('-');
                setSortBy(by as any);
                setSortOrder(order as any);
              }}>
                <SelectTrigger className="w-[180px]">
                  <ArrowUpDown className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Ταξινόμηση" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date-desc">Νεότερα πρώτα</SelectItem>
                  <SelectItem value="date-asc">Παλαιότερα πρώτα</SelectItem>
                  <SelectItem value="title-asc">Τίτλος (Α-Ω)</SelectItem>
                  <SelectItem value="title-desc">Τίτλος (Ω-Α)</SelectItem>
                  <SelectItem value="amount-desc">Μεγαλύτερο ποσό</SelectItem>
                  <SelectItem value="amount-asc">Μικρότερο ποσό</SelectItem>
                  <SelectItem value="status-asc">Κατάσταση</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Loading State */}
          {projectsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border border-border rounded-lg p-4 animate-pulse bg-card">
                  <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                  <div className="flex gap-4">
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                    <div className="h-4 bg-muted rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ? (
                <>
                  <Search className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Δεν βρέθηκαν έργα</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης.
                  </p>
                  <Button variant="outline" onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                    setPriorityFilter('all');
                  }}>
                    Καθαρισμός Φίλτρων
                  </Button>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">Δεν υπάρχουν έργα</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Δημιουργήστε το πρώτο έργο για να ξεκινήσετε.
                  </p>
                  {(isAdmin || isManager) && (
                    <Button asChild>
                      <Link href="/projects/new">
                        <FileText className="w-4 h-4 mr-2" />
                        Δημιουργία Έργου
                      </Link>
                    </Button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
              {filteredProjects.map((project: any) => {
                const projectOffers = pendingOffers.filter((o: any) => o.project === project.id || o.project_id === project.id);
                const approvedProjectOffers = approvedOffers.filter((o: any) => o.project === project.id || o.project_id === project.id);

                const priorityColors: Record<string, string> = {
                  low: 'bg-muted text-muted-foreground',
                  medium: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  high: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
                  urgent: 'bg-red-500/10 text-destructive',
                };

                const statusColors: Record<string, string> = {
                  completed: 'bg-green-500/10 text-green-600 dark:text-green-400 dark:text-green-400',
                  in_progress: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
                  approved: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
                  planning: 'bg-muted text-muted-foreground',
                  tendering: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
                  evaluation: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
                  cancelled: 'bg-destructive/10 text-destructive',
                };

                const statusLabels: Record<string, string> = {
                  completed: 'Ολοκληρωμένο',
                  in_progress: 'Σε Εξέλιξη',
                  approved: 'Εγκεκριμένο',
                  planning: 'Σχεδιασμός',
                  tendering: 'Διαγωνισμός',
                  evaluation: 'Αξιολόγηση',
                  cancelled: 'Ακυρωμένο',
                };

                if (viewMode === 'grid') {
                  return (
                    <Card
                      key={project.id}
                      className="hover:shadow-lg transition-all cursor-pointer h-full flex flex-col"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base mb-2 line-clamp-2">{project.title || 'Άτιτλο Έργο'}</CardTitle>
                            <div className="flex flex-wrap gap-1">
                              <Badge className={statusColors[project.status] || 'bg-muted text-muted-foreground'} variant="outline">
                                {statusLabels[project.status] || project.status || 'Σχεδιασμός'}
                              </Badge>
                              {project.priority && (
                                <Badge className={priorityColors[project.priority] || 'bg-muted text-muted-foreground'} variant="outline">
                                  {project.priority === 'low' ? 'Χαμηλή' : project.priority === 'medium' ? 'Μεσαία' : project.priority === 'high' ? 'Υψηλή' : 'Επείγον'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-3 flex-1">{project.description}</p>
                        )}
                        <div className="space-y-2 text-sm">
                          {project.estimated_cost && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <DollarSign className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">Εκτιμ.: {typeof project.estimated_cost === 'number' ? `€${project.estimated_cost.toLocaleString()}` : project.estimated_cost}</span>
                            </div>
                          )}
                          {project.final_cost && (
                            <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-medium">
                              <DollarSign className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">Τελικό: {typeof project.final_cost === 'number' ? `€${project.final_cost.toLocaleString()}` : project.final_cost}</span>
                            </div>
                          )}
                          {project.deadline && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Calendar className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{new Date(project.deadline).toLocaleDateString('el-GR')}</span>
                            </div>
                          )}
                          {(projectOffers.length > 0 || approvedProjectOffers.length > 0) && (
                            <div className="flex items-center gap-2 pt-2 border-t">
                              {projectOffers.length > 0 && (
                                <Badge variant="outline" className="text-yellow-700 dark:text-yellow-400 border-yellow-500/50">
                                  <Award className="w-3 h-3 mr-1" />
                                  {projectOffers.length}
                                </Badge>
                              )}
                              {approvedProjectOffers.length > 0 && (
                                <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-500/50">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  {approvedProjectOffers.length}
                                </Badge>
                              )}
                            </div>
                          )}
                          {(isAdmin || isManager) && (
                            <div className="pt-2 border-t mt-2 flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="w-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.push(`/projects/${project.id}`);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                Προβολή
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setProjectToDelete(project);
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                }

                return (
                  <Card
                    key={project.id}
                    className="hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => router.push(`/projects/${project.id}`)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-lg font-semibold truncate">{project.title || 'Άτιτλο Έργο'}</h3>
                                <Badge className={statusColors[project.status] || 'bg-muted text-muted-foreground'}>
                                  {statusLabels[project.status] || project.status || 'Σχεδιασμός'}
                                </Badge>
                                {project.priority && (
                                  <Badge className={priorityColors[project.priority] || 'bg-muted text-muted-foreground'} variant="outline">
                                    {project.priority === 'low' ? 'Χαμηλή' : project.priority === 'medium' ? 'Μεσαία' : project.priority === 'high' ? 'Υψηλή' : 'Επείγον'}
                                  </Badge>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{project.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {project.estimated_cost && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <DollarSign className="w-4 h-4 flex-shrink-0" />
                                <span>Εκτιμ.: {typeof project.estimated_cost === 'number' ? `€${project.estimated_cost.toLocaleString()}` : project.estimated_cost}</span>
                              </div>
                            )}
                            {project.final_cost && (
                              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium">
                                <DollarSign className="w-4 h-4 flex-shrink-0" />
                                <span>Τελικό: {typeof project.final_cost === 'number' ? `€${project.final_cost.toLocaleString()}` : project.final_cost}</span>
                              </div>
                            )}
                            {project.deadline && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                <span>{new Date(project.deadline).toLocaleDateString('el-GR')}</span>
                              </div>
                            )}
                            {project.selected_contractor && (
                              <div className="flex items-center gap-1.5 text-muted-foreground">
                                <Building className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{project.selected_contractor}</span>
                              </div>
                            )}
                            {projectOffers.length > 0 && (
                              <Badge variant="outline" className="text-yellow-700 dark:text-yellow-400 border-yellow-500/50">
                                <Award className="w-3 h-3 mr-1" />
                                {projectOffers.length} εκκρεμείς
                              </Badge>
                            )}
                            {approvedProjectOffers.length > 0 && (
                              <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-500/50">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                {approvedProjectOffers.length} εγκεκριμένη
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="flex-shrink-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/projects/${project.id}`);
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            Προβολή
                          </Button>
                          {(isAdmin || isManager) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={(e) => {
                                e.stopPropagation();
                                setProjectToDelete(project);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Διαγραφή Έργου</DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                Είστε σίγουροι ότι θέλετε να διαγράψετε το έργο <strong>&quot;{projectToDelete?.title}&quot;</strong>;
              </p>
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800 dark:text-amber-400 dark:text-amber-400">
                    <p className="font-semibold mb-1">Συνέπειες διαγραφής:</p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                      <li>Οι σχετιζόμενες προσφορές θα διαγραφούν</li>
                      <li>Οι ψηφοφορίες θα διαγραφούν</li>
                      <li>Οι δαπάνες που συνδέονται με το έργο θα παραμείνουν, αλλά η σύνδεση τους με το έργο θα διαγραφεί</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-sm text-destructive font-medium">
                Αυτή η ενέργεια δεν μπορεί να αναιρεθεί!
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectToDelete(null)} disabled={isDeleting}>
              Ακύρωση
            </Button>
            <Button
              onClick={handleDeleteProject}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
            >
              {isDeleting ? 'Διαγραφή...' : 'Διαγραφή Έργου'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProjectsDashboard() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <ProjectsDashboardContent />
      </SubscriptionGate>
    </AuthGate>
  );
}
