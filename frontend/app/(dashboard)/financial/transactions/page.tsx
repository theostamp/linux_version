'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, Plus, Search, Filter, Calendar, ArrowUpRight, ArrowDownRight,
  Eye, Edit, Trash2, Download, Wallet, Building
} from 'lucide-react';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { 
  fetchTransactions, 
  fetchTransactionStatistics,
  fetchAccounts,
  type FinancialTransaction,
  type TransactionStatistics,
  type BuildingAccount
} from '@/lib/api';
import { toast } from 'react-hot-toast';
import Link from 'next/link';
import BuildingFilterIndicator from '@/components/BuildingFilterIndicator';

export default function TransactionsPage() {
  const { user } = useAuth();
  const { selectedBuilding, currentBuilding } = useBuilding();
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [stats, setStats] = useState<TransactionStatistics | null>(null);
  const [accounts, setAccounts] = useState<BuildingAccount[]>([]);
  const [filters, setFilters] = useState({
    transactionType: '',
    accountId: '',
    category: '',
    search: '',
    startDate: '',
    endDate: ''
  });

  const buildingToUse = selectedBuilding || currentBuilding;

  useEffect(() => {
    if (buildingToUse) {
      loadData();
    }
  }, [buildingToUse, filters]);

  const loadData = async () => {
    if (!buildingToUse) return;
    
    setIsLoading(true);
    try {
      const [transactionsData, statsData, accountsData] = await Promise.all([
        fetchTransactions({
          buildingId: buildingToUse.id,
          transactionType: filters.transactionType || undefined,
          accountId: filters.accountId ? parseInt(filters.accountId) : undefined,
          category: filters.category || undefined,
          startDate: filters.startDate || undefined,
          endDate: filters.endDate || undefined
        }),
        fetchTransactionStatistics(buildingToUse.id),
        fetchAccounts(buildingToUse.id)
      ]);

      let filteredTransactions = transactionsData;
      
      // Client-side search filtering
      if (filters.search) {
        filteredTransactions = transactionsData.filter(transaction =>
          transaction.description.toLowerCase().includes(filters.search.toLowerCase()) ||
          transaction.reference_number?.toLowerCase().includes(filters.search.toLowerCase()) ||
          transaction.category?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }

      setTransactions(filteredTransactions);
      setStats(statsData);
      setAccounts(accountsData);
    } catch (error) {
      console.error('Error loading transactions:', error);
      toast.error('Σφάλμα κατά τη φόρτωση των συναλλαγών');
    } finally {
      setIsLoading(false);
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    return type === 'income' ? (
      <ArrowUpRight className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDownRight className="w-4 h-4 text-red-600" />
    );
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      transactionType: '',
      accountId: '',
      category: '',
      search: '',
      startDate: '',
      endDate: ''
    });
  };

  if (!buildingToUse) {
    return (
      <div className="p-6 max-w-xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">📊 Συναλλαγές</h1>
        <p className="text-red-600">Παρακαλώ επιλέξτε κτίριο για να συνεχίσετε.</p>
        <BuildingFilterIndicator />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            📊 Οικονομικές Συναλλαγές
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Διαχείριση και παρακολούθηση οικονομικών συναλλαγών
          </p>
          <BuildingFilterIndicator />
        </div>
        <Button asChild>
          <Link href="/financial/transactions/new">
            <Plus className="w-4 h-4 mr-2" />
            Νέα Συναλλαγή
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Συνολικές Συναλλαγές</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_transactions}</div>
              <p className="text-xs text-muted-foreground">
                Όλες οι συναλλαγές
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Συνολικά Έσοδα</CardTitle>
              <ArrowUpRight className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">€{stats.total_income?.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Μηνιαία: €{stats.monthly_income?.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Συνολικά Έξοδα</CardTitle>
              <ArrowDownRight className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">€{stats.total_expenses?.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Μηνιαία: €{stats.monthly_expenses?.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Καθαρό Υπόλοιπο</CardTitle>
              <Wallet className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.net_balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                €{stats.net_balance?.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {stats.net_balance >= 0 ? 'Θετικό' : 'Αρνητικό'} υπόλοιπο
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Φίλτρα
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Αναζήτηση</label>
              <Input
                placeholder="Περιγραφή, αναφορά..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Τύπος</label>
              <Select value={filters.transactionType} onValueChange={(value) => handleFilterChange('transactionType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Όλοι οι τύποι" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Όλοι οι τύποι</SelectItem>
                  <SelectItem value="income">Έσοδο</SelectItem>
                  <SelectItem value="expense">Έξοδο</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Λογαριασμός</label>
              <Select value={filters.accountId} onValueChange={(value) => handleFilterChange('accountId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Όλοι οι λογαριασμοί" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Όλοι οι λογαριασμοί</SelectItem>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.account_type_display}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Από Ημερομηνία</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="w-full"
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Έως Ημερομηνία</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="w-full"
              />
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="w-full"
              >
                Καθαρισμός
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Λίστα Συναλλαγών</CardTitle>
          <CardDescription>
            {transactions.length} συναλλαγές βρέθηκαν
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Φόρτωση συναλλαγών...</span>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Δεν βρέθηκαν συναλλαγές</p>
              <Button className="mt-4" variant="outline" asChild>
                <Link href="/financial/transactions/new">
                  Νέα Συναλλαγή
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getTransactionTypeIcon(transaction.transaction_type)}
                    </div>
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="text-sm text-gray-500">
                        {transaction.account_info} • {new Date(transaction.transaction_date).toLocaleDateString('el-GR')}
                        {transaction.category && ` • ${transaction.category}`}
                      </div>
                      {transaction.reference_number && (
                        <div className="text-sm text-gray-400">
                          Αναφορά: {transaction.reference_number}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className={`font-medium ${
                        transaction.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {transaction.transaction_type === 'income' ? '+' : '-'}€{parseFloat(transaction.amount).toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {transaction.transaction_type_display}
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/financial/transactions/${transaction.id}`}>
                          <Eye className="w-4 h-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/financial/transactions/${transaction.id}/edit`}>
                          <Edit className="w-4 h-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 