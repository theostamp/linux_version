'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useOffers, useOfferMutations } from '@/hooks/useOffers';
import { getActiveBuildingId } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BackButton } from '@/components/ui/BackButton';
import { 
  Award, 
  Building, 
  Calendar, 
  DollarSign,
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  AlertCircle,
  Search,
  ArrowUpDown,
  Filter,
  Trash2,
} from 'lucide-react';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useToast } from '@/hooks/use-toast';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { RefreshButton } from '@/components/ui/RefreshButton';

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

export default function OffersPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <OffersPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}

function OffersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const buildingId = getActiveBuildingId();
  
  const statusFilter = searchParams.get('status') || undefined;
  const [selectedStatus, setSelectedStatus] = useState<string>(statusFilter || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'contractor'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [offerToDelete, setOfferToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { offers, isLoading, isError } = useOffers({
    buildingId,
    status: selectedStatus !== 'all' ? selectedStatus : undefined,
    pageSize: 1000,
  });

  const { approve, reject, delete: deleteOffer } = useOfferMutations();
  
  // Filtered and sorted offers
  const filteredOffers = useMemo(() => {
    let filtered = [...offers];
    
    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((o: any) => 
        o.contractor_name?.toLowerCase().includes(query) ||
        o.project_title?.toLowerCase().includes(query) ||
        o.description?.toLowerCase().includes(query)
      );
    }
    
    // Sorting
    filtered.sort((a: any, b: any) => {
      let aVal: any, bVal: any;
      
      switch (sortBy) {
        case 'contractor':
          aVal = a.contractor_name || '';
          bVal = b.contractor_name || '';
          break;
        case 'amount':
          aVal = parseFloat(a.amount || '0');
          bVal = parseFloat(b.amount || '0');
          break;
        case 'date':
        default:
          aVal = new Date(a.submitted_at || a.created_at || 0).getTime();
          bVal = new Date(b.submitted_at || b.created_at || 0).getTime();
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
  }, [offers, searchQuery, sortBy, sortOrder]);

  const handleApprove = async (offerId: string | number) => {
    try {
      console.log('[Offers List] Approving offer:', offerId);
      const result = await approve.mutateAsync(offerId);
      console.log('[Offers List] ✓ Offer approved successfully:', result);
      
      toast({
        title: '✓ Η προσφορά εγκρίθηκε',
        description: 'Η προσφορά εγκρίθηκε επιτυχώς. Οι υπόλοιπες προσφορές απορρίφθηκαν αυτόματα και δημιουργήθηκαν οι σχετικές δαπάνες.',
      });
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error?.message || 'Η έγκριση της προσφοράς απέτυχε.',
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (offerId: string | number) => {
    try {
      await reject.mutateAsync({ offerId });
      toast({
        title: 'Η προσφορά απορρίφθηκε',
        description: 'Η προσφορά απορρίφθηκε επιτυχώς.',
      });
    } catch (error: any) {
      toast({
        title: 'Σφάλμα',
        description: error?.message || 'Η απόρριψη της προσφοράς απέτυχε.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteOffer = async () => {
    if (!offerToDelete) return;
    
    setIsDeleting(true);
    try {
      await deleteOffer.mutateAsync(offerToDelete.id);
      setOfferToDelete(null);
      toast({
        title: 'Επιτυχής Διαγραφή',
        description: 'Η προσφορά διαγράφηκε επιτυχώς.',
      });
    } catch (error: any) {
      console.error('Failed to delete offer:', error);
      toast({
        title: 'Σφάλμα',
        description: error?.message || 'Η διαγραφή της προσφοράς απέτυχε.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (amount: number | string | null | undefined) => {
    if (!amount) return '-';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `€${num.toLocaleString('el-GR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('el-GR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <BackButton href="/projects" label="Επιστροφή" size="sm" />
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 text-red-600">
              <AlertCircle className="h-6 w-6" />
              <div>
                <h2 className="text-xl font-semibold">Σφάλμα</h2>
                <p className="text-sm">Αποτυχία φόρτωσης προσφορών.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <BackButton href="/projects" label="Επιστροφή στα έργα" size="sm" />
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Προσφορές</h1>
          <p className="text-sm text-muted-foreground">
            Διαχείριση προσφορών εργολάβων για τα έργα
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
          <Button asChild>
            <a href="/projects/offers/new">
              <Award className="w-4 h-4 mr-2" />
              Νέα Προσφορά
            </a>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Φίλτρα & Αναζήτηση</CardTitle>
          <CardDescription>
            {filteredOffers.length} από {offers.length} προσφορές
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Αναζήτηση προσφορών..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Status Filter */}
            <Select
              value={selectedStatus}
              onValueChange={(value) => {
                setSelectedStatus(value);
                const params = new URLSearchParams(searchParams.toString());
                if (value === 'all') {
                  params.delete('status');
                } else {
                  params.set('status', value);
                }
                router.push(`/projects/offers?${params.toString()}`);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Κατάσταση" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλες οι Προσφορές</SelectItem>
                <SelectItem value="submitted">Υποβλήθηκε</SelectItem>
                <SelectItem value="under_review">Υπό Αξιολόγηση</SelectItem>
                <SelectItem value="accepted">Εγκεκριμένη</SelectItem>
                <SelectItem value="rejected">Απορρίφθηκε</SelectItem>
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
                <SelectItem value="date-desc">Νεότερες πρώτα</SelectItem>
                <SelectItem value="date-asc">Παλαιότερες πρώτα</SelectItem>
                <SelectItem value="amount-desc">Μεγαλύτερο ποσό</SelectItem>
                <SelectItem value="amount-asc">Μικρότερο ποσό</SelectItem>
                <SelectItem value="contractor-asc">Συνεργείο (Α-Ω)</SelectItem>
                <SelectItem value="contractor-desc">Συνεργείο (Ω-Α)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Offers List */}
      {isLoading ? (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4 animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                  <div className="flex gap-4">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : filteredOffers.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              {searchQuery || selectedStatus !== 'all' ? (
                <>
                  <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Δεν βρέθηκαν προσφορές</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Δοκιμάστε να αλλάξετε τα φίλτρα αναζήτησης.
                  </p>
                  <Button variant="outline" onClick={() => {
                    setSearchQuery('');
                    setSelectedStatus('all');
                  }}>
                    Καθαρισμός Φίλτρων
                  </Button>
                </>
              ) : (
                <>
                  <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Δεν υπάρχουν προσφορές</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Δεν έχουν καταχωρηθεί προσφορές ακόμα.
                  </p>
                  <Button asChild>
                    <a href="/projects/offers/new">
                      <Award className="w-4 h-4 mr-2" />
                      Δημιουργία Προσφοράς
                    </a>
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredOffers.map((offer: any) => (
            <Card key={offer.id} className="hover:shadow-lg transition-all">
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <CardTitle className="text-lg truncate">{offer.contractor_name || 'Άγνωστος Εργολάβος'}</CardTitle>
                      <Badge className={STATUS_COLORS[offer.status] || 'bg-gray-100 text-gray-700'}>
                        {STATUS_LABELS[offer.status] || offer.status}
                      </Badge>
                    </div>
                    {offer.project_title && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <Building className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{offer.project_title}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <DollarSign className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wide">Ποσό</div>
                      <div className="font-bold text-lg">{formatCurrency(offer.amount)}</div>
                    </div>
                  </div>
                  {offer.submitted_at && (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground uppercase tracking-wide">Ημερομηνία Υποβολής</div>
                        <div className="font-semibold">{formatDate(offer.submitted_at)}</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {offer.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2 p-3 bg-gray-50 rounded-lg">{offer.description}</p>
                )}
                
                {offer.payment_method && (
                  <div className="mb-4">
                    <Badge variant="outline" className="text-xs">
                      {offer.payment_method === 'one_time' ? 'Εφάπαξ' : 
                       offer.payment_method === 'installments' ? 'Δόσεις' :
                       offer.payment_method === 'milestones' ? 'Ορόσημα' : 'Άλλο'}
                    </Badge>
                    {offer.installments && offer.installments > 1 && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({offer.installments} δόσεις)
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/projects/offers/${offer.id}`)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Προβολή
                  </Button>
                  {offer.status === 'submitted' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleReject(offer.id)}
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
                        size="sm"
                        onClick={() => handleApprove(offer.id)}
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
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setOfferToDelete(offer);
                    }}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!offerToDelete}
        onOpenChange={(open) => !open && setOfferToDelete(null)}
        title="Διαγραφή Προσφοράς"
        description={
          offerToDelete
            ? `Είστε σίγουροι ότι θέλετε να διαγράψετε την προσφορά από "${offerToDelete.contractor_name || 'Άγνωστο Συνεργείο'}" για το έργο "${offerToDelete.project_title || 'Άγνωστο Έργο'}" (Ποσό: ${formatCurrency(offerToDelete.amount)})${offerToDelete.status === 'accepted' ? ' - ΠΡΟΣΟΧΗ: Η προσφορά έχει εγκριθεί!' : ''}? Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
            : 'Είστε σίγουροι;'
        }
        confirmText="Διαγραφή Προσφοράς"
        cancelText="Ακύρωση"
        confirmVariant="destructive"
        isConfirmLoading={isDeleting}
        onConfirm={handleDeleteOffer}
      />
    </div>
  );
}

