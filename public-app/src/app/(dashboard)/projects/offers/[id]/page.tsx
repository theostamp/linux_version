'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useOffer, useOfferMutations } from '@/hooks/useOffers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/BackButton';
import { 
  Award, 
  Building, 
  Calendar, 
  DollarSign,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  FileText,
  User,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-yellow-100 text-yellow-700',
  under_review: 'bg-blue-100 text-blue-700',
  accepted: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
  withdrawn: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS: Record<string, string> = {
  submitted: 'Υποβλήθηκε',
  under_review: 'Υπό Αξιολόγηση',
  accepted: 'Εγκεκριμένη',
  rejected: 'Απορρίφθηκε',
  withdrawn: 'Ανακλήθηκε',
};

function formatCurrency(amount: number | string | null | undefined): string {
  if (!amount) return '€0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return '€0.00';
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
  }).format(num);
}

function formatDate(date: string | null | undefined): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return date;
  }
}

export default function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <OfferDetailPageContent offerId={resolvedParams.id} />
      </SubscriptionGate>
    </AuthGate>
  );
}

function OfferDetailPageContent({ offerId }: { offerId: string }) {
  const router = useRouter();
  const { toast } = useToast();
  
  const { data: offer, isLoading, isError, error } = useOffer(offerId);
  const { approve, reject } = useOfferMutations();

  const handleApprove = async () => {
    try {
      console.log('[Offer Detail] Approving offer:', offerId);
      const result = await approve.mutateAsync(offerId);
      console.log('[Offer Detail] ✓ Offer approved successfully:', result);
      
      toast({
        title: '✓ Η προσφορά εγκρίθηκε',
        description: 'Η προσφορά εγκρίθηκε επιτυχώς. Οι υπόλοιπες προσφορές απορρίφθηκαν αυτόματα και δημιουργήθηκαν οι σχετικές δαπάνες.',
      });
      router.refresh();
    } catch (error: any) {
      console.error('[Offer Detail] Approve error:', error);
      toast({
        title: 'Σφάλμα',
        description: error?.message || 'Αποτυχία έγκρισης προσφοράς',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async () => {
    try {
      await reject.mutateAsync({ offerId });
      toast({
        title: 'Η προσφορά απορρίφθηκε',
        description: 'Η προσφορά έχει απορριφθεί.',
      });
      router.refresh();
    } catch (error: any) {
      console.error('[Offer Detail] Reject error:', error);
      toast({
        title: 'Σφάλμα',
        description: error?.message || 'Αποτυχία απόρριψης προσφοράς',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError || !offer) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-6">
        <BackButton href="/projects/offers" label="Επιστροφή στις Προσφορές" size="sm" />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-semibold">Σφάλμα</h2>
                <p className="text-sm">Αποτυχία φόρτωσης προσφοράς: {error?.message || 'Άγνωστο σφάλμα'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <BackButton href="/projects/offers" label="Πίσω στις προσφορές" size="sm" />
            <Badge variant="outline" className="text-xs">
              Προσφορά #{offer.id.slice(0, 8)}
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Προσφορά Εργολάβου</h1>
          <p className="text-sm text-slate-500">
            {offer.contractor_name || 'Άγνωστος Εργολάβος'}
          </p>
        </div>
        {offer.status === 'submitted' && (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
              disabled={reject.isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              {reject.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="w-4 h-4 mr-2" />
              )}
              Απόρριψη
            </Button>
            <Button
              onClick={handleApprove}
              disabled={approve.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approve.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Έγκριση
            </Button>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge className={STATUS_COLORS[offer.status] || 'bg-gray-100 text-gray-700'} variant="outline">
                {STATUS_LABELS[offer.status] || offer.status}
              </Badge>
              {offer.submitted_at && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Υποβλήθηκε: {formatDate(offer.submitted_at)}</span>
                </div>
              )}
              {offer.reviewed_at && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4" />
                  <span>Αξιολογήθηκε: {formatDate(offer.reviewed_at)}</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contractor Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Στοιχεία Συνεργείου
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Εταιρεία / Εργολάβος</label>
                  <p className="text-lg font-semibold">{offer.contractor_name || '-'}</p>
                </div>
                {offer.contractor_contact && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Υπεύθυνος Επικοινωνίας</label>
                    <p className="text-lg">{offer.contractor_contact}</p>
                  </div>
                )}
                {offer.contractor_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Τηλέφωνο</label>
                      <p className="text-lg">{offer.contractor_phone}</p>
                    </div>
                  </div>
                )}
                {offer.contractor_email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Email</label>
                      <p className="text-lg">{offer.contractor_email}</p>
                    </div>
                  </div>
                )}
                {offer.contractor_address && (
                  <div className="flex items-center gap-2 md:col-span-2">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <label className="text-xs text-gray-500 uppercase tracking-wide">Διεύθυνση</label>
                      <p className="text-lg">{offer.contractor_address}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Financial Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Οικονομικά Στοιχεία
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Ποσό Προσφοράς</label>
                  <p className="text-2xl font-bold text-green-700">{formatCurrency(offer.amount)}</p>
                </div>
                {offer.advance_payment && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Προκαταβολή</label>
                    <p className="text-2xl font-bold text-blue-700">{formatCurrency(offer.advance_payment)}</p>
                  </div>
                )}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Τρόπος Πληρωμής</label>
                  <p className="text-lg font-semibold">
                    {offer.payment_method === 'one_time' ? 'Εφάπαξ' : 
                     offer.payment_method === 'installments' ? 'Δόσεις' :
                     offer.payment_method === 'milestones' ? 'Ορόσημα' : 
                     offer.payment_method || 'Άλλο'}
                  </p>
                  {offer.installments && offer.installments > 1 && (
                    <p className="text-sm text-gray-600 mt-1">{offer.installments} δόσεις</p>
                  )}
                </div>
                {offer.completion_time && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Χρόνος Ολοκλήρωσης</label>
                    <p className="text-lg font-semibold">{offer.completion_time}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Description */}
          {offer.description && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Περιγραφή Εργασιών
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{offer.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Payment Terms */}
          {offer.payment_terms && (
            <Card>
              <CardHeader>
                <CardTitle>Όροι Πληρωμής / Σημειώσεις</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{offer.payment_terms}</p>
              </CardContent>
            </Card>
          )}

          {/* Warranty */}
          {offer.warranty_period && (
            <Card>
              <CardHeader>
                <CardTitle>Περίοδος Εγγύησης</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{offer.warranty_period}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Project Link */}
          {offer.project && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Συνδεδεμένο Έργο</CardTitle>
              </CardHeader>
              <CardContent>
                <Link 
                  href={`/projects/${offer.project}`}
                  className="text-blue-600 hover:underline font-medium"
                >
                  {offer.project_title || 'Άγνωστο Έργο'}
                </Link>
                {offer.building_name && (
                  <p className="text-sm text-gray-600 mt-1">{offer.building_name}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Review Info */}
          {offer.reviewed_by_name && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Αξιολόγηση</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">
                  Αξιολογήθηκε από: <span className="font-medium">{offer.reviewed_by_name}</span>
                </p>
                {offer.reviewed_at && (
                  <p className="text-sm text-gray-600 mt-1">
                    {formatDate(offer.reviewed_at)}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {offer.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Σημειώσεις</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{offer.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}


