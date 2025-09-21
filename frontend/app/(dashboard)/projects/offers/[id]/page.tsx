'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, extractResults, getActiveBuildingId } from '@/lib/api';
import { getRelativeTimeEl } from '@/lib/date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  Award,
  Calendar,
  Clock,
  FileText,
  Building,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  ArrowLeft,
  Shield,
  DollarSign,
  Edit,
  Trash2
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  payment_method?: string;
  installments?: number;
  advance_payment?: number;
  warranty_period?: string;
  completion_time?: string;
  status: 'submitted' | 'under_review' | 'accepted' | 'rejected' | 'withdrawn';
  submitted_at: string;
  reviewed_at?: string;
  notes?: string;
  reviewed_by_name?: string;
  files: any[];
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
  rejected: <XCircle className="w-4 h-4" />,
  withdrawn: <Clock className="w-4 h-4" />,
};

export default function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  // Remove useBuildingEvents from this page as it's already used globally
  // useBuildingEvents();
  const { isAdmin, isManager } = useRole();
  const buildingId = getActiveBuildingId();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rejectNotes, setRejectNotes] = useState('');
  const unwrappedParams = React.use(params);

  const offerQ = useQuery({
    queryKey: ['offer', unwrappedParams.id],
    queryFn: async () => {
      return (await api.get(`/projects/offers/${unwrappedParams.id}/`)).data;
    }
  });

  const projectQ = useQuery({
    queryKey: ['project', offerQ.data?.project],
    queryFn: async () => {
      if (!offerQ.data?.project) return null;
      return (await api.get(`/projects/projects/${offerQ.data.project}/`)).data;
    },
    enabled: !!offerQ.data?.project
  });

  const approveMutation = useMutation({
    mutationFn: async () => {
      return await api.post(`/projects/offers/${unwrappedParams.id}/approve/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer', unwrappedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      queryClient.invalidateQueries({ queryKey: ['project', offerQ.data?.project] });
      toast({
        title: 'Επιτυχία',
        description: 'Η προσφορά εγκρίθηκε επιτυχώς',
      });
      router.push('/projects/offers');
    },
    onError: (error) => {
      toast({
        title: 'Σφάλμα',
        description: 'Αποτυχία έγκρισης προσφοράς',
        variant: 'destructive',
      });
    }
  });

  const rejectMutation = useMutation({
    mutationFn: async (notes: string) => {
      return await api.post(`/projects/offers/${unwrappedParams.id}/reject/`, { notes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offer', unwrappedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast({
        title: 'Επιτυχία',
        description: 'Η προσφορά απορρίφθηκε',
      });
      router.push('/projects/offers');
    },
    onError: (error) => {
      toast({
        title: 'Σφάλμα',
        description: 'Αποτυχία απόρριψης προσφοράς',
        variant: 'destructive',
      });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await api.delete(`/projects/offers/${unwrappedParams.id}/`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      toast({
        title: 'Επιτυχία',
        description: 'Η προσφορά διαγράφηκε επιτυχώς',
      });
      router.push('/projects/offers');
    },
    onError: (error) => {
      toast({
        title: 'Σφάλμα',
        description: 'Αποτυχία διαγραφής προσφοράς',
        variant: 'destructive',
      });
    }
  });

  const offer: Offer = offerQ.data;
  const project = projectQ.data;
  const loading = offerQ.isLoading || projectQ.isLoading;

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '€0,00';
    }
    return `€${amount.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
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

  if (!offer) {
    return (
      <div className="text-center py-12">
        <p>Η προσφορά δεν βρέθηκε.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost">
            <Link href="/projects/offers">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Πίσω
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Προσφορά</h1>
            <p className="text-muted-foreground">
              {offer.contractor_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={STATUS_COLORS[offer.status]}>
            {STATUS_ICONS[offer.status]}
            <span className="ml-1">{STATUS_LABELS[offer.status]}</span>
          </Badge>
          {(isAdmin || isManager) && (
            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/projects/offers/${offer.id}/edit`}>
                  <Edit className="w-4 h-4 mr-1" />
                  Επεξεργασία
                </Link>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="w-4 h-4 mr-1" />
                    Διαγραφή
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Διαγραφή Προσφοράς</AlertDialogTitle>
                    <AlertDialogDescription>
                      Είστε σίγουροι ότι θέλετε να διαγράψετε αυτή την προσφορά; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                    <AlertDialogAction onClick={() => deleteMutation.mutate()}>
                      Διαγραφή
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column - Main Info */}
        <div className="md:col-span-2 space-y-6">
          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle>Πληροφορίες Έργου</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Έργο</div>
                <div className="font-medium">{offer.project_title}</div>
              </div>
              {project && (
                <>
                  <div>
                    <div className="text-sm text-muted-foreground">Περιγραφή Έργου</div>
                    <div className="text-sm">{project.description}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Προϋπολογισμός Έργου</div>
                      <div className="font-medium">{formatCurrency(project.estimated_cost)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Προθεσμία Έργου</div>
                      <div className="font-medium">{project.deadline ? formatDate(project.deadline) : 'Δεν ορίστηκε'}</div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Offer Details */}
          <Card>
            <CardHeader>
              <CardTitle>Λεπτομέρειες Προσφοράς</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-muted-foreground">Ποσό Προσφοράς</div>
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(offer.amount)}</div>
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">Υποβλήθηκε</div>
                  <div className="font-medium">{formatDate(offer.submitted_at)}</div>
                </div>
              </div>

              {offer.description && (
                <div>
                  <div className="text-sm text-muted-foreground">Περιγραφή</div>
                  <div className="text-sm whitespace-pre-wrap">{offer.description}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {offer.completion_time && (
                  <div>
                    <div className="text-sm text-muted-foreground">Χρόνος Ολοκλήρωσης</div>
                    <div className="font-medium">{offer.completion_time}</div>
                  </div>
                )}
                {offer.warranty_period && (
                  <div>
                    <div className="text-sm text-muted-foreground">Περίοδος Εγγύησης</div>
                    <div className="font-medium">{offer.warranty_period}</div>
                  </div>
                )}
              </div>

              {offer.payment_terms && (
                <div>
                  <div className="text-sm text-muted-foreground">Όροι Πληρωμής</div>
                  <div className="text-sm whitespace-pre-wrap">{offer.payment_terms}</div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {offer.payment_method && (
                  <div>
                    <div className="text-sm text-muted-foreground">Τρόπος Πληρωμής</div>
                    <div className="font-medium">
                      {offer.payment_method === 'cash' && 'Μετρητά'}
                      {offer.payment_method === 'bank_transfer' && 'Τραπεζική Μεταφορά'}
                      {offer.payment_method === 'check' && 'Επιταγή'}
                      {offer.payment_method === 'card' && 'Κάρτα'}
                      {offer.payment_method === 'installments' && 'Δόσεις'}
                    </div>
                  </div>
                )}
                {offer.installments && offer.installments > 1 && (
                  <div>
                    <div className="text-sm text-muted-foreground">Αριθμός Δόσεων</div>
                    <div className="font-medium">{offer.installments}</div>
                  </div>
                )}
                {offer.advance_payment && offer.advance_payment > 0 && (
                  <div>
                    <div className="text-sm text-muted-foreground">Προκαταβολή</div>
                    <div className="font-medium text-green-600">{formatCurrency(offer.advance_payment)}</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Files */}
          {offer.files && offer.files.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Συνημμένα Αρχεία</CardTitle>
                <CardDescription>
                  {offer.files.length} αρχεία
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {offer.files.map((file: any) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <div className="text-sm font-medium">{file.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            {(file.file_size / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column - Contractor Info & Actions */}
        <div className="space-y-6">
          {/* Contractor Info */}
          <Card>
            <CardHeader>
              <CardTitle>Στοιχεία Συνεργείου</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-muted-foreground">Επωνυμία</div>
                <div className="font-medium">{offer.contractor_name}</div>
              </div>

              {offer.contractor_contact && (
                <div>
                  <div className="text-sm text-muted-foreground">Υπεύθυνος</div>
                  <div className="font-medium">{offer.contractor_contact}</div>
                </div>
              )}

              {offer.contractor_phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{offer.contractor_phone}</span>
                </div>
              )}

              {offer.contractor_email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{offer.contractor_email}</span>
                </div>
              )}

              {offer.contractor_address && (
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
                  <span className="text-sm">{offer.contractor_address}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {(isAdmin || isManager) && offer.status === 'submitted' && (
            <Card>
              <CardHeader>
                <CardTitle>Ενέργειες</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="default">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Έγκριση Προσφοράς
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Έγκριση Προσφοράς</AlertDialogTitle>
                      <AlertDialogDescription>
                        Είστε σίγουροι ότι θέλετε να εγκρίνετε αυτή την προσφορά;
                        Αυτό θα απορρίψει αυτόματα όλες τις άλλες προσφορές για το έργο.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                      <AlertDialogAction onClick={() => approveMutation.mutate()}>
                        Έγκριση
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="destructive">
                      <XCircle className="w-4 h-4 mr-2" />
                      Απόρριψη Προσφοράς
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Απόρριψη Προσφοράς</AlertDialogTitle>
                      <AlertDialogDescription>
                        Είστε σίγουροι ότι θέλετε να απορρίψετε αυτή την προσφορά;
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-3">
                      <label className="text-sm font-medium">Σημειώσεις (προαιρετικό)</label>
                      <Textarea
                        placeholder="Λόγος απόρριψης..."
                        value={rejectNotes}
                        onChange={(e) => setRejectNotes(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                      <AlertDialogAction onClick={() => rejectMutation.mutate(rejectNotes)}>
                        Απόρριψη
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          )}

          {/* Status Info */}
          {offer.reviewed_at && offer.reviewed_by_name && (
            <Card>
              <CardHeader>
                <CardTitle>Ιστορικό Αξιολόγησης</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="text-muted-foreground">Αξιολογήθηκε από: </span>
                    <span className="font-medium">{offer.reviewed_by_name}</span>
                  </div>
                  <div className="text-sm">
                    <span className="text-muted-foreground">Ημερομηνία: </span>
                    <span className="font-medium">{formatDate(offer.reviewed_at)}</span>
                  </div>
                  {offer.notes && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Σημειώσεις: </span>
                      <div className="mt-1 p-2 bg-muted rounded text-sm">{offer.notes}</div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}