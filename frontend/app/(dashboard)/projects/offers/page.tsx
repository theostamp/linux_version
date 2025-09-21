'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { api, extractCount, extractResults, getActiveBuildingId } from '@/lib/api';
import { getRelativeTimeEl } from '@/lib/date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Award,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Building,
  Plus,
  Search,
  Filter,
  Phone,
  Mail,
  MapPin,
  MoreVertical,
  Edit,
  Trash2,
  Eye
} from 'lucide-react';
import Link from 'next/link';
import { useBuildingEvents } from '@/lib/useBuildingEvents';
import { useRole } from '@/lib/auth';

interface Offer {
  id: string;
  project: string;
  project_title: string;
  building_name: string;
  contractor_name: string;
  contractor_contact?: string;
  contractor_phone?: string;
  contractor_email?: string;
  contractor_address?: string;
  amount: number;
  description?: string;
  payment_terms?: string;
  warranty_period?: string;
  completion_time?: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';
  submitted_at: string;
  reviewed_at?: string;
  notes?: string;
  reviewed_by_name?: string;
  files_count: number;
}

const STATUS_LABELS = {
  submitted: 'Υποβλήθηκε',
  under_review: 'Υπό Αξιολόγηση',
  accepted: 'Εγκεκριμένη',
  rejected: 'Απορρίφθηκε',
  withdrawn: 'Ανακλήθηκε',
};

const STATUS_COLORS = {
  submitted: 'bg-blue-100 text-blue-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};

const STATUS_ICONS = {
  submitted: <Clock className="w-4 h-4" />,
  under_review: <AlertTriangle className="w-4 h-4" />,
  accepted: <CheckCircle className="w-4 h-4" />,
  rejected: <AlertTriangle className="w-4 h-4" />,
  withdrawn: <Clock className="w-4 h-4" />,
};

export default function OffersListPage() {
  useBuildingEvents();
  const { isAdmin, isManager } = useRole();
  const buildingId = getActiveBuildingId();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(searchParams.get('status') || '');
  const [projectFilter, setProjectFilter] = useState<string>('');

  const offersQ = useQuery({
    queryKey: ['offers', { building: buildingId, search: searchTerm, status: statusFilter, project: projectFilter }],
    queryFn: async () => {
      const params: any = { building: buildingId, page_size: 1000 };
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.project = projectFilter;
      return (await api.get('/projects/offers/', { params })).data;
    }
  });

  const projectsQ = useQuery({
    queryKey: ['projects', { building: buildingId }],
    queryFn: async () => {
      return (await api.get('/projects/projects/', { params: { building: buildingId, page_size: 1000 } })).data;
    }
  });

  const offers = extractResults<Offer>(offersQ.data ?? []);
  const projects = extractResults<any>(projectsQ.data ?? []);
  const loading = offersQ.isLoading || projectsQ.isLoading;

  const formatCurrency = (amount: number) => {
    return `€${amount.toLocaleString()}`;
  };

  const formatDate = (dateString: string) => {
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
          <h1 className="text-3xl font-bold tracking-tight">Προσφορές</h1>
          <p className="text-muted-foreground">
            Διαχείριση προσφορών από συνεργεία
          </p>
        </div>
        {(isAdmin || isManager) && (
          <Button asChild>
            <Link href="/projects/offers/new">
              <Plus className="w-4 h-4 mr-2" />
              Νέα Προσφορά
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
                  placeholder="Αναζήτηση προσφορών..."
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
              <label className="block text-sm font-medium mb-1">Έργο</label>
              <select
                value={projectFilter}
                onChange={(e) => setProjectFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="">Όλα τα έργα</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setProjectFilter('');
                }}
                className="w-full"
              >
                Καθαρισμός
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Offers Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <Card key={offer.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">{offer.contractor_name}</CardTitle>
                  <CardDescription className="mt-1">
                    {offer.project_title}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-1">
                  {STATUS_ICONS[offer.status]}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={STATUS_COLORS[offer.status]}>
                  {STATUS_LABELS[offer.status]}
                </Badge>
                <Badge variant="outline">
                  {formatCurrency(offer.amount)}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {offer.description && (
                <div className="text-sm text-muted-foreground line-clamp-2">
                  {offer.description}
                </div>
              )}
              
              <div className="space-y-2 text-sm">
                {offer.contractor_phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-3 h-3" />
                    {offer.contractor_phone}
                  </div>
                )}
                {offer.contractor_email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-3 h-3" />
                    {offer.contractor_email}
                  </div>
                )}
                {offer.contractor_address && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span className="line-clamp-1">{offer.contractor_address}</span>
                  </div>
                )}
              </div>

              {offer.completion_time && (
                <div className="text-sm">
                  <div className="font-medium">Χρόνος Ολοκλήρωσης</div>
                  <div className="text-muted-foreground">{offer.completion_time}</div>
                </div>
              )}

              {offer.warranty_period && (
                <div className="text-sm">
                  <div className="font-medium">Εγγύηση</div>
                  <div className="text-muted-foreground">{offer.warranty_period}</div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    {offer.files_count} αρχεία
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" />
                    {offer.building_name}
                  </span>
                </div>
                <div>
                  {getRelativeTimeEl(new Date(offer.submitted_at))}
                </div>
              </div>

              {offer.reviewed_at && offer.reviewed_by_name && (
                <div className="text-sm text-muted-foreground">
                  Αξιολογήθηκε από {offer.reviewed_by_name} στις {formatDate(offer.reviewed_at)}
                </div>
              )}

              <div className="pt-2 flex gap-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href={`/projects/offers/${offer.id}`}>
                    <Eye className="w-4 h-4" />
                  </Link>
                </Button>
                {(isAdmin || isManager) && (
                  <>
                    <Button asChild variant="outline" size="sm" className="flex-1">
                      <Link href={`/projects/offers/${offer.id}/edit`}>
                        <Edit className="w-4 h-4" />
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {offers.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Award className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Δεν βρέθηκαν προσφορές</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || statusFilter || projectFilter
                ? 'Δοκιμάστε να αλλάξετε τα φίλτρα σας.'
                : 'Ξεκινήστε δημιουργώντας την πρώτη προσφορά.'}
            </p>
            {(isAdmin || isManager) && (
              <Button asChild>
                <Link href="/projects/offers/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Δημιουργία Προσφοράς
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}