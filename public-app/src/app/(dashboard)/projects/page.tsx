'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useProjects, useProjectMutations } from '@/hooks/useProjects';
import { useOffers } from '@/hooks/useOffers';
import { getRelativeTimeEl } from '@/lib/date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  const buildingId = currentBuilding?.id ?? selectedBuilding?.id ?? null;
  
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
      icon: <CheckCircle className="w-4 h-4 text-green-600" />,
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
      icon: <FileCheck className="w-4 h-4 text-green-600" />,
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

    const cardContent = (
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
    );

    return href ? (
      <Link href={href} className="block hover:shadow-md transition-shadow" onClick={handleClick}>
        {cardContent}
      </Link>
    ) : (
      cardContent
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Προσφορές & Έργα</h1>
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

      {/* Main Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
            <Button 
              variant="outline" 
              className="h-auto p-4 flex-col"
              onClick={() => {
                const element = document.getElementById('projects-list');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } else {
                  router.push('/projects#projects-list');
                }
              }}
            >
              <FileText className="w-6 h-6 mb-2" />
              <span>Όλα τα Έργα</span>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/projects/offers">
                <Award className="w-6 h-6 mb-2" />
                <span>Προσφορές</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/projects">
                <Users className="w-6 h-6 mb-2" />
                <span>Συμβόλαια</span>
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto p-4 flex-col">
              <Link href="/projects">
                <TrendingUp className="w-6 h-6 mb-2" />
                <span>Αναφορές</span>
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
          {activityItems.length === 0 ? (
            <div className="text-sm text-muted-foreground">Δεν υπάρχουν πρόσφατες ενέργειες.</div>
          ) : (
            <div className="space-y-4">
              {activityItems.slice(0, 3).map((item) => (
                <div key={item.key} className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${item.bgClass}`}>
                    {item.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.text}</p>
                    <p className="text-xs text-muted-foreground">{getRelativeTimeEl(item.date)}</p>
                  </div>
                  <Badge variant={item.badge.variant}>{item.badge.label}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Projects List */}
      <Card id="projects-list">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Όλα τα Έργα</CardTitle>
              <CardDescription>
                {filteredProjects.length} από {projects.length} έργα
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
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
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-wrap gap-4">
              {/* Search */}
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="flex gap-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredProjects.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery || statusFilter !== 'all' || priorityFilter !== 'all' ? (
                <>
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Δεν βρέθηκαν έργα</h3>
                  <p className="text-sm text-gray-600 mb-4">
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
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Δεν υπάρχουν έργα</h3>
                  <p className="text-sm text-gray-600 mb-4">
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
                  low: 'bg-gray-100 text-gray-700',
                  medium: 'bg-blue-100 text-blue-700',
                  high: 'bg-orange-100 text-orange-700',
                  urgent: 'bg-red-100 text-red-700',
                };
                
                const statusColors: Record<string, string> = {
                  completed: 'bg-green-100 text-green-700',
                  in_progress: 'bg-blue-100 text-blue-700',
                  approved: 'bg-purple-100 text-purple-700',
                  planning: 'bg-gray-100 text-gray-700',
                  tendering: 'bg-yellow-100 text-yellow-700',
                  evaluation: 'bg-amber-100 text-amber-700',
                  cancelled: 'bg-red-100 text-red-700',
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
                              <Badge className={statusColors[project.status] || 'bg-gray-100 text-gray-700'} variant="outline">
                                {statusLabels[project.status] || project.status || 'Σχεδιασμός'}
                              </Badge>
                              {project.priority && (
                                <Badge className={priorityColors[project.priority] || 'bg-gray-100 text-gray-700'} variant="outline">
                                  {project.priority === 'low' ? 'Χαμηλή' : project.priority === 'medium' ? 'Μεσαία' : project.priority === 'high' ? 'Υψηλή' : 'Επείγον'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="flex-1 flex flex-col">
                        {project.description && (
                          <p className="text-sm text-gray-600 mb-4 line-clamp-3 flex-1">{project.description}</p>
                        )}
                        <div className="space-y-2 text-sm">
                          {project.estimated_cost && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <DollarSign className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">Εκτιμ.: {typeof project.estimated_cost === 'number' ? `€${project.estimated_cost.toLocaleString()}` : project.estimated_cost}</span>
                            </div>
                          )}
                          {project.final_cost && (
                            <div className="flex items-center gap-2 text-green-600 font-medium">
                              <DollarSign className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">Τελικό: {typeof project.final_cost === 'number' ? `€${project.final_cost.toLocaleString()}` : project.final_cost}</span>
                            </div>
                          )}
                          {project.deadline && (
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate">{new Date(project.deadline).toLocaleDateString('el-GR')}</span>
                            </div>
                          )}
                          {(projectOffers.length > 0 || approvedProjectOffers.length > 0) && (
                            <div className="flex items-center gap-2 pt-2 border-t">
                              {projectOffers.length > 0 && (
                                <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                  <Award className="w-3 h-3 mr-1" />
                                  {projectOffers.length}
                                </Badge>
                              )}
                              {approvedProjectOffers.length > 0 && (
                                <Badge variant="outline" className="text-green-700 border-green-300">
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
                                <Badge className={statusColors[project.status] || 'bg-gray-100 text-gray-700'}>
                                  {statusLabels[project.status] || project.status || 'Σχεδιασμός'}
                                </Badge>
                                {project.priority && (
                                  <Badge className={priorityColors[project.priority] || 'bg-gray-100 text-gray-700'} variant="outline">
                                    {project.priority === 'low' ? 'Χαμηλή' : project.priority === 'medium' ? 'Μεσαία' : project.priority === 'high' ? 'Υψηλή' : 'Επείγον'}
                                  </Badge>
                                )}
                              </div>
                              {project.description && (
                                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{project.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 text-sm">
                            {project.estimated_cost && (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <DollarSign className="w-4 h-4 flex-shrink-0" />
                                <span>Εκτιμ.: {typeof project.estimated_cost === 'number' ? `€${project.estimated_cost.toLocaleString()}` : project.estimated_cost}</span>
                              </div>
                            )}
                            {project.final_cost && (
                              <div className="flex items-center gap-1.5 text-green-600 font-medium">
                                <DollarSign className="w-4 h-4 flex-shrink-0" />
                                <span>Τελικό: {typeof project.final_cost === 'number' ? `€${project.final_cost.toLocaleString()}` : project.final_cost}</span>
                              </div>
                            )}
                            {project.deadline && (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Calendar className="w-4 h-4 flex-shrink-0" />
                                <span>{new Date(project.deadline).toLocaleDateString('el-GR')}</span>
                              </div>
                            )}
                            {project.selected_contractor && (
                              <div className="flex items-center gap-1.5 text-gray-600">
                                <Building className="w-4 h-4 flex-shrink-0" />
                                <span className="truncate max-w-[200px]">{project.selected_contractor}</span>
                              </div>
                            )}
                            {projectOffers.length > 0 && (
                              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                                <Award className="w-3 h-3 mr-1" />
                                {projectOffers.length} εκκρεμείς
                              </Badge>
                            )}
                            {approvedProjectOffers.length > 0 && (
                              <Badge variant="outline" className="text-green-700 border-green-300">
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
                              className="flex-shrink-0 text-red-600 hover:text-red-700 hover:bg-red-50"
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
        </CardContent>
      </Card>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={!!projectToDelete} onOpenChange={(open) => !open && setProjectToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Διαγραφή Έργου</DialogTitle>
            <DialogDescription className="space-y-3">
              <p>
                Είστε σίγουροι ότι θέλετε να διαγράψετε το έργο <strong>&quot;{projectToDelete?.title}&quot;</strong>;
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Συνέπειες διαγραφής:</p>
                    <ul className="list-disc list-inside space-y-1 ml-1">
                      <li>Οι σχετιζόμενες προσφορές θα διαγραφούν</li>
                      <li>Οι ψηφοφορίες θα διαγραφούν</li>
                      <li>Οι δαπάνες που συνδέονται με το έργο θα παραμείνουν, αλλά η σύνδεση τους με το έργο θα διαγραφεί</li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="text-sm text-red-600 font-medium">
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