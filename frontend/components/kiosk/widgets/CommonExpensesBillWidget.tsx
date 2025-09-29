'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, Euro, Calendar, AlertCircle } from 'lucide-react';

interface CommonExpensesData {
  month: string;
  year: number;
  totalAmount: number;
  breakdown: {
    category: string;
    amount: number;
    description: string;
  }[];
  dueDate: string;
  paymentStatus: 'paid' | 'pending' | 'overdue';
  apartmentCount: number;
  averagePerApartment: number;
}

interface CommonExpensesBillWidgetProps {
  data?: CommonExpensesData;
}

export default function CommonExpensesBillWidget({ data }: CommonExpensesBillWidgetProps) {
  // Mock data for demonstration
  const mockData: CommonExpensesData = {
    month: 'Σεπτέμβριος',
    year: 2025,
    totalAmount: 2450.50,
    breakdown: [
      { category: 'Θέρμανση', amount: 850.00, description: 'Κεντρική θέρμανση' },
      { category: 'Ηλεκτρισμός', amount: 320.00, description: 'Κοινόχρηστοι χώροι' },
      { category: 'Καθαριότητα', amount: 180.00, description: 'Καθαρισμός κτιρίου' },
      { category: 'Ασφάλεια', amount: 150.00, description: 'Σύστημα ασφαλείας' },
      { category: 'Συντήρηση', amount: 420.00, description: 'Συντήρηση και επισκευές' },
      { category: 'Διαχείριση', amount: 280.00, description: 'Διαχειριστική αμοιβή' },
      { category: 'Ασφάλειες', amount: 250.50, description: 'Ασφάλεια κτιρίου' }
    ],
    dueDate: '2025-10-15',
    paymentStatus: 'pending',
    apartmentCount: 10,
    averagePerApartment: 245.05
  };

  const displayData = data || mockData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-600/20 border-green-400/30 text-green-200';
      case 'pending': return 'bg-yellow-600/20 border-yellow-400/30 text-yellow-200';
      case 'overdue': return 'bg-red-600/20 border-red-400/30 text-red-200';
      default: return 'bg-gray-600/20 border-gray-400/30 text-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Πληρωμένο';
      case 'pending': return 'Εκκρεμές';
      case 'overdue': return 'Εκπρόθεσμο';
      default: return 'Άγνωστο';
    }
  };

  return (
    <div className="mt-8">
      <div className="bg-blue-600/20 p-6 rounded-lg border border-blue-400/30 max-w-4xl mx-auto">
        <div className="flex items-center justify-center mb-6">
          <Receipt className="w-8 h-8 mr-3" />
          <h3 className="text-2xl font-bold">Φύλλο Κοινόχρηστων</h3>
        </div>

        {/* Header Info */}
        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="text-center">
            <p className="text-lg font-semibold">{displayData.month} {displayData.year}</p>
            <p className="text-sm text-blue-200">Μήνας αναφοράς</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-300">€{displayData.totalAmount.toFixed(2)}</p>
            <p className="text-sm text-blue-200">Συνολικό ποσό</p>
          </div>
        </div>

        {/* Status and Due Date */}
        <div className="flex justify-between items-center mb-6">
          <Badge className={getStatusColor(displayData.paymentStatus)}>
            {getStatusText(displayData.paymentStatus)}
          </Badge>
          <div className="flex items-center text-sm">
            <Calendar className="w-4 h-4 mr-2" />
            <span>Προθεσμία: {displayData.dueDate}</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="mb-6">
          <h4 className="text-lg font-semibold mb-4 text-center">Ανάλυση Εξόδων</h4>
          <div className="space-y-3">
            {displayData.breakdown.map((item, index) => (
              <div key={index} className="flex justify-between items-center bg-white/5 p-3 rounded-lg">
                <div>
                  <p className="font-semibold">{item.category}</p>
                  <p className="text-sm text-blue-200">{item.description}</p>
                </div>
                <p className="font-bold text-green-300">€{item.amount.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div className="border-t border-white/20 pt-4">
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <p className="text-lg font-bold">{displayData.apartmentCount}</p>
              <p className="text-sm text-blue-200">Διαμερίσματα</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-300">€{displayData.averagePerApartment.toFixed(2)}</p>
              <p className="text-sm text-blue-200">Μέσο κόστος ανά διαμέρισμα</p>
            </div>
          </div>
        </div>

        {/* Payment Reminder */}
        {displayData.paymentStatus === 'pending' && (
          <div className="mt-4 p-3 bg-yellow-600/20 border border-yellow-400/30 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-yellow-300" />
              <p className="text-yellow-200">
                Παρακαλώ πληρώστε το ποσό μέχρι {displayData.dueDate}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
