'use client';

import React, { useState } from 'react';
import { 
  ArrowDownLeft, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  Building2
} from 'lucide-react';
import type { RecentExpense, RecentIncome, PendingIncome } from '@/hooks/useOfficeFinance';

interface RecentTransactionsProps {
  recentExpenses: RecentExpense[] | null;
  recentIncomes: RecentIncome[] | null;
  pendingIncomes: PendingIncome[] | null;
  isLoading?: boolean;
  onMarkReceived?: (id: number) => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('el-GR', {
    day: '2-digit',
    month: 'short',
  }).format(date);
}

type TabType = 'all' | 'incomes' | 'expenses' | 'pending';

export function RecentTransactions({ 
  recentExpenses, 
  recentIncomes, 
  pendingIncomes,
  isLoading,
  onMarkReceived 
}: RecentTransactionsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'all', label: 'Όλα' },
    { id: 'incomes', label: 'Έσοδα', count: recentIncomes?.length },
    { id: 'expenses', label: 'Έξοδα', count: recentExpenses?.length },
    { id: 'pending', label: 'Εκκρεμή', count: pendingIncomes?.length },
  ];

  if (isLoading) {
    return (
      <div className="bg-card/50 rounded-xl border border-border p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/20 p-2.5 rounded-lg">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Πρόσφατες Κινήσεις</h3>
            <p className="text-sm text-muted-foreground">Τελευταίες συναλλαγές</p>
          </div>
        </div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-3 rounded-lg bg-muted/30">
              <div className="w-10 h-10 bg-muted rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/3"></div>
              </div>
              <div className="h-5 bg-muted rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Combine and sort all transactions
  const allTransactions = [
    ...(recentIncomes?.map(i => ({ ...i, type: 'income' as const })) || []),
    ...(recentExpenses?.map(e => ({ ...e, type: 'expense' as const })) || []),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getFilteredTransactions = () => {
    switch (activeTab) {
      case 'incomes':
        return recentIncomes?.map(i => ({ ...i, type: 'income' as const })) || [];
      case 'expenses':
        return recentExpenses?.map(e => ({ ...e, type: 'expense' as const })) || [];
      case 'pending':
        return pendingIncomes?.map(p => ({ ...p, type: 'pending' as const })) || [];
      default:
        return allTransactions;
    }
  };

  const transactions = getFilteredTransactions();

  return (
    <div className="bg-card/50 rounded-xl border border-border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/20 p-2.5 rounded-lg">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Πρόσφατες Κινήσεις</h3>
            <p className="text-sm text-muted-foreground">Τελευταίες συναλλαγές</p>
          </div>
        </div>
        <button className="text-sm text-primary hover:text-primary/80 transition-colors">
          Προβολή όλων
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-muted/30 rounded-lg mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-secondary text-secondary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-primary/20 text-primary' : 'bg-muted'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Transactions List */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground">Δεν υπάρχουν κινήσεις</p>
          </div>
        ) : (
          transactions.map((transaction) => {
            const isIncome = transaction.type === 'income';
            const isExpense = transaction.type === 'expense';
            const isPending = transaction.type === 'pending';

            return (
              <div
                key={`${transaction.type}-${transaction.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                {/* Icon */}
                <div className={`p-2.5 rounded-full ${
                  isPending 
                    ? 'bg-primary/20' 
                    : isIncome 
                      ? 'bg-success/20' 
                      : 'bg-destructive/20'
                }`}>
                  {isPending ? (
                    <Clock className="w-4 h-4 text-primary" />
                  ) : isIncome ? (
                    <ArrowDownLeft className="w-4 h-4 text-success" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-destructive" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {transaction.title}
                    </span>
                    {!isPending && 'status' in transaction && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        transaction.status === 'received' 
                          ? 'bg-success/20 text-success'
                          : transaction.status === 'pending'
                            ? 'bg-primary/20 text-primary'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {transaction.status === 'received' ? 'Εισπράχθηκε' : 
                         transaction.status === 'pending' ? 'Εκκρεμεί' : transaction.status}
                      </span>
                    )}
                    {isExpense && 'is_paid' in transaction && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        transaction.is_paid 
                          ? 'bg-success/20 text-success'
                          : 'bg-primary/20 text-primary'
                      }`}>
                        {transaction.is_paid ? 'Πληρώθηκε' : 'Απλήρωτο'}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {formatDate(transaction.date)}
                    </span>
                    {transaction.category_name && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {transaction.category_name}
                        </span>
                      </>
                    )}
                    {'building_name' in transaction && transaction.building_name && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {transaction.building_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <span className={`text-sm font-semibold ${
                    isPending 
                      ? 'text-primary' 
                      : isIncome 
                        ? 'text-success' 
                        : 'text-destructive'
                  }`}>
                    {isPending || isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                </div>

                {/* Actions */}
                {isPending && onMarkReceived && (
                  <button
                    onClick={() => onMarkReceived(transaction.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-all"
                    title="Σημείωση ως εισπραχθέν"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RecentTransactions;
