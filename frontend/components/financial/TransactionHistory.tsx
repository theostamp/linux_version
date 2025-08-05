'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Calendar, Download, Search, Filter, FileText, FileSpreadsheet } from 'lucide-react';
import { format } from 'date-fns';
// import { el } from 'date-fns/locale/el';
import { Transaction } from '@/types/financial';
import { api } from '@/lib/api';
import { ApartmentFilter } from './ApartmentFilter';

interface TransactionHistoryProps {
  buildingId: number;
  limit?: number;
  selectedMonth?: string;
}

interface FilterOptions {
  startDate: string;
  endDate: string;
  transactionType: string;
  apartmentId: string;
  searchTerm: string;
}

export default function TransactionHistory({ buildingId, limit, selectedMonth }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    startDate: '',
    endDate: '',
    transactionType: 'all',
    apartmentId: 'all',
    searchTerm: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [apartmentSearchTerm, setApartmentSearchTerm] = useState('');

  // Φόρτωση κινήσεων
  const loadTransactions = async (filterParams?: Partial<FilterOptions>) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        ...(limit && { limit: limit.toString() }),
        ...(selectedMonth && { month: selectedMonth }),
        ...filterParams,
      });

      const response = await api.get(`/financial/reports/transaction_history/?${params}`);
      setTransactions(response.data);
    } catch (error) {
      console.error('Σφάλμα φόρτωσης κινήσεων:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [buildingId, selectedMonth]);

  // Εφαρμογή φίλτρων
  const applyFilters = () => {
    const activeFilters = Object.fromEntries(
      Object.entries(filters).filter(([key, value]) => value !== '' && value !== 'all')
    );
    loadTransactions(activeFilters);
  };

  // Εξαγωγή σε Excel
  const exportToExcel = async () => {
    try {
      const params = new URLSearchParams({
        building_id: buildingId.toString(),
        report_type: 'transaction_history',
        ...filters,
      });

      const response = await api.get(`/financial/reports/export_excel/?${params}`, {
        responseType: 'blob'
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaction_history_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Σφάλμα εξαγωγής:', error);
    }
  };

  // Εξαγωγή σε PDF
  const exportToPDF = async () => {
    try {
      const params = new URLSearchParams({
        building_id: buildingId,
        report_type: 'transaction_history',
        ...filters,
      });

      const response = await api.get(`/financial/reports/export_pdf/?${params}`, {
        responseType: 'blob'
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transaction_history_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Σφάλμα εξαγωγής PDF:', error);
    }
  };

  // Φιλτραρισμένα αποτελέσματα
  const filteredTransactions = transactions.filter(transaction => {
    // Filter by apartment search term
    if (apartmentSearchTerm) {
      const searchLower = apartmentSearchTerm.toLowerCase();
      const apartmentMatch = transaction.apartment_number?.toLowerCase().includes(searchLower);
      if (!apartmentMatch) return false;
    }
    
    // Filter by general search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      return (
        transaction.description.toLowerCase().includes(searchLower) ||
        transaction.apartment_number?.toLowerCase().includes(searchLower) ||
        transaction.type_display?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'failed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'common_expense_payment': return 'bg-blue-100 text-blue-800';
      case 'expense_payment': return 'bg-purple-100 text-purple-800';
      case 'refund': return 'bg-green-100 text-green-800';
      case 'common_expense_charge': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ιστορικό Κινήσεων
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Φίλτρα
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToExcel}
            >
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
            >
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Apartment Filter - Always visible */}
        <div className="mb-6 p-4 border rounded-lg bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Φιλτράρισμα ανά διαμέρισμα</h3>
          </div>
          <ApartmentFilter
            buildingId={parseInt(buildingId)}
            selectedApartmentId={filters.apartmentId}
            onApartmentChange={(apartmentId) => setFilters({ ...filters, apartmentId })}
            searchTerm={apartmentSearchTerm}
            onSearchChange={setApartmentSearchTerm}
          />
        </div>

        {/* Φίλτρα */}
        {showFilters && (
          <div className="mb-6 p-4 border rounded-lg bg-gray-50">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Από Ημερομηνία</label>
                <Input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Έως Ημερομηνία</label>
                <Input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Τύπος Κίνησης</label>
                <Select
                  value={filters.transactionType}
                  onValueChange={(value) => setFilters({ ...filters, transactionType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Όλοι οι τύποι" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Όλοι οι τύποι</SelectItem>
                                  <SelectItem value="common_expense_payment">Είσπραξη Κοινοχρήστων</SelectItem>
              <SelectItem value="expense_payment">Είσπραξη Δαπάνης</SelectItem>
                    <SelectItem value="refund">Επιστροφή</SelectItem>
                    <SelectItem value="common_expense_charge">Χρέωση Κοινοχρήστων</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Αναζήτηση</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Αναζήτηση..."
                    value={filters.searchTerm}
                    onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <Button onClick={applyFilters} size="sm">
                Εφαρμογή Φίλτρων
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFilters({
                    startDate: '',
                    endDate: '',
                    transactionType: 'all',
                    apartmentId: 'all',
                    searchTerm: '',
                  });
                  loadTransactions();
                }}
              >
                Καθαρισμός
              </Button>
            </div>
          </div>
        )}

        {/* Λίστα κινήσεων */}
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Δεν βρέθηκαν κινήσεις
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getTypeColor(transaction.type)}>
                        {transaction.type_display}
                      </Badge>
                      {transaction.status && (
                        <Badge className={getStatusColor(transaction.status)}>
                          {transaction.status_display}
                        </Badge>
                      )}
                      {transaction.apartment_number && (
                        <Badge variant="outline">
                          Διαμέρισμα {transaction.apartment_number}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{transaction.description}</p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 mt-2">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(transaction.date), 'dd/MM/yyyy HH:mm')}
                      </span>
                      {transaction.created_by && (
                        <span>Δημιουργήθηκε από: {transaction.created_by}</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold">
                      €{parseFloat(transaction.amount).toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      Υπόλοιπο: €{parseFloat(transaction.balance_after).toFixed(2)}
                    </div>
                  </div>
                </div>
                {transaction.notes && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                    {transaction.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Στατιστικά */}
        {filteredTransactions.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium mb-2">Στατιστικά</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Συνολικές κινήσεις:</span>
                <div className="font-medium">{filteredTransactions.length}</div>
              </div>
              <div>
                <span className="text-gray-600">Συνολικό ποσό:</span>
                <div className="font-medium">
                  €{filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0).toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Μέσο ποσό:</span>
                <div className="font-medium">
                  €{(filteredTransactions.reduce((sum, t) => sum + parseFloat(t.amount), 0) / filteredTransactions.length).toFixed(2)}
                </div>
              </div>
              <div>
                <span className="text-gray-600">Τελευταία κίνηση:</span>
                <div className="font-medium">
                  {filteredTransactions.length > 0 && 
                    format(new Date(filteredTransactions[0].date), 'dd/MM/yyyy')
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 