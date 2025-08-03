'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useExpenses } from '@/hooks/useExpenses';
import { Expense, ExpenseCategory, DistributionType } from '@/types/financial';
import { formatCurrency, formatDate } from '@/lib/utils';
import { FilePreview } from '@/components/ui/FilePreview';

interface ExpenseListProps {
  buildingId: number;
  onExpenseSelect?: (expense: Expense) => void;
  showActions?: boolean;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({
  buildingId,
  onExpenseSelect,
  showActions = true,
}) => {
  const { expenses, isLoading, error } = useExpenses(buildingId);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];

    return expenses.filter((expense) => {
      const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           expense.category.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && !expense.is_distributed) ||
                           (statusFilter === 'distributed' && expense.is_distributed);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [expenses, searchTerm, categoryFilter, statusFilter]);

  const getCategoryColor = (category: ExpenseCategory) => {
    const colors: Record<ExpenseCategory, string> = {
      [ExpenseCategory.ELECTRICITY]: 'bg-blue-100 text-blue-800',
      [ExpenseCategory.WATER]: 'bg-cyan-100 text-cyan-800',
      [ExpenseCategory.HEATING]: 'bg-orange-100 text-orange-800',
      [ExpenseCategory.CLEANING]: 'bg-green-100 text-green-800',
      [ExpenseCategory.MAINTENANCE]: 'bg-purple-100 text-purple-800',
      [ExpenseCategory.INSURANCE]: 'bg-red-100 text-red-800',
      [ExpenseCategory.ADMINISTRATION]: 'bg-gray-100 text-gray-800',
      [ExpenseCategory.OTHER]: 'bg-yellow-100 text-yellow-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const getDistributionBadge = (distribution: DistributionType) => {
    const labels: Record<DistributionType, string> = {
      [DistributionType.EQUAL]: 'Ισόποσα',
      [DistributionType.MILLS]: 'Χιλιοστά',
      [DistributionType.METERS]: 'Μετρητές',
    };
    return labels[distribution] || 'Άγνωστο';
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Λίστα Δαπανών</span>
          <Badge variant="secondary">
            {filteredExpenses.length} από {expenses?.length || 0}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Input
            placeholder="Αναζήτηση δαπάνης..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:col-span-2"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Κατηγορία" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι κατηγορίες</SelectItem>
              <SelectItem value={ExpenseCategory.ELECTRICITY}>Ηλεκτρισμός</SelectItem>
              <SelectItem value={ExpenseCategory.WATER}>Νερό</SelectItem>
              <SelectItem value={ExpenseCategory.HEATING}>Θέρμανση</SelectItem>
              <SelectItem value={ExpenseCategory.CLEANING}>Καθαριότητα</SelectItem>
              <SelectItem value={ExpenseCategory.MAINTENANCE}>Συντήρηση</SelectItem>
              <SelectItem value={ExpenseCategory.INSURANCE}>Ασφάλεια</SelectItem>
              <SelectItem value={ExpenseCategory.ADMINISTRATION}>Διοίκηση</SelectItem>
              <SelectItem value={ExpenseCategory.OTHER}>Άλλο</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Κατάσταση" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Όλες οι καταστάσεις</SelectItem>
              <SelectItem value="active">Ενεργές</SelectItem>
              <SelectItem value="distributed">Κατανεμημένες</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Expenses List */}
        <div className="space-y-4">
          {filteredExpenses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Δεν βρέθηκαν δαπάνες με τα επιλεγμένα κριτήρια
            </div>
          ) : (
            filteredExpenses.map((expense) => (
              <div
                key={expense.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onExpenseSelect?.(expense)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{expense.description}</h3>
                      <Badge className={getCategoryColor(expense.category)}>
                        {expense.category}
                      </Badge>
                      {expense.is_distributed && (
                        <Badge variant="outline" className="text-green-600">
                          Κατανεμημένη
                        </Badge>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Ποσό:</span>
                        <span className="ml-1 font-semibold text-green-600">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Ημερομηνία:</span>
                        <span className="ml-1">{formatDate(expense.date)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Κατανομή:</span>
                        <span className="ml-1">{getDistributionBadge(expense.distribution_type)}</span>
                      </div>
                      <div>
                        <span className="font-medium">Δημιουργήθηκε:</span>
                        <span className="ml-1">{formatDate(expense.created_at)}</span>
                      </div>
                    </div>

                    {expense.notes && (
                      <div className="mt-2 text-sm text-gray-500">
                        <span className="font-medium">Σημειώσεις:</span> {expense.notes}
                      </div>
                    )}

                    {/* Επισυναπτόμενα Αρχεία */}
                    {expense.attachment && (
                      <div className="mt-3">
                        <span className="text-sm font-medium text-gray-700">Επισύναψη:</span>
                        <div className="mt-2">
                          <FilePreview
                            file={expense.attachment}
                            fileName={expense.attachment.split('/').pop()}
                            showRemove={false}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {showActions && (
                    <div className="flex flex-col gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExpenseSelect?.(expense);
                        }}
                      >
                        Προβολή
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}; 