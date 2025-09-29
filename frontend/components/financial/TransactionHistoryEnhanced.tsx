'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  Download, 
  Eye, 
  ExternalLink,
  FileText,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';
import ExportWithOpen from '@/components/financial/ExportWithOpen';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface Transaction {
  id: number;
  date: string;
  type: string;
  description: string;
  amount: number;
  apartment_number: string;
  reference_type: string;
  reference_id: number;
}

interface TransactionHistoryEnhancedProps {
  buildingId: number;
  limit?: number;
  selectedMonth?: string;
}

export default function TransactionHistoryEnhanced({ 
  buildingId, 
  limit = 50, 
  selectedMonth 
}: TransactionHistoryEnhancedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: 'all',
    apartment: 'all',
    date_from: '',
    date_to: ''
  });

  // Φόρτωση συναλλαγών
  const loadTransactions = async (customFilters = filters) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        limit: limit.toString(),
        ...(selectedMonth && { month: selectedMonth }),
        ...customFilters
      });

      const response = await api.get(`/financial/transactions/?${params}`);
      setTransactions(response.data.results || response.data);
    } catch (error) {
      console.error('Σφάλμα φόρτωσης συναλλαγών:', error);
      toast.error('Δεν ήταν δυνατή η φόρτωση των συναλλαγών');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [buildingId, limit, selectedMonth]);

  // Εξαγωγή σε Excel
  const exportToExcel = async (): Promise<Blob> => {
    const params = new URLSearchParams({
      building_id: buildingId.toString(),
      report_type: 'transaction_history',
      ...filters,
    });

    const response = await api.get(`/financial/reports/export_excel/?${params}`, {
      responseType: 'blob'
    });
    
    return response.data;
  };

  // Εξαγωγή σε PDF
  const exportToPDF = async (): Promise<Blob> => {
    const params = new URLSearchParams({
      building_id: buildingId.toString(),
      report_type: 'transaction_history',
      ...filters,
    });

    const response = await api.get(`/financial/reports/export_pdf/?${params}`, {
      responseType: 'blob'
    });
    
    return response.data;
  };

  // Εφαρμογή φίλτρων
  const applyFilters = () => {
    loadTransactions();
  };

  // Φιλτραρισμένα αποτελέσματα
  const filteredTransactions = transactions.filter(transaction => {
    if (filters.search && !transaction.description.toLowerCase().includes(filters.search.toLowerCase())) {
      return false;
    }
    if (filters.type !== 'all' && transaction.type !== filters.type) {
      return false;
    }
    if (filters.apartment !== 'all' && transaction.apartment_number !== filters.apartment) {
      return false;
    }
    return true;
  });

  // Μοναδικοί τύποι συναλλαγών
  const transactionTypes = Array.from(new Set(transactions.map(t => t.type)));

  // Μοναδικοί αριθμοί διαμερισμάτων
  const apartmentNumbers = Array.from(new Set(transactions.map(t => t.apartment_number))).sort();

  // Μορφοποίηση ποσού
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('el-GR', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount);
  };

  // Μορφοποίηση ημερομηνίας
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy', { locale: el });
  };

  // Μορφοποίηση τύπου συναλλαγής
  const formatTransactionType = (type: string) => {
    const typeMap: Record<string, string> = {
      'common_expense_payment': 'Είσπραξη Κοινοχρήστων',
      'expense_payment': 'Είσπραξη Δαπάνης',
      'refund': 'Επιστροφή',
      'common_expense_charge': 'Χρέωση Κοινοχρήστων',
      'payment_received': 'Είσπραξη Ληφθείσα',
      'expense_created': 'Δαπάνη Δημιουργήθηκε',
      'expense_issued': 'Δαπάνη Εκδόθηκε',
      'balance_adjustment': 'Προσαρμογή Υπολοίπου',
      'interest_charge': 'Χρέωση Τόκων',
      'penalty_charge': 'Χρέωση Προστίμου'
    };
    return typeMap[type] || type;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ιστορικό Συναλλαγών
          </CardTitle>
          
          {/* Εξαγωγή με Επιλογές */}
          <div className="flex items-center gap-2">
            <ExportWithOpen
              fileName={`ιστορικό_συναλλαγών_${new Date().toISOString().split('T')[0]}.xlsx`}
              exportFunction={exportToExcel}
              fileType="excel"
              variant="outline"
              size="sm"
            />
            
            <ExportWithOpen
              fileName={`ιστορικό_συναλλαγών_${new Date().toISOString().split('T')[0]}.pdf`}
              exportFunction={exportToPDF}
              fileType="pdf"
              variant="outline"
              size="sm"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Φίλτρα */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-gray-50">
          <div className="space-y-2">
            <label className="text-sm font-medium">Αναζήτηση</label>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Περιγραφή..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-8"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Τύπος</label>
            <Select value={filters.type} onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Όλοι οι τύποι" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλοι οι τύποι</SelectItem>
                {transactionTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {formatTransactionType(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Διαμέρισμα</label>
            <Select value={filters.apartment} onValueChange={(value) => setFilters(prev => ({ ...prev, apartment: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Όλα τα διαμερίσματα" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Όλα τα διαμερίσματα</SelectItem>
                {apartmentNumbers.map(apt => (
                  <SelectItem key={apt} value={apt}>
                    {apt}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">&nbsp;</label>
            <Button onClick={applyFilters} className="w-full">
              <Filter className="h-4 w-4 mr-2" />
              Εφαρμογή Φίλτρων
            </Button>
          </div>
        </div>

        {/* Πίνακας Συναλλαγών */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ημερομηνία</TableHead>
                <TableHead>Τύπος</TableHead>
                <TableHead>Περιγραφή</TableHead>
                <TableHead>Διαμέρισμα</TableHead>
                <TableHead className="text-right">Ποσό</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-500">Φόρτωση συναλλαγών...</p>
                  </TableCell>
                </TableRow>
              ) : filteredTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    Δεν βρέθηκαν συναλλαγές
                  </TableCell>
                </TableRow>
              ) : (
                filteredTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="font-medium">
                      {formatDate(transaction.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        transaction.type.includes('payment') ? 'default' :
                        transaction.type.includes('charge') ? 'destructive' : 'secondary'
                      }>
                        {formatTransactionType(transaction.type)}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {transaction.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transaction.apartment_number}
                      </Badge>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${
                      transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatAmount(transaction.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Σύνοψη */}
        {filteredTransactions.length > 0 && (
          <div className="flex justify-between items-center p-4 border rounded-lg bg-gray-50">
            <div className="text-sm text-gray-600">
              Εμφανίζονται {filteredTransactions.length} από {transactions.length} συναλλαγές
            </div>
            <div className="text-sm font-medium">
              Σύνολο: {formatAmount(filteredTransactions.reduce((sum, t) => sum + t.amount, 0))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
