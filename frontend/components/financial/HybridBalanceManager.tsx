'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  Eye,
  Lock,
  Unlock,
  Building2,
  PiggyBank,
  Settings,
  BarChart3,
  RefreshCw
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface MonthlyBalance {
  id: number;
  year: number;
  month: number;
  month_display: string;
  total_expenses: number;
  total_payments: number;
  previous_obligations: number;
  reserve_fund_amount: number;
  management_fees: number;
  total_obligations: number;
  carry_forward: number;
  annual_carry_forward: number;
  balance_year: number;
  main_balance_carry_forward: number;
  reserve_balance_carry_forward: number;
  management_balance_carry_forward: number;
  main_obligations: number;
  reserve_obligations: number;
  management_obligations: number;
  main_net_result: number;
  reserve_net_result: number;
  management_net_result: number;
  net_result: number;
  is_closed: boolean;
  closed_at: string | null;
  created_at: string;
  updated_at: string;
}

interface HybridBalanceSummary {
  building_id: number;
  year: number | null;
  total_main_balance: number;
  total_reserve_balance: number;
  total_management_balance: number;
  last_balance: MonthlyBalance | null;
  balances_count: number;
  hybrid_system_active: boolean;
}

interface HybridBalanceManagerProps {
  buildingId: number;
}

export const HybridBalanceManager: React.FC<HybridBalanceManagerProps> = ({ buildingId }) => {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedBalance, setSelectedBalance] = useState<MonthlyBalance | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch monthly balances
  const { data: balances, isLoading, error } = useQuery({
    queryKey: ['monthly-balances', buildingId],
    queryFn: async () => {
      const response = await api.get(`/financial/monthly-balances/by_building/?building_id=${buildingId}`);
      return response.data;
    },
    enabled: !!buildingId
  });

  // Fetch hybrid balance summary
  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: ['hybrid-balance-summary', buildingId],
    queryFn: async () => {
      const response = await api.get(`/financial/monthly-balances/hybrid_balance_summary/?building_id=${buildingId}`);
      return response.data;
    },
    enabled: !!buildingId
  });

  // Create month mutation
  const createMonthMutation = useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      const response = await api.post('/financial/monthly-balances/create_month/', {
        building_id: buildingId,
        year,
        month
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-balances', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['hybrid-balance-summary', buildingId] });
      setShowCreateDialog(false);
    }
  });

  // Close month mutation
  const closeMonthMutation = useMutation({
    mutationFn: async ({ year, month }: { year: number; month: number }) => {
      const response = await api.post('/financial/monthly-balances/close_month/', {
        building_id: buildingId,
        year,
        month
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monthly-balances', buildingId] });
      queryClient.invalidateQueries({ queryKey: ['hybrid-balance-summary', buildingId] });
    }
  });

  const handleCreateMonth = () => {
    createMonthMutation.mutate({ year: selectedYear, month: selectedMonth });
  };

  const handleCloseMonth = (balance: MonthlyBalance) => {
    if (confirm(`Είστε σίγουροι ότι θέλετε να κλείσετε τον μήνα ${balance.month_display}?`)) {
      closeMonthMutation.mutate({ year: balance.year, month: balance.month });
    }
  };

  const handleViewDetails = (balance: MonthlyBalance) => {
    setSelectedBalance(balance);
    setShowDetailsDialog(true);
  };

  const getStatusBadge = (balance: MonthlyBalance) => {
    if (balance.is_closed) {
      return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Κλειστός</Badge>;
    }
    return <Badge variant="outline" className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Ανοιχτός</Badge>;
  };

  const getNetResultIcon = (netResult: number) => {
    if (netResult > 0) {
      return <TrendingUp className="w-4 h-4 text-green-600" />;
    } else if (netResult < 0) {
      return <TrendingDown className="w-4 h-4 text-red-600" />;
    }
    return <div className="w-4 h-4" />;
  };

  const getNetResultColor = (netResult: number) => {
    if (netResult > 0) return 'text-green-600';
    if (netResult < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600">Σφάλμα κατά τη φόρτωση των μηνιαίων υπολοίπων</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Υβριδικό Σύστημα Υπολοίπων</h2>
          <p className="text-muted-foreground">
            Διαχείριση ξεχωριστών υπολοίπων: Κύριο, Αποθεματικό, Διαχείριση
          </p>
        </div>
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Νέος Μήνας
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Δημιουργία Μηνιαίου Υπολοίπου</DialogTitle>
              <DialogDescription>
                Δημιουργήστε νέο μηνιαίο υπόλοιπο για συγκεκριμένο μήνα
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="year">Έτος</Label>
                  <Input
                    id="year"
                    type="number"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    min="2020"
                    max="2030"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="month">Μήνας</Label>
                  <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                        <SelectItem key={month} value={month.toString()}>
                          {new Date(2024, month - 1).toLocaleDateString('el-GR', { month: 'long' })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Ακύρωση
                </Button>
                <Button 
                  onClick={handleCreateMonth}
                  disabled={createMonthMutation.isPending}
                >
                  {createMonthMutation.isPending ? 'Δημιουργία...' : 'Δημιουργία'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Hybrid Balance Summary */}
      {summary && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Σύνοψη Υβριδικού Συστήματος
            </CardTitle>
            <CardDescription>
              Συνολικά υπολοιπα ανά κατηγορία
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-white rounded-lg border">
                <Building2 className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Κύριο Υπόλοιπο</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(summary.total_main_balance)}
                </p>
                <p className="text-xs text-gray-500">Κανονικές Δαπάνες + Παλαιότερες Οφειλές</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <PiggyBank className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Αποθεματικό Υπόλοιπο</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(summary.total_reserve_balance)}
                </p>
                <p className="text-xs text-gray-500">Αποταμίευση για μελλοντικές δαπάνες</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <Settings className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-600">Διαχείριση Υπόλοιπο</p>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(summary.total_management_balance)}
                </p>
                <p className="text-xs text-gray-500">Έξοδα διαχείρισης κτιρίου</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monthly Balances List */}
      <div className="grid gap-4">
        {balances?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">Δεν υπάρχουν μηνιαία υπολοιπα</p>
              <Button onClick={() => setShowCreateDialog(true)}>
                Δημιουργία πρώτου μήνα
              </Button>
            </CardContent>
          </Card>
        ) : (
          balances?.map((balance: MonthlyBalance) => (
            <Card key={balance.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 rounded-lg bg-blue-50">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{balance.month_display}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        {getStatusBadge(balance)}
                        {balance.is_closed && balance.closed_at && (
                          <span className="text-xs text-gray-500">
                            Κλείστηκε: {new Date(balance.closed_at).toLocaleDateString('el-GR')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-6">
                    {/* Hybrid Balance Display */}
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-blue-600">
                        <Building2 className="w-4 h-4" />
                        <span className="text-lg font-bold">
                          {formatCurrency(balance.main_balance_carry_forward)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Κύριο</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-green-600">
                        <PiggyBank className="w-4 h-4" />
                        <span className="text-lg font-bold">
                          {formatCurrency(balance.reserve_balance_carry_forward)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Αποθεματικό</p>
                    </div>

                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-1 text-orange-600">
                        <Settings className="w-4 h-4" />
                        <span className="text-lg font-bold">
                          {formatCurrency(balance.management_balance_carry_forward)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">Διαχείριση</p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(balance)}
                        title="Προβολή λεπτομερειών"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      {!balance.is_closed && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCloseMonth(balance)}
                          disabled={closeMonthMutation.isPending}
                          title="Κλείσιμο μήνα"
                        >
                          <Lock className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t">
                  <div className="text-center">
                    <p className="text-sm font-medium text-red-600">{formatCurrency(balance.total_expenses)}</p>
                    <p className="text-xs text-gray-500">Δαπάνες</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-green-600">{formatCurrency(balance.total_payments)}</p>
                    <p className="text-xs text-gray-500">Εισπράξεις</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-purple-600">{formatCurrency(balance.previous_obligations)}</p>
                    <p className="text-xs text-gray-500">Παλαιότερες Οφειλές</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-blue-600">{formatCurrency(balance.total_obligations)}</p>
                    <p className="text-xs text-gray-500">Συνολικές Υποχρεώσεις</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Λεπτομέρειες Υβριδικού Συστήματος
            </DialogTitle>
            <DialogDescription>
              Πλήρεις πληροφορίες για το επιλεγμένο μηνιαίο υπόλοιπο
            </DialogDescription>
          </DialogHeader>
          {selectedBalance && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Μήνας</label>
                  <p className="text-sm font-medium">{selectedBalance.month_display}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-500">Κατάσταση</label>
                  <div>{getStatusBadge(selectedBalance)}</div>
                </div>
              </div>

              {/* Hybrid System Details */}
              <Tabs defaultValue="main" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="main" className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Κύριο Υπόλοιπο
                  </TabsTrigger>
                  <TabsTrigger value="reserve" className="flex items-center gap-2">
                    <PiggyBank className="w-4 h-4" />
                    Αποθεματικό
                  </TabsTrigger>
                  <TabsTrigger value="management" className="flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Διαχείριση
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="main" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Κανονικές Δαπάνες</label>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(selectedBalance.total_expenses)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Παλαιότερες Οφειλές</label>
                      <p className="text-lg font-bold text-purple-600">{formatCurrency(selectedBalance.previous_obligations)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Κύριες Υποχρεώσεις</label>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedBalance.main_obligations)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Κύριο Καθαρό Αποτέλεσμα</label>
                      <div className={`flex items-center space-x-2 ${getNetResultColor(selectedBalance.main_net_result)}`}>
                        {getNetResultIcon(selectedBalance.main_net_result)}
                        <p className="text-lg font-bold">{formatCurrency(selectedBalance.main_net_result)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Κύριο Carry Forward</label>
                      <p className="text-lg font-bold text-blue-600">{formatCurrency(selectedBalance.main_balance_carry_forward)}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="reserve" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Αποθεματικό Ταμείο</label>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(selectedBalance.reserve_fund_amount)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Αποθεματικό Καθαρό Αποτέλεσμα</label>
                      <div className={`flex items-center space-x-2 ${getNetResultColor(selectedBalance.reserve_net_result)}`}>
                        {getNetResultIcon(selectedBalance.reserve_net_result)}
                        <p className="text-lg font-bold">{formatCurrency(selectedBalance.reserve_net_result)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Αποθεματικό Carry Forward</label>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(selectedBalance.reserve_balance_carry_forward)}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="management" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Έξοδα Διαχείρισης</label>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(selectedBalance.management_fees)}</p>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Διαχειριστικό Καθαρό Αποτέλεσμα</label>
                      <div className={`flex items-center space-x-2 ${getNetResultColor(selectedBalance.management_net_result)}`}>
                        {getNetResultIcon(selectedBalance.management_net_result)}
                        <p className="text-lg font-bold">{formatCurrency(selectedBalance.management_net_result)}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-500">Διαχείριση Carry Forward</label>
                      <p className="text-lg font-bold text-orange-600">{formatCurrency(selectedBalance.management_balance_carry_forward)}</p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setShowDetailsDialog(false)}>
                  Κλείσιμο
                </Button>
                {!selectedBalance.is_closed && (
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false);
                      handleCloseMonth(selectedBalance);
                    }}
                    disabled={closeMonthMutation.isPending}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Κλείσιμο Μήνα
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
