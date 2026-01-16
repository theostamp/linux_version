'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenses } from '@/hooks/useExpenses';
import { Expense, ExpenseCategory, DistributionType } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FilePreview } from '@/components/ui/FilePreview';
import { toast } from 'sonner';
import {
  api,
  fetchArchiveDocuments,
  deleteArchiveDocument,
  fetchScheduledMaintenances,
  updateScheduledMaintenance,
  deleteServiceReceipt,
} from '@/lib/api';
import { ExpenseViewModal } from './ExpenseViewModal';
import { ExpensePaymentModal } from './ExpensePaymentModal';
import { Plus } from 'lucide-react';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { showErrorFromException } from '@/lib/errorMessages';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getEffectiveRoleForBuilding } from '@/lib/roleUtils';

interface ExpenseListProps {
  onExpenseSelect?: (expense: Expense) => void;
  showActions?: boolean;
  selectedMonth?: string;
  onMonthChange?: (month: string) => void;
  onAddExpense?: () => void;
  ref?: React.Ref<{ refresh: () => void }>;
}

export const ExpenseList = React.forwardRef<{ refresh: () => void }, ExpenseListProps>(({
  onExpenseSelect,
  showActions = true,
  selectedMonth,
  onMonthChange,
  onAddExpense,
}, ref) => {
  // NEW: Use BuildingContext instead of props
  const { selectedBuilding } = useBuilding();
  const buildingId = selectedBuilding?.id;
  const buildingName = selectedBuilding?.name;
  const { user } = useCurrentUser();
  const effectiveRole = getEffectiveRoleForBuilding(user, selectedBuilding);
  const canDeleteArchiveDocs = effectiveRole === 'manager' || effectiveRole === 'superuser';
  const canManagePayments = effectiveRole === 'manager' || effectiveRole === 'superuser';

  const { expenses, isLoading, error, loadExpenses, deleteExpense } = useExpenses(buildingId, selectedMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [payerFilter, setPayerFilter] = useState<string>('all');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<string>('all');
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedPaymentExpense, setSelectedPaymentExpense] = useState<Expense | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Generate month options for the last 24 months
  const generateMonthOptions = () => {
    const options = [];
    const now = new Date();

    for (let i = 0; i < 24; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const label = date.toLocaleDateString('el-GR', {
        year: 'numeric',
        month: 'long'
      });

      options.push({ value, label });
    }

    return options;
  };

  // Expose refresh function through ref
  React.useImperativeHandle(ref, () => ({
    refresh: () => {
      loadExpenses();
    }
  }));

  // Handle expense deletion
  const handleDeleteExpense = async (expense: Expense, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the expense selection

    // 🔴 ΠΡΟΣΤΑΣΙΑ ΔΑΠΑΝΩΝ ΑΠΟ ΕΡΓΑ/ΠΡΟΣΦΟΡΕΣ
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // Έλεγχος αν η δαπάνη προέρχεται από:
    // 1. Προγραμματισμένο έργο (ScheduledMaintenance)
    // 2. Εγκεκριμένη προσφορά (Approved Offer)
    // 3. Project με δόσεις
    //
    // Δείτε: OFFER_PROJECT_EXPENSE_ARCHITECTURE.md
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

    const projectIdMatch = expense.notes?.match(/project id:\s*([a-f0-9-]+)/i);
    const maintenanceIdMatch = expense.notes?.match(/maintenance id:\s*([a-f0-9-]+)/i);
    const linkedMaintenanceProject = expense.linked_maintenance_projects?.[0];
    const linkedMaintenanceId =
      linkedMaintenanceProject?.id ??
      expense.linked_scheduled_maintenance ??
      expense.maintenance_payment_receipts?.[0]?.scheduled_maintenance?.id ??
      (maintenanceIdMatch && maintenanceIdMatch[1]);
    const linkedProjectId = expense.project ?? (projectIdMatch && projectIdMatch[1]);
    const isProjectRelated = Boolean(linkedProjectId || linkedMaintenanceId);

    if (isProjectRelated) {
      const projectTitle = expense.project_title || linkedMaintenanceProject?.title;
      const projectInfo = projectTitle ? `συνδέεται με το έργο <strong>"${projectTitle}"</strong> και` : '';

      const navigationTarget = linkedProjectId
        ? `/projects/${linkedProjectId}`
        : `/maintenance/scheduled/${linkedMaintenanceId}/edit`;
      const navigationLabel = linkedProjectId ? 'Έργα & Προσφορές' : 'Προγραμματισμένα Έργα';
      const sourceType = linkedProjectId ? 'έργο' : 'προγραμματισμένο έργο';

      // Δημιουργία custom dialog για ενημέρωση
      const messageDiv = document.createElement('div');
      messageDiv.innerHTML = `
        <div style="padding: 20px; text-align: center;">
          <h3 style="color: #dc2626; margin-bottom: 10px;">🔒 Προστατευμένη Δαπάνη</h3>
          <p style="margin-bottom: 15px;">
            Η δαπάνη <strong>"${expense.title}"</strong> ${projectInfo || `προέρχεται από ${sourceType} και`}
            <strong style="color: #dc2626;">ΔΕΝ μπορεί να διαγραφεί απευθείας</strong>.
          </p>
          <p style="margin-bottom: 20px; color: #666;">
            Για να διαγράψετε αυτή τη δαπάνη, πρέπει να:
            <br>• Μεταβείτε στη σελίδα <strong>"${navigationLabel}"</strong>
            <br>• Βρείτε το σχετικό έργο/προσφορά
            <br>• Διαγράψετε/ενημερώσετε από εκεί ώστε να ενημερωθούν όλα τα συνδεδεμένα στοιχεία
          </p>
          <p style="margin-bottom: 0; font-weight: bold;">
            Θα μεταφερθείτε αυτόματα στη σωστή σελίδα σε 5 δευτερόλεπτα...
          </p>
        </div>
      `;

      // Χρήση toast με HTML content και μεγαλύτερη διάρκεια
      toast.error(
        <div dangerouslySetInnerHTML={{ __html: messageDiv.innerHTML }} />,
        {
          duration: 5000,
          action: {
            label: 'Μετάβαση',
            onClick: () => {
              window.location.href = navigationTarget;
            }
          }
        }
      );

      // Αυτόματη μετάβαση μετά από 5 δευτερόλεπτα αν ο χρήστης δεν πατήσει το κουμπί
      setTimeout(() => {
        window.location.href = navigationTarget;
      }, 5000);

      return;
    }

    // Για απλές δαπάνες χωρίς δόσεις
    const confirmed = window.confirm(
      `Είστε σίγουροι ότι θέλετε να διαγράψετε τη δαπάνη "${expense.title}" (${formatCurrency(expense.amount)})?\n\nΑυτή η ενέργεια δεν μπορεί να αναιρεθεί.`
    );

    if (!confirmed) return;

    let archiveDocs: Array<{ id: number }> = [];
    let shouldDeleteArchiveDocs = false;
    try {
      const archiveResponse = await fetchArchiveDocuments({
        building: expense.building,
        linked_expense: expense.id,
      });
      archiveDocs = Array.isArray(archiveResponse) ? archiveResponse : (archiveResponse as any)?.results ?? [];
      if (archiveDocs.length > 0) {
        if (canDeleteArchiveDocs) {
          shouldDeleteArchiveDocs = window.confirm(
            `Βρέθηκαν ${archiveDocs.length} αρχειοθετημένα παραστατικά συνδεδεμένα με αυτή τη δαπάνη.\nΘέλετε να διαγραφούν κι αυτά από το Αρχείο;`
          );
        } else {
          toast.info(
            `Βρέθηκαν ${archiveDocs.length} αρχειοθετημένα παραστατικά.\nΗ διαγραφή τους επιτρέπεται μόνο από διαχειριστή.`
          );
        }
      }
    } catch (archiveFetchError) {
      console.debug('Archive lookup failed (non-blocking):', archiveFetchError);
    }

    try {
      const success = await deleteExpense(expense.id);
      if (success) {
        if (shouldDeleteArchiveDocs && archiveDocs.length > 0) {
          for (const doc of archiveDocs) {
            try {
              await deleteArchiveDocument(doc.id);
            } catch {}
          }
          toast.success('Τα συνδεδεμένα αρχειοθετημένα παραστατικά διαγράφηκαν.');
        }
        // Hook already shows success toast, but show additional info if needed
        // Optional follow-ups: check for linked service receipts and scheduled works
        try {
          const building = expense.building;
          const res = await api.get(`/maintenance/receipts/`, { params: { building, limit: 1000 } });
          const receipts = Array.isArray(res.data) ? res.data : res.data?.results ?? [];
          // Prefer explicit linkage if backend supports it
          const explicit = receipts.filter((r: any) => r?.expense === expense.id);
          if (explicit.length > 0) {
            const alsoDelete = window.confirm(`Βρέθηκαν ${explicit.length} αποδείξεις συνδεδεμένες με τη δαπάνη. Θέλετε να διαγραφούν;`);
            if (alsoDelete) {
              for (const r of explicit) { try { await deleteServiceReceipt(r.id); } catch {} }
              toast.success('Οι συνδεδεμένες αποδείξεις υπηρεσιών διαγράφηκαν.');
            }
          }
          const normalize = (s: string) => (s || '').trim().toLowerCase();
          const approxAmountEqual = (a: number, b: number) => Math.abs(Number(a || 0) - Number(b || 0)) < 0.005;
          const sameDate = (d1?: string, d2?: string) => !!d1 && !!d2 && (d1.slice(0,10) === d2.slice(0,10));

          const likelyReceipts = receipts.filter((r: any) => (
            sameDate(r?.service_date, expense.date) && approxAmountEqual(r?.amount, expense.amount) && normalize(r?.description || r?.title) === normalize(expense.title)
          ));

          if (likelyReceipts.length > 0) {
            const alsoDelete = window.confirm(`Βρέθηκαν ${likelyReceipts.length} συνδεδεμένες αποδείξεις υπηρεσιών για την ίδια ημερομηνία/ποσό/τίτλο.\nΘέλετε να διαγραφούν κι αυτές; (Ίσως είναι λογιστικά παρατυπία)`);
            if (alsoDelete) {
              for (const r of likelyReceipts) {
                try { await deleteServiceReceipt(r.id); } catch {}
              }
              toast.success('Οι σχετικές αποδείξεις υπηρεσιών διαγράφηκαν.');
            }
          }

          // Optionally revert related scheduled maintenance items from completed -> scheduled
          try {
            const scheduled = await fetchScheduledMaintenances({ buildingId: building, ordering: 'scheduled_date' });
            const closeDate = (d1?: string, d2?: string) => {
              if (!d1 || !d2) return false;
              const t1 = new Date(d1.length > 10 ? d1 : `${d1}T00:00:00`).getTime();
              const t2 = new Date(d2.length > 10 ? d2 : `${d2}T00:00:00`).getTime();
              return Number.isFinite(t1) && Number.isFinite(t2) && Math.abs(t1 - t2) <= 3 * 24 * 60 * 60 * 1000; // ±3 ημέρες
            };
            const related = (scheduled as any[]).filter((s) => (
              (s?.status === 'completed') && closeDate(s?.scheduled_date, expense.date) && normalize(s?.title) === normalize(expense.title)
            ));
            if (related.length > 0) {
              const revert = window.confirm(`Βρέθηκαν ${related.length} ολοκληρωμένα προγραμματισμένα έργα που ταιριάζουν (τίτλος/ημερομηνία). Θέλετε να επανέλθουν σε κατάσταση "scheduled";`);
              if (revert) {
                for (const s of related) {
                  try { await updateScheduledMaintenance(s.id, { status: 'scheduled' as any }); } catch {}
                }
                toast.success('Ενημερώθηκαν τα σχετικά έργα (σε scheduled).');
              }
            }
          } catch {}
        } catch {}
      }
      // Hook already handles error toast, so we don't need to show it again here
    } catch (error) {
      // Hook already handles error toast
      console.error('Error in handleDeleteExpense:', error);
    }
  };

  // Handle expense view
  const handleViewExpense = (expense: Expense, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the expense selection
    setSelectedExpense(expense);
    setShowViewModal(true);
  };

  const handleOpenPaymentModal = (expense: Expense, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedPaymentExpense(expense);
    setShowPaymentModal(true);
  };

  // Handle modal close
  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedExpense(null);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedPaymentExpense(null);
  };

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];

    return expenses.filter((expense) => {
      const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (expense.category_display || expense.category).toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;

      const matchesPayer = payerFilter === 'all' || expense.payer_responsibility === payerFilter;

      const status = expense.payment_status || 'unpaid';
      const matchesPaymentStatus = paymentStatusFilter === 'all' || status === paymentStatusFilter;

      return matchesSearch && matchesCategory && matchesPayer && matchesPaymentStatus;
    });
  }, [expenses, searchTerm, categoryFilter, payerFilter, paymentStatusFilter]);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'electricity_common': 'bg-blue-100 text-blue-800',
      'water_common': 'bg-cyan-100 text-cyan-800',
      'heating_fuel': 'bg-orange-100 text-orange-800',
      'heating_gas': 'bg-orange-100 text-orange-800',
      'cleaning': 'bg-green-100 text-green-800',
      'building_maintenance': 'bg-purple-100 text-purple-800',
      'building_insurance': 'bg-red-100 text-red-800',
      'management_fees': 'bg-gray-100 text-gray-800',
      'miscellaneous': 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getDistributionBadge = (distribution: string) => {
    const labels: Record<string, string> = {
      'by_participation_mills': 'Χιλιοστά',
      'equal_share': 'Ισόποσα',
      'by_meters': 'Μετρητές',
      'specific_apartments': 'Συγκεκριμένα',
    };
    return labels[distribution] || 'Άγνωστο';
  };

  const getPaymentStatusBadge = (status?: string) => {
    switch (status) {
      case 'paid':
        return { label: '✅ Πληρωμένο', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'partial':
        return { label: '🟠 Μερικώς', className: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'overdue':
        return { label: '⚠️ Ληξιπρόθεσμο', className: 'bg-red-50 text-red-700 border-red-200' };
      case 'unpaid':
      default:
        return { label: '⏳ Απλήρωτο', className: 'bg-slate-50 text-slate-700 border-slate-200' };
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            Σφάλμα κατά τη φόρτωση των δαπανών: {error}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
      <CardHeader>
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>📋 Λίστα Δαπανών</span>
              <Badge variant="secondary">
                {filteredExpenses.length} από {expenses?.length || 0}
              </Badge>
              {selectedMonth && (
                <Badge variant="outline" className="border-blue-300 text-blue-700 bg-blue-50">
                  📅 {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', {
                    month: 'long',
                    year: 'numeric'
                  })}
                </Badge>
              )}
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {selectedMonth ?
                `Δαπάνες για τον μήνα ${new Date(selectedMonth + '-01').toLocaleDateString('el-GR', { month: 'long', year: 'numeric' })}` :
                'Διαχείριση και παρακολούθηση όλων των δαπανών του κτιρίου'
              }
            </p>
          </div>
          {onAddExpense && (
            <Button
              onClick={onAddExpense}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Προσθήκη Νέας Δαπάνης
            </Button>
          )}
        </div>

        {/* Statistics Row */}
        {expenses && expenses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {expenses.length}
              </div>
              <div className="text-xs text-gray-600">📋 Σύνολο Δαπανών</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-purple-600">
                {formatCurrency(expenses.reduce((sum, e) => sum + e.amount, 0))}
              </div>
              <div className="text-xs text-gray-600">💰 Συνολικό Ποσό</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-orange-600">
                {new Set(expenses.map(e => e.category)).size}
              </div>
              <div className="text-xs text-gray-600">📂 Κατηγορίες</div>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Enhanced Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">🔍 Φίλτρα Αναζήτησης</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setPayerFilter('all');
                setPaymentStatusFilter('all');
                // Note: We don't clear selectedMonth as it's a primary filter
              }}
              className="text-xs"
              title="Καθαρίζει αναζήτηση, κατηγορία, ευθύνη πληρωμής και κατάσταση (διατηρεί τον μήνα)"
            >
              🗑️ Καθαρισμός Φίλτρων
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Αναζήτηση</label>
              <Input
                placeholder="🔍 Αναζήτηση δαπάνης..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="text-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">📅 Μήνας</label>
              <div className="flex gap-2">
                <Select
                  value={selectedMonth || ''}
                  onValueChange={(value) => onMonthChange?.(value)}
                >
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Επιλέξτε μήνα" />
                  </SelectTrigger>
                  <SelectContent>
                    {generateMonthOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                    onMonthChange?.(currentMonth);
                  }}
                  className="text-xs px-2"
                  title="Τρέχων μήνας"
                >
                  📅
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Κατηγορία</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Επιλέξτε κατηγορία" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📂 Όλες οι κατηγορίες</SelectItem>
                  <SelectItem value="electricity_common">⚡ Ηλεκτρισμός Κοινοχρήστων</SelectItem>
                  <SelectItem value="water_common">💧 Νερό Κοινοχρήστων</SelectItem>
                  <SelectItem value="heating_fuel">🔥 Θέρμανση (Πετρέλαιο)</SelectItem>
                  <SelectItem value="heating_gas">🔥 Θέρμανση (Φυσικό Αέριο)</SelectItem>
                  <SelectItem value="cleaning">🧹 Καθαρισμός</SelectItem>
                  <SelectItem value="building_maintenance">🔧 Συντήρηση Κτιρίου</SelectItem>
                  <SelectItem value="building_insurance">🛡️ Ασφάλεια Κτιρίου</SelectItem>
                  <SelectItem value="management_fees">📋 Διοικητικά Έξοδα</SelectItem>
                  <SelectItem value="miscellaneous">📦 Διάφορες Δαπάνες</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Ευθύνη Πληρωμής</label>
              <Select value={payerFilter} onValueChange={setPayerFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Όλες" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">👥 Όλες οι δαπάνες</SelectItem>
                  <SelectItem value="resident">🟢 Δαπάνες Ενοίκων</SelectItem>
                  <SelectItem value="owner">🔴 Δαπάνες Ιδιοκτητών</SelectItem>
                  <SelectItem value="shared">🔵 Κοινή Ευθύνη</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Κατάσταση Πληρωμής</label>
              <Select value={paymentStatusFilter} onValueChange={setPaymentStatusFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Όλες" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📌 Όλες οι καταστάσεις</SelectItem>
                  <SelectItem value="unpaid">⏳ Απλήρωτο</SelectItem>
                  <SelectItem value="partial">🟠 Μερικώς Πληρωμένο</SelectItem>
                  <SelectItem value="paid">✅ Πληρωμένο</SelectItem>
                  <SelectItem value="overdue">⚠️ Ληξιπρόθεσμο</SelectItem>
                </SelectContent>
              </Select>
            </div>

          </div>

          {/* Active Filters Summary */}
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 text-xs text-gray-600 flex-wrap">
              <span>🎯 Ενεργά φίλτρα:</span>

              {/* Building Name - Always shown */}
              {buildingName && (
                <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                  🏢 {buildingName}
                </Badge>
              )}

              {/* Other filters - only shown if active */}
              {searchTerm && (
                <Badge variant="outline" className="text-xs">
                  🔍 "{searchTerm}"
                </Badge>
              )}
              {selectedMonth && (
                <Badge variant="outline" className="text-xs">
                  📅 {new Date(selectedMonth + '-01').toLocaleDateString('el-GR', {
                    year: 'numeric',
                    month: 'long'
                  })}
                </Badge>
              )}
              {categoryFilter !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  📂 {categoryFilter}
                </Badge>
              )}
              {payerFilter !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {payerFilter === 'resident' ? '🟢 Ένοικος'
                    : payerFilter === 'owner' ? '🔴 Ιδιοκτήτης'
                    : '🔵 Κοινή Ευθύνη'}
                </Badge>
              )}
              {paymentStatusFilter !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {paymentStatusFilter === 'paid' ? '✅ Πληρωμένο'
                    : paymentStatusFilter === 'partial' ? '🟠 Μερικώς'
                    : paymentStatusFilter === 'overdue' ? '⚠️ Ληξιπρόθεσμο'
                    : '⏳ Απλήρωτο'}
                </Badge>
              )}

            </div>
          </div>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {expenses?.length === 0 ? 'Δεν υπάρχουν δαπάνες' : 'Δεν βρέθηκαν δαπάνες'}
              </h3>
              <p className="text-gray-500 mb-4">
                {expenses?.length === 0
                  ? 'Δεν έχουν καταχωρηθεί δαπάνες ακόμα. Ξεκινήστε προσθέτοντας την πρώτη δαπάνη.'
                  : 'Δεν βρέθηκαν δαπάνες με τα επιλεγμένα κριτήρια. Δοκιμάστε να αλλάξετε τα φίλτρα.'
                }
              </p>
              {expenses?.length === 0 && (
                <Button
                  variant="outline"
                  className="gap-2"
                  onClick={onAddExpense || (() => {
                    // Fallback: Trigger new expense modal via URL
                    window.location.href = `/financial?tab=expenses&modal=expense-form&building=${buildingId}`;
                  })}
                >
                  ➕ Προσθήκη Πρώτης Δαπάνης
                </Button>
              )}
            </div>
          ) : (
            filteredExpenses.map((expense) => {
              const paymentStatus = getPaymentStatusBadge(expense.payment_status);
              const hasRemaining = typeof expense.remaining_amount === 'number';
              const isPaid = expense.payment_status === 'paid' || (hasRemaining && (expense.remaining_amount || 0) <= 0);

              return (
                <div
                  key={expense.id}
                  className="border rounded-lg p-3 hover:bg-gray-50 transition-colors cursor-pointer group"
                  onClick={() => onExpenseSelect?.(expense)}
                >
                  <div className="flex items-center justify-between">
                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-base truncate group-hover:text-blue-600">
                            {expense.title}
                          </h3>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Badge className={`${getCategoryColor(expense.category)} text-xs`}>
                            {expense.category_display || expense.category}
                          </Badge>
                          {expense.payer_responsibility === 'resident' ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300 text-xs font-semibold">
                              🟢 Ένοικος
                            </Badge>
                          ) : expense.payer_responsibility === 'owner' ? (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300 text-xs font-semibold">
                              🔴 Ιδιοκτήτης
                            </Badge>
                          ) : expense.payer_responsibility === 'shared' ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 text-xs font-semibold">
                              🔵 Κοινή Ευθύνη
                            </Badge>
                          ) : null}
                          {expense.title?.toLowerCase().includes('προκαταβολή') ? (
                            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 text-white text-xs">
                              💰 Προκαταβολή
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-blue-600 text-xs">
                              📋 Καταχωρημένη
                            </Badge>
                          )}
                          <Badge variant="outline" className={`text-xs font-semibold ${paymentStatus.className}`}>
                            {paymentStatus.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Key Information Row */}
                      <div className="flex items-center flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <span className={`font-semibold text-base ${expense.title?.toLowerCase().includes('προκαταβολή') ? 'text-amber-600' : 'text-green-600'}`}>
                            {formatCurrency(expense.amount)}
                          </span>
                        </div>
                        {hasRemaining && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">💸</span>
                            <span className="font-medium text-slate-700">
                              Υπόλοιπο: {formatCurrency(expense.remaining_amount || 0)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">📅</span>
                          <span>{formatDate(expense.date)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-gray-500">📊</span>
                          <span>{getDistributionBadge(expense.distribution_type)}</span>
                        </div>
                        {expense.supplier_name && (
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">🏢</span>
                            <span className="text-blue-600 truncate max-w-32">{expense.supplier_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Additional Info (collapsible) */}
                      {(expense.notes || expense.attachment) && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          {expense.notes && (
                            <div className="text-xs text-gray-500 mb-1">
                              <span className="font-medium">📝 Σημειώσεις:</span>
                              <span className="ml-1 truncate">{expense.notes}</span>
                            </div>
                          )}
                          {expense.attachment && (
                            <div className="text-xs text-gray-500">
                              <span className="font-medium">📎 Επισύναψη:</span>
                              <span className="ml-1 text-blue-600">
                                {expense.attachment.split('/').pop() || 'attachment'}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Maintenance Payment Info */}
                      {expense.maintenance_payment_receipts && expense.maintenance_payment_receipts.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-blue-100 bg-blue-50/30 rounded p-2">
                          <div className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                            <span>🔧</span>
                            <span>Συνδεδεμένο με Συντήρηση:</span>
                          </div>
                          {expense.maintenance_payment_receipts.map((receipt) => (
                            <div key={receipt.id} className="text-xs text-blue-600 ml-1 flex items-center gap-2">
                              {receipt?.scheduled_maintenance?.id ? (
                                <Link
                                  href={`/maintenance/scheduled/${receipt.scheduled_maintenance.id}/edit`}
                                  className="font-medium text-blue-700 hover:underline"
                                >
                                  {receipt.scheduled_maintenance.title}
                                </Link>
                              ) : (
                                <span className="font-medium">{receipt.scheduled_maintenance.title}</span>
                              )}
                              {receipt.installment && (
                                <span className="text-blue-500">
                                  ({receipt.installment.installment_type === 'advance' ? 'Προκαταβολή' :
                                    receipt.installment.installment_type === 'installment' ? `Δόση ${receipt.installment.installment_number}` :
                                    receipt.installment.installment_type})
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {showActions && (
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        {canManagePayments && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => handleOpenPaymentModal(expense, e)}
                            disabled={isPaid}
                            title={isPaid ? 'Η δαπάνη είναι ήδη εξοφλημένη' : 'Καταχώρηση εξόφλησης'}
                          >
                            💸 Εξόφληση
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => handleViewExpense(expense, e)}
                        >
                          👁️ Προβολή
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={(e) => handleDeleteExpense(expense, e)}
                          title="Διαγραφή δαπάνης"
                        >
                          🗑️ Διαγραφή
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>

    {/* Expense View Modal */}
    <ExpenseViewModal
      isOpen={showViewModal}
      onClose={handleCloseViewModal}
      expense={selectedExpense}
      buildingName={buildingName}
    />

    <ExpensePaymentModal
      isOpen={showPaymentModal}
      onClose={handleClosePaymentModal}
      expense={selectedPaymentExpense}
      buildingId={buildingId}
      onSuccess={loadExpenses}
    />
  </>
  );
});

ExpenseList.displayName = 'ExpenseList';
