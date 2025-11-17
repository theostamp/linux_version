'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/BackButton';
import { 
  Calendar, 
  DollarSign, 
  MapPin, 
  Clock,
  Video,
  Users,
  FileText,
  AlertCircle,
  Loader2
} from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700',
  tendering: 'bg-blue-100 text-blue-700',
  evaluation: 'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const STATUS_LABELS: Record<string, string> = {
  planning: 'Σχεδιασμός',
  tendering: 'Διαγωνισμός',
  evaluation: 'Αξιολόγηση',
  approved: 'Εγκεκριμένο',
  in_progress: 'Σε Εξέλιξη',
  completed: 'Ολοκληρωμένο',
  cancelled: 'Ακυρωμένο',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const PRIORITY_LABELS: Record<string, string> = {
  low: 'Χαμηλή',
  medium: 'Μεσαία',
  high: 'Υψηλή',
  urgent: 'Επείγον',
};

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => {
      const response = await api.get(`/projects/${projectId}/`);
      return response.data;
    },
    enabled: !!projectId,
  });

  if (isLoading) {
    return (
      <AuthGate>
        <SubscriptionGate>
          <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          </div>
        </SubscriptionGate>
      </AuthGate>
    );
  }

  if (error || !project) {
    return (
      <AuthGate>
        <SubscriptionGate>
          <div className="max-w-5xl mx-auto space-y-6">
            <BackButton href="/projects" label="Επιστροφή" size="sm" />
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4 text-red-600">
                  <AlertCircle className="h-6 w-6" />
                  <div>
                    <h2 className="text-xl font-semibold">Σφάλμα</h2>
                    <p className="text-sm">Δεν βρέθηκε το έργο ή προέκυψε σφάλμα κατά τη φόρτωση.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </SubscriptionGate>
      </AuthGate>
    );
  }

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (!amount) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `€${num.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <AuthGate>
      <SubscriptionGate>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <BackButton href="/projects" label="Επιστροφή" size="sm" />
            <div className="flex-1">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{project.title}</h1>
              <div className="flex items-center gap-2 mt-2">
                <Badge className={STATUS_COLORS[project.status] || 'bg-gray-100 text-gray-700'}>
                  {STATUS_LABELS[project.status] || project.status}
                </Badge>
                <Badge className={PRIORITY_COLORS[project.priority] || 'bg-gray-100 text-gray-700'}>
                  {PRIORITY_LABELS[project.priority] || project.priority}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Περιγραφή
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">
                  {project.description || 'Δεν έχει δοθεί περιγραφή'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Οικονομικά Στοιχεία
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Εκτιμώμενο Κόστος:</span>
                  <span className="font-semibold">{formatCurrency(project.estimated_cost)}</span>
                </div>
                {project.final_cost && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Τελικό Κόστος:</span>
                    <span className="font-semibold text-green-600">{formatCurrency(project.final_cost)}</span>
                  </div>
                )}
                {project.payment_terms && (
                  <div>
                    <span className="text-sm text-gray-600">Όροι Πληρωμής:</span>
                    <p className="text-sm mt-1 whitespace-pre-wrap">{project.payment_terms}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Ημερομηνίες
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Προθεσμία:</span>
                  <span className="font-semibold">{formatDate(project.deadline)}</span>
                </div>
                {project.tender_deadline && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Προθεσμία Προσφορών:</span>
                    <span className="font-semibold">{formatDate(project.tender_deadline)}</span>
                  </div>
                )}
                {project.general_assembly_date && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Ημερομηνία Γ.Σ.:</span>
                    <span className="font-semibold">{formatDate(project.general_assembly_date)}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {(project.assembly_is_online || project.assembly_is_physical) && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Στοιχεία Συνέλευσης
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {project.assembly_time && (
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{project.assembly_time}</span>
                    </div>
                  )}
                  {project.assembly_location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{project.assembly_location}</span>
                    </div>
                  )}
                  {project.assembly_is_online && project.assembly_zoom_link && (
                    <div className="flex items-center gap-2">
                      <Video className="w-4 h-4 text-gray-500" />
                      <a 
                        href={project.assembly_zoom_link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        Σύνδεσμος Zoom
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex items-center justify-end gap-3">
            <Button variant="outline" onClick={() => router.push('/projects')}>
              Επιστροφή στη Λίστα
            </Button>
            {project.status !== 'completed' && project.status !== 'cancelled' && (
              <Button onClick={() => router.push(`/projects/${projectId}/edit`)}>
                Επεξεργασία
              </Button>
            )}
          </div>
        </div>
      </SubscriptionGate>
    </AuthGate>
  );
}

