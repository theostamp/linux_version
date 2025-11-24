'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getOfficeLogoUrl } from '@/lib/utils';
import { 
  X, 
  Printer, 
  CreditCard, 
  Building, 
  Phone, 
  MapPin, 
  Euro,
  Calendar,
  FileText,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { formatCurrency } from '@/lib/utils';

interface ApartmentBalance {
  apartment_id: number;
  apartment_number: string;
  owner_name: string | null;
  tenant_name?: string | null;
  participation_mills: number;
  current_balance: number;
  previous_balance: number;
  expense_share: number;
  total_obligations: number;
  total_payments: number;
  net_obligation: number;
  resident_expenses?: number;
  owner_expenses?: number;
  status: string;
  expense_breakdown: ExpenseBreakdown[];
  payment_breakdown: PaymentBreakdown[];
}

interface ExpenseBreakdown {
  expense_id: number;
  expense_title: string;
  expense_amount: number;
  share_amount: number;
  distribution_type: string;
  payer_responsibility: 'owner' | 'resident' | 'shared';  // ✅ ΝΕΟ ΠΕΔΙΟ
  date: string;
  month: string;
  month_display: string;
  mills?: number;
  total_mills?: number;
}

interface PaymentBreakdown {
  id: number;
  amount: number;
  date: string;
  method: string;
  method_display?: string;
  payment_type: string;
  payment_type_display?: string;
  reference_number?: string;
  notes?: string;
  payer_name?: string;
}

interface PaymentNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  apartment: ApartmentBalance | null;
  onPaymentClick: () => void;
}

// GDPR: Mask occupant name (first name + first letter of surname + ***)
const maskOccupant = (name: string | null | undefined): string => {
  if (!name) return 'Μη καταχωρημένος';
  
  const parts = name.trim().split(' ');
  if (parts.length === 1) return `${parts[0]} ***`;
  
  return `${parts[0]} ${parts[1][0]}***`;
};

export default function PaymentNotificationModal({
  isOpen,
  onClose,
  apartment,
  onPaymentClick
}: PaymentNotificationModalProps) {
  const { user } = useAuth();
  const [paymentDeadline, setPaymentDeadline] = useState<string>('');
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    if (apartment) {
      // Calculate payment deadline (15th of next month)
      const currentDate = new Date();
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 15);
      const deadline = nextMonth.toLocaleDateString('el-GR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      setPaymentDeadline(deadline);
    }
  }, [apartment]);

  // ✅ ΝΕΟ: Επαλήθευση Συνολικών Ποσών
  useEffect(() => {
    if (apartment && apartment.expense_breakdown) {
      // Υπολογισμός συνόλου από breakdown
      const breakdownTotal = apartment.expense_breakdown.reduce(
        (sum, expense) => sum + expense.share_amount, 
        0
      );
      
      // Σύγκριση με το expense_share από API
      const difference = Math.abs(breakdownTotal - apartment.expense_share);
      
      if (difference > 0.01) {  // Tolerance για floating point
        console.error('⚠️ ΔΙΑΦΟΡΑ ΣΤΟΙΧΕΙΩΝ:', {
          expense_share_api: apartment.expense_share,
          breakdown_total: breakdownTotal,
          difference: difference,
          apartment_number: apartment.apartment_number
        });
        
        // Προαιρετικά: Εμφάνιση warning στο UI (μόνο για screen, όχι print)
        // Μπορεί να προστεθεί ένα διακριτικό badge στο μέλλον
      } else {
        console.log('✅ Επαλήθευση δεδομένων OK:', {
          expense_share_api: apartment.expense_share,
          breakdown_total: breakdownTotal,
          apartment_number: apartment.apartment_number
        });
      }
    }
  }, [apartment]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return <div className="w-2 h-2 bg-green-500 rounded-full" />;
      case 'overdue':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <div className="w-2 h-2 bg-yellow-500 rounded-full" />;
      default:
        return <div className="w-2 h-2 bg-gray-500 rounded-full" />;
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'default' as const;
      case 'overdue':
        return 'destructive' as const;
      case 'pending':
        return 'secondary' as const;
      default:
        return 'outline' as const;
    }
  };

  if (!isOpen || !apartment) return null;

  return (
    <>
      {/* Modal */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto print:shadow-none print:max-h-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b print:hidden">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                Ειδοποιητήριο Πληρωμής Κοινοχρήστων
              </h2>
            </div>
            <div className="flex items-center gap-2">
              {apartment.net_obligation > 0 && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    onClose();
                    onPaymentClick();
                  }}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <CreditCard className="h-4 w-4" />
                  Πληρωμή
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Εκτύπωση
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Office Header - Print Only - ✅ ΑΝΑΒΑΘΜΙΣΜΕΝΟ */}
            <div className="hidden print:block border-b-2 border-gray-400 pb-3 mb-6">
              <div className="flex items-center justify-between">
                {/* Αριστερά: Στοιχεία Γραφείου */}
                <div className="flex items-center gap-3">
                  {(() => {
                    const logoUrl = getOfficeLogoUrl(user?.office_logo);
                    return logoUrl && !logoError ? (
                      <img
                        src={logoUrl}
                        alt="Office Logo"
                        className="w-14 h-14 object-contain"
                        onLoad={() => setLogoError(false)}
                        onError={() => setLogoError(true)}
                      />
                    ) : null;
                  })()}
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">
                      {user?.office_name || 'Γραφείο Διαχείρισης'}
                    </h1>
                    <p className="text-xs text-gray-600">{user?.office_address}</p>
                    <p className="text-xs text-gray-600">Τηλ: {user?.office_phone}</p>
                  </div>
                </div>
                
                {/* Κέντρο: Τίτλος & Περίοδος */}
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">
                    ΕΙΔΟΠΟΙΗΤΗΡΙΟ ΚΟΙΝΟΧΡΗΣΤΩΝ
                  </h2>
                  <p className="text-sm text-gray-700 mt-1">
                    {new Date().toLocaleDateString('el-GR', { 
                      month: 'long', 
                      year: 'numeric' 
                    })}
                  </p>
                </div>
                
                {/* Δεξιά: Ημερομηνία Λήξης */}
                <div className="text-right">
                  <p className="text-xs text-gray-600 font-medium">Πληρωτέο έως:</p>
                  <p className="text-lg font-bold text-red-600 mt-1">
                    {paymentDeadline}
                  </p>
                </div>
              </div>
            </div>

            {/* Main Title - Screen Only */}
            <div className="print:hidden">
              <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">
                ΕΙΔΟΠΟΙΗΤΗΡΙΟ ΠΛΗΡΩΜΗΣ ΚΟΙΝΟΧΡΗΣΤΩΝ
              </h1>
              <p className="text-center text-gray-600">
                Διαμέρισμα {apartment.apartment_number}
              </p>
            </div>

            {/* Apartment Information */}
            <div className="bg-gray-50 rounded-lg p-4 print:bg-white print:border print:border-gray-300">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4" />
                Στοιχεία Διαμερίσματος
              </h3>
              <div className={`grid gap-4 ${apartment.tenant_name ? 'grid-cols-1 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
                <div>
                  <span className="text-sm text-gray-600">Αριθμός Διαμερίσματος:</span>
                  <div className="font-medium text-lg">{apartment.apartment_number}</div>
                </div>
                <div>
                  <span className="text-sm text-gray-600">Ιδιοκτήτης:</span>
                  <div className="font-medium">{apartment.owner_name || 'Μη καταχωρημένος'}</div>
                </div>
                {apartment.tenant_name && (
                  <div>
                    <span className="text-sm text-gray-600">Ένοικος:</span>
                    <div className="font-medium">{maskOccupant(apartment.tenant_name)}</div>
                  </div>
                )}
                <div>
                  <span className="text-sm text-gray-600">Χιλιοστά Συμμετοχής:</span>
                  <div className="font-medium">{apartment.participation_mills}</div>
                </div>
              </div>
            </div>

            {/* Payment Information */}
            <div className="bg-blue-50 rounded-lg p-4 print:bg-white print:border print:border-blue-300">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Euro className="w-4 h-4" />
                Πληροφορίες Πληρωμής
              </h3>
                <div>
                  <span className="text-sm text-gray-600">Ποσό Πληρωτέο:</span>
                  <div className={`font-bold text-2xl ${
                    apartment.net_obligation > 0 ? 'text-red-600' : 
                    apartment.net_obligation < 0 ? 'text-green-600' : 'text-gray-900'
                  }`}>
                    {formatCurrency(Math.abs(apartment.net_obligation))}
                </div>
              </div>

              {/* Διακριτοί δείκτες δαπανών */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div className="bg-white border border-green-200 rounded-lg p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    Δαπάνες Ενοίκου
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1 py-0">
                      Ε
                    </Badge>
                  </div>
                  <div className="text-lg font-semibold text-green-700">
                    {apartment.resident_expenses && Math.abs(apartment.resident_expenses) > 0.3
                      ? formatCurrency(apartment.resident_expenses)
                      : '-'}
                  </div>
                </div>

                <div className="bg-white border border-red-200 rounded-lg p-3 flex flex-col gap-1">
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    Δαπάνες Ιδιοκτήτη
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1 py-0">
                      Δ
                    </Badge>
                  </div>
                  <div className="text-lg font-semibold text-red-600">
                    {apartment.owner_expenses && Math.abs(apartment.owner_expenses) > 0.3
                      ? formatCurrency(apartment.owner_expenses)
                      : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900">Ανάλυση Οφειλών</h3>
              
              {/* Παλαιότερες Οφειλές με διαχωρισμό */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-purple-900">Παλαιότερες Οφειλές:</span>
                  <div className="font-bold text-lg text-purple-900">
                    {Math.abs(apartment.net_obligation) <= 0.30 ? '-' : formatCurrency(apartment.previous_balance)}
                  </div>
                </div>
                
                {/* Διαχωρισμός Παλαιότερων Οφειλών */}
                {apartment.previous_balance > 0 && (
                  <div className="ml-4 space-y-1 text-sm border-l-2 border-purple-300 pl-3">
                    {(apartment as any).previous_owner_expenses > 0 && (
                      <div className="flex items-center justify-between text-red-700">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">├─</span>
                          <span>Δαπάνες Ιδιοκτήτη</span>
                          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 text-xs px-1 py-0">Δ</Badge>
                        </div>
                        <span className="font-medium">{formatCurrency((apartment as any).previous_owner_expenses)}</span>
                      </div>
                    )}
                    {(apartment as any).previous_resident_expenses > 0 && (
                      <div className="flex items-center justify-between text-green-700">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">{(apartment as any).previous_owner_expenses > 0 ? '└─' : '├─'}</span>
                          <span>Δαπάνες Ενοίκου</span>
                          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs px-1 py-0">Ε</Badge>
                        </div>
                        <span className="font-medium">{formatCurrency((apartment as any).previous_resident_expenses)}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* Τρέχων Μήνας και Πληρωμές */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <span className="text-sm text-gray-600">Ποσό Κοινοχρήστων (Τρέχων):</span>
                  <div className="font-medium text-lg">
                    {formatCurrency(apartment.expense_share)}
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-3">
                  <span className="text-sm text-gray-600">Σύνολο Πληρωμών:</span>
                  <div className="font-medium text-lg text-green-600">
                    {formatCurrency(apartment.total_payments)}
                  </div>
                </div>
              </div>
            </div>

            {/* Expense Breakdown - ✅ ΑΝΑΔΙΑΡΘΡΩΜΕΝΟ με 3 στήλες */}
            {apartment.expense_breakdown && apartment.expense_breakdown.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Ανάλυση Κοινοχρήστων</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto print:max-h-none">
                  {(() => {
                    // Group expenses by month
                    const groupedExpenses = (apartment.expense_breakdown || []).reduce((groups, expense) => {
                      const month = expense.month;
                      if (!groups[month]) {
                        groups[month] = {
                          month: month,
                          month_display: expense.month_display,
                          expenses: []
                        };
                      }
                      groups[month].expenses.push(expense);
                      return groups;
                    }, {} as { [key: string]: { month: string; month_display: string; expenses: any[] } });
                    
                    return Object.values(groupedExpenses).map((group, groupIndex) => (
                      <div key={groupIndex} className="border border-gray-200 rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 border-b border-gray-200">
                          <h5 className="text-sm font-semibold text-gray-700">{group.month_display}</h5>
                        </div>
                        
                        {/* ΠΙΝΑΚΑΣ ΜΕ 3 ΣΤΗΛΕΣ */}
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">
                                  Περιγραφή Δαπάνης
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">
                                  Χρέωση Ενοίκου
                                </th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-gray-600">
                                  Χρέωση Ιδιοκτήτη
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {group.expenses.map((expense, index) => {
                                // Λογική κατανομής ποσών
                                const residentCharge = expense.payer_responsibility === 'owner' 
                                  ? 0 
                                  : expense.share_amount;
                                const ownerCharge = expense.payer_responsibility === 'owner' 
                                  ? expense.share_amount 
                                  : 0;
                                
                                return (
                                  <tr key={index} className="border-t border-gray-100">
                                    <td className="px-3 py-2 text-gray-700">{expense.expense_title}</td>
                                    <td className="px-3 py-2 text-right font-medium">
                                      {residentCharge > 0 ? formatCurrency(residentCharge) : '-'}
                                    </td>
                                    <td className="px-3 py-2 text-right font-medium">
                                      {ownerCharge > 0 ? formatCurrency(ownerCharge) : '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                              <tr>
                                <td className="px-3 py-2 text-sm font-semibold text-gray-700">
                                  Σύνολο {group.month_display}:
                                </td>
                                <td className="px-3 py-2 text-right text-sm font-semibold text-blue-600">
                                  {formatCurrency(
                                    group.expenses.reduce((sum, exp) => 
                                      sum + (exp.payer_responsibility === 'owner' ? 0 : exp.share_amount), 0
                                    )
                                  )}
                                </td>
                                <td className="px-3 py-2 text-right text-sm font-semibold text-blue-600">
                                  {formatCurrency(
                                    group.expenses.reduce((sum, exp) => 
                                      sum + (exp.payer_responsibility === 'owner' ? exp.share_amount : 0), 0
                                    )
                                  )}
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Payment Instructions */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 print:bg-white print:border print:border-yellow-300">
              <h3 className="font-semibold text-gray-900 mb-2">Οδηγίες Πληρωμής</h3>
              <div className="space-y-2 text-sm">
                <p>• Η πληρωμή πρέπει να γίνει <strong>πριν την {paymentDeadline}</strong></p>
                <p>• Επιτρέπονται οι εξής τρόποι πληρωμής:</p>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li>Τραπεζική κατάθεση</li>
                  <li>Online banking</li>
                  <li>Στο γραφείο διαχείρισης</li>
                </ul>
                <p>• Για οποιαδήποτε απορία, επικοινωνήστε με το γραφείο διαχείρισης</p>
              </div>
            </div>

            {/* Footer - Print Only */}
            <div className="hidden print:block border-t border-gray-300 pt-4 mt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold">Τραπεζικά Στοιχεία:</p>
                  {user?.office_bank_iban ? (
                    <>
                      <p>IBAN: {user.office_bank_iban}</p>
                      <p>Τράπεζα: {user.office_bank_name}</p>
                      <p>Δικαιούχος: {user.office_bank_beneficiary || user.office_name}</p>
                    </>
                  ) : (
                    <>
                      <p>IBAN: GR16 0110 1250 0000 1234 5678 901</p>
                      <p>Δικαιούχος: {user?.office_name || 'Γραφείο Διαχείρισης'}</p>
                    </>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold">Επικοινωνία:</p>
                  <p>{user?.office_phone}</p>
                  <p>{user?.office_address}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
