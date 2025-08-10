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
  buildingName?: string; // Add building name prop
  onExpenseSelect?: (expense: Expense) => void;
  showActions?: boolean;
  selectedMonth?: string; // Add selectedMonth prop
  onMonthChange?: (month: string) => void; // Add month change handler
  ref?: React.Ref<{ refresh: () => void }>;
}

export const ExpenseList = React.forwardRef<{ refresh: () => void }, ExpenseListProps>(({
  buildingId,
  buildingName,
  onExpenseSelect,
  showActions = true,
  selectedMonth,
  onMonthChange,
}, ref) => {
  const { expenses, isLoading, error, loadExpenses } = useExpenses(buildingId, selectedMonth);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];

    return expenses.filter((expense) => {
      const matchesSearch = expense.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (expense.category_display || expense.category).toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
      
      const matchesStatus = statusFilter === 'all' || 
                           (statusFilter === 'active' && !expense.is_issued) ||
                           (statusFilter === 'distributed' && expense.is_issued);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [expenses, searchTerm, categoryFilter, statusFilter]);

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
        <div className="flex items-center justify-between mb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>📋 Λίστα Δαπανών</span>
              <Badge variant="secondary">
                {filteredExpenses.length} από {expenses?.length || 0}
              </Badge>
            </CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Διαχείριση και παρακολούθηση όλων των δαπανών του κτιρίου
            </p>
          </div>
        </div>
        
        {/* Statistics Row */}
        {expenses && expenses.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {expenses.filter(e => !e.is_issued).length}
              </div>
              <div className="text-xs text-gray-600">⏳ Ανέκδοτες</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {expenses.filter(e => e.is_issued).length}
              </div>
              <div className="text-xs text-gray-600">✅ Εκδοθείσες</div>
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
                setStatusFilter('all');
                // Note: We don't clear selectedMonth as it's a primary filter
              }}
              className="text-xs"
              title="Καθαρίζει αναζήτηση, κατηγορία και κατάσταση (διατηρεί τον μήνα)"
            >
              🗑️ Καθαρισμός Φίλτρων
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <label className="text-xs font-medium text-gray-600">Κατάσταση</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Επιλέξτε κατάσταση" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📊 Όλες οι καταστάσεις</SelectItem>
                  <SelectItem value="active">⏳ Ανέκδοτες</SelectItem>
                  <SelectItem value="distributed">✅ Εκδοθείσες</SelectItem>
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
              {statusFilter !== 'all' && (
                <Badge variant="outline" className="text-xs">
                  {statusFilter === 'active' ? '⏳ Ανέκδοτες' : '✅ Εκδοθείσες'}
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
                  onClick={() => {
                    // Trigger new expense modal
                    window.location.href = `/financial?tab=expenses&modal=expense-form&building=${buildingId}`;
                  }}
                >
                  ➕ Προσθήκη Πρώτης Δαπάνης
                </Button>
              )}
            </div>
          ) : (
            filteredExpenses.map((expense) => (
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
                        {expense.is_issued ? (
                          <Badge variant="outline" className="text-green-600 text-xs">
                            ✓ Εκδοθείσα
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 text-xs">
                            ⏳ Ανέκδοτη
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    {/* Key Information Row */}
                    <div className="flex items-center gap-6 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-green-600 text-base">
                          {formatCurrency(expense.amount)}
                        </span>
                      </div>
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
                  </div>

                  {/* Actions */}
                  {showActions && (
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          onExpenseSelect?.(expense);
                        }}
                      >
                        👁️ Προβολή
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
}); 