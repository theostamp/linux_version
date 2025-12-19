'use client';

import { useState, useMemo } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Wallet, Send, Eye } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { notificationsApi } from '@/lib/api/notifications';
import { fetchApartmentsWithFinancialData } from '@/lib/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  extractBuildingData, 
  generateEmailSignature 
} from '../shared/buildingUtils';

interface ApartmentWithBalance {
  id: number;
  number: string;
  owner_name?: string;
  tenant_name?: string;
  // Financial fields from apartment_balances endpoint
  previous_balance?: number;
  expense_share?: number;
  total_payments?: number;
  net_obligation?: number;
  current_balance?: number;
  status?: string;
}

interface Props {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function DebtReminderSender({ onSuccess, onCancel }: Props) {
  const { buildings, selectedBuilding } = useBuilding();
  
  const [buildingId, setBuildingId] = useState<number | null>(selectedBuilding?.id ?? null);
  const [minDebt, setMinDebt] = useState<'all' | '50' | '100' | '200'>('all');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [extraMessage, setExtraMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Εξαγωγή δεδομένων κτιρίου
  const selectedBuilding_ = buildings.find(b => b.id === buildingId);
  const buildingData = useMemo(
    () => extractBuildingData(selectedBuilding_), 
    [selectedBuilding_]
  );

  // Fetch apartments with FINANCIAL balance info (not just basic apartment data)
  const { data: apartments = [], isLoading } = useQuery<ApartmentWithBalance[]>({
    queryKey: ['apartments-debt-financial', buildingId],
    queryFn: async () => {
      if (!buildingId) return [];
      // Use fetchApartmentsWithFinancialData which calls /financial/dashboard/apartment_balances/
      // This returns balance data including previous_balance, expense_share, total_payments, net_obligation
      const data = await fetchApartmentsWithFinancialData(buildingId);
      return data as ApartmentWithBalance[];
    },
    enabled: !!buildingId,
  });

  // Filter apartments with debt - calculate net obligation properly
  const apartmentsWithDebt = useMemo(() => {
    // Debug: Log first apartment to see data structure
    if (apartments.length > 0) {
      const apt = apartments[0];
      console.log('[DebtReminderSender] First apartment RAW VALUES:', {
        id: apt.id,
        number: apt.number,
        status: apt.status,
        current_balance: apt.current_balance,
        previous_balance: apt.previous_balance,
        expense_share: apt.expense_share,
        net_obligation: apt.net_obligation,
        total_payments: apt.total_payments,
        month_payments: apt.month_payments,
      });
      console.log('[DebtReminderSender] Full object:', JSON.stringify(apt, null, 2));
    }
    
    return apartments.filter(apt => {
      // Parse values as numbers (they might come as strings from API)
      const previousBalance = parseFloat(String(apt.previous_balance || 0));
      const expenseShare = parseFloat(String(apt.expense_share || 0));
      const totalPayments = parseFloat(String(apt.total_payments || 0));
      const netObligation = parseFloat(String(apt.net_obligation || 0));
      const currentBalance = parseFloat(String(apt.current_balance || 0));
      
      // Use net_obligation if available, else current_balance, else calculate
      const debt = !isNaN(netObligation) && netObligation !== 0
        ? netObligation 
        : !isNaN(currentBalance) && currentBalance !== 0
          ? currentBalance
          : (previousBalance + expenseShare - totalPayments);
      
      // Also check status for 'Οφειλή' or 'overdue'
      const status = apt.status?.toLowerCase() || '';
      const hasDebtStatus = status === 'οφειλή' || 
                           status === 'overdue' ||
                           status === 'κρίσιμο';
      
      // Debug log for first few apartments
      if (apartments.indexOf(apt) < 3) {
        console.log(`[DebtReminderSender] Apt ${apt.number}:`, {
          previousBalance, expenseShare, totalPayments, netObligation, currentBalance,
          calculatedDebt: debt, status, hasDebtStatus
        });
      }
      
      // Apartment has debt if debt > 0 or status indicates debt
      if (debt <= 0 && !hasDebtStatus) return false;
      
      const minAmount = minDebt === 'all' ? 0 : parseInt(minDebt);
      return debt >= minAmount;
    });
  }, [apartments, minDebt]);

  // Get debt amount for display
  const getDebtAmount = (apt: ApartmentWithBalance): number => {
    const previousBalance = parseFloat(String(apt.previous_balance || 0));
    const expenseShare = parseFloat(String(apt.expense_share || 0));
    const totalPayments = parseFloat(String(apt.total_payments || 0));
    const netObligation = parseFloat(String(apt.net_obligation || 0));
    const currentBalance = parseFloat(String(apt.current_balance || 0));
    
    // Use net_obligation if available, else current_balance, else calculate
    if (!isNaN(netObligation) && netObligation !== 0) return netObligation;
    if (!isNaN(currentBalance) && currentBalance !== 0) return currentBalance;
    return previousBalance + expenseShare - totalPayments;
  };

  const handleToggleApartment = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.length === apartmentsWithDebt.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(apartmentsWithDebt.map((a) => a.id));
    }
  };

  const generateEmailBody = () => {
    let body = `Αγαπητέ/ή ένοικε,

Σας ενημερώνουμε ότι στον λογαριασμό σας υπάρχει εκκρεμές υπόλοιπο.

Παρακαλούμε όπως προβείτε στην τακτοποίηση της οφειλής σας το συντομότερο δυνατόν, ώστε να διασφαλιστεί η ομαλή λειτουργία της πολυκατοικίας και η έγκαιρη κάλυψη των κοινόχρηστων δαπανών.

Για οποιαδήποτε διευκρίνιση ή ρύθμιση πληρωμής, μη διστάσετε να επικοινωνήσετε με τη διαχείριση.`;

    if (extraMessage.trim()) {
      body += `\n\n${extraMessage.trim()}`;
    }

    body += `\n\n${generateEmailSignature(buildingData)}`;

    return body;
  };

  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!buildingId) throw new Error('Επιλέξτε πολυκατοικία');
      if (selectedIds.length === 0) throw new Error('Επιλέξτε τουλάχιστον έναν παραλήπτη');

      const subject = `Υπενθύμιση Εκκρεμούς Οφειλής - ${buildingData.name}`;

      return notificationsApi.create({
        building_id: buildingId,
        subject,
        body: generateEmailBody(),
        notification_type: 'email',
        priority: 'normal',
        apartment_ids: selectedIds,
        send_to_all: false,
      });
    },
    onSuccess: () => {
      toast.success('Οι υπενθυμίσεις στάλθηκαν επιτυχώς');
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Αποτυχία αποστολής');
    },
  });

  return (
    <>
      <Card className="border-amber-200">
        <CardHeader className="bg-amber-50 border-b border-amber-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-amber-100">
              <Wallet className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-lg text-amber-900">
                Υπενθύμιση Οφειλής
              </CardTitle>
              <p className="text-sm text-amber-700">
                Ειδοποίηση σε ενοίκους με εκκρεμή υπόλοιπα
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Επιλογή Κτιρίου */}
          <div className="space-y-2">
            <Label>Πολυκατοικία</Label>
            <Select
              value={buildingId?.toString() ?? ''}
              onValueChange={(v) => {
                setBuildingId(parseInt(v));
                setSelectedIds([]);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Επιλέξτε πολυκατοικία" />
              </SelectTrigger>
              <SelectContent>
                {buildings.map((b) => (
                  <SelectItem key={b.id} value={b.id.toString()}>
                    {b.name || b.address}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {buildingData.fullAddress && (
              <p className="text-xs text-gray-500">📍 {buildingData.fullAddress}</p>
            )}
          </div>

          {/* Φίλτρο Ελάχιστης Οφειλής */}
          <div className="space-y-2">
            <Label>Ελάχιστη Οφειλή</Label>
            <Select value={minDebt} onValueChange={(v: any) => setMinDebt(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλες οι οφειλές</SelectItem>
                <SelectItem value="50">Πάνω από 50€</SelectItem>
                <SelectItem value="100">Πάνω από 100€</SelectItem>
                <SelectItem value="200">Πάνω από 200€</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Λίστα Οφειλετών */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Επιλογή Παραληπτών</Label>
              <Badge variant="outline">
                {apartmentsWithDebt.length} με οφειλή
              </Badge>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50">
              {isLoading ? (
                <div className="text-center py-8 text-gray-500">Φόρτωση οικονομικών δεδομένων...</div>
              ) : apartmentsWithDebt.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  Δεν βρέθηκαν διαμερίσματα με οφειλή
                  <p className="text-xs mt-2 text-gray-400">
                    (Βεβαιωθείτε ότι υπάρχουν εκδομένα κοινόχρηστα)
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-sm text-amber-600 hover:text-amber-800"
                    >
                      {selectedIds.length === apartmentsWithDebt.length 
                        ? 'Αποεπιλογή όλων' 
                        : 'Επιλογή όλων'}
                    </button>
                    <span className="text-sm text-gray-500">
                      {selectedIds.length} επιλεγμένα
                    </span>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1">
                    {apartmentsWithDebt.map((apt) => {
                      const debtAmount = getDebtAmount(apt);
                      return (
                        <label
                          key={apt.id}
                          className="flex items-center gap-3 p-3 rounded-lg hover:bg-white cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedIds.includes(apt.id)}
                            onCheckedChange={() => handleToggleApartment(apt.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900">
                                Διαμέρισμα {apt.number}
                              </span>
                              <Badge variant="destructive" className="text-xs">
                                {debtAmount.toFixed(2)}€
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-500">
                              {apt.owner_name || apt.tenant_name || 'Χωρίς όνομα'}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Επιπλέον Μήνυμα */}
          <div className="space-y-2">
            <Label>Επιπλέον Σχόλια (προαιρετικά)</Label>
            <Textarea
              placeholder="π.χ. Τα στοιχεία για τραπεζική κατάθεση είναι..."
              value={extraMessage}
              onChange={(e) => setExtraMessage(e.target.value)}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={onCancel}>
              Ακύρωση
            </Button>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setShowPreview(true)}
                disabled={!buildingId}
              >
                <Eye className="h-4 w-4 mr-2" />
                Προεπισκόπηση
              </Button>
              <Button
                onClick={() => sendMutation.mutate()}
                disabled={sendMutation.isPending || !buildingId || selectedIds.length === 0}
              >
                {sendMutation.isPending ? (
                  'Αποστολή...'
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Αποστολή ({selectedIds.length})
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Προεπισκόπηση Email</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500 mb-1">Θέμα:</p>
              <p className="font-medium">
                Υπενθύμιση Εκκρεμούς Οφειλής - {buildingData.name}
              </p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-sm text-gray-500 mb-2">Περιεχόμενο:</p>
              <div className="whitespace-pre-wrap text-sm">
                {generateEmailBody()}
              </div>
            </div>
            <div className="rounded-lg bg-amber-50 p-4">
              <p className="text-sm text-amber-800">
                Θα σταλεί σε {selectedIds.length} παραλήπτες
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
