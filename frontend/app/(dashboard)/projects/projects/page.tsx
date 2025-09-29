'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, extractCount, extractResults, getActiveBuildingId } from '@/lib/api';
import { getRelativeTimeEl } from '@/lib/date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  FileText, 
  Calendar, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Award,
  Building,
  Plus,
  Search,
  Filter
} from 'lucide-react';
import Link from 'next/link';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { useRole } from '@/lib/auth';

interface Project {
  id: string;
  title: string;
  description: string;
  building: number;
  building_name: string;
  estimated_cost?: number;
  final_cost?: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'planning' | 'tendering' | 'evaluation' | 'approved' | 'in_progress' | 'completed' | 'cancelled';
  created_at: string;
  updated_at: string;
  deadline?: string;
  tender_deadline?: string;
  general_assembly_date?: string;
  selected_contractor?: string;
  payment_terms?: string;
  created_by_name?: string;
  offers_count: number;
  votes_count: number;
}

const STATUS_LABELS = {
  planning: 'Σχεδιασμός',
  tendering: 'Διαγωνισμός',
  evaluation: 'Αξιολόγηση',
  approved: 'Εγκεκριμένο',
  in_progress: 'Σε Εξέλιξη',
  completed: 'Ολοκληρωμένο',
  cancelled: 'Ακυρωμένο',
};

const PRIORITY_LABELS = {
  low: 'Χαμηλή',
  medium: 'Μεσαία',
  high: 'Υψηλή',
  urgent: 'Επείγον',
};

const STATUS_COLORS = {
  planning: 'bg-blue-100 text-blue-800',
  tendering: 'bg-yellow-100 text-yellow-800',
  evaluation: 'bg-orange-100 text-orange-800',
  approved: 'bg-green-100 text-green-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

export default function ProjectsListPage() {
  useBuildingEvents();
  const { isAdmin, isManager } = useRole();
  const buildingId = getActiveBuildingId();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');

  const projectsQ = useQuery({ 
    queryKey: ['projects', { building: buildingId, search: searchTerm, status: statusFilter, priority: priorityFilter }], 
    queryFn: async () => {
      const params: any = { building: buildingId, page_size: 1000 };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      return (await api.get('/projects/projects/', { params })).data;
    }
  });

  const projects = extractResults<Project>(projectsQ.data ?? []);
  const loading = projectsQ.isLoading;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'in_progress':
        return <Clock className="w-4 h-4" />;
      case 'cancelled':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount?: number) => {
    if (!amount) return '—';
    return `€${amount.toLocaleString()}`;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('el-GR');
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
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Έργα</h1>
          <p className="text-muted-foreground">
            Διαχείριση έργων και συντηρήσεων
          </p>
        </div>
        {(isAdmin || isManager) && (
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="w-4 h-4 mr-2" />
              Νέο Έργο
            </Link>
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Φίλτρα
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <label className="block text-sm font-medium mb-1">Αναζήτηση</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Αναζήτηση έργων..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Κατάσταση</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Όλες οι καταστάσεις</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Προτεραιότητα</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Όλες οι προτεραιότητες</option>
                {Object.entries(PRIORITY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setPriorityFilter('');
                }}
                className="w-full"
              >
                Καθαρισμός
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{project.title}</CardTitle>
                  <CardDescription className="mt-1">
                    {project.building_name}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {getStatusIcon(project.status)}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={STATUS_COLORS[project.status]}>
                  {STATUS_LABELS[project.status]}
                </Badge>
                <Badge variant="outline" className={PRIORITY_COLORS[project.priority]}>
                  {PRIORITY_LABELS[project.priority]}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm text-muted-foreground line-clamp-2">
                {project.description}
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Εκτιμώμενο Κόστος</div>
                  <div className="text-muted-foreground">{formatCurrency(project.estimated_cost)}</div>
                </div>
                <div>
                  <div className="font-medium">Τελικό Κόστος</div>
                  <div className="text-muted-foreground">{formatCurrency(project.final_cost)}</div>
                </div>
              </div>

              {project.deadline && (
                <div className="text-sm">
                  <div className="font-medium">Προθεσμία</div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(project.deadline)}
                  </div>
                </div>
              )}

              {project.selected_contractor && (
                <div className="text-sm">
                  <div className="font-medium">Αναδόχος</div>
                  <div className="text-muted-foreground">{project.selected_contractor}</div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    {project.offers_count} προσφορές
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {project.votes_count} ψήφοι
                  </span>
                </div>
                <div>
                  {getRelativeTimeEl(new Date(project.updated_at))}
                </div>
              </div>

              <div className="pt-2">
                <Button asChild variant="outline" className="w-full">
                  <Link href={`/projects/${project.id}`}>
                    Προβολή Λεπτομερειών
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {projects.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Δεν βρέθηκαν έργα</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter || priorityFilter
                ? 'Δοκιμάστε να αλλάξετε τα φίλτρα σας.'
                : 'Ξεκινήστε δημιουργώντας το πρώτο σας έργο.'}
            </p>
            {(isAdmin || isManager) && (
              <Button asChild>
                <Link href="/projects/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Δημιουργία Έργου
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}


