'use client';

import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Building2,
  CreditCard,
  Pencil,
  Trash2,
  X,
  AlertTriangle
} from 'lucide-react';
import type { RecentExpense, RecentIncome, PendingIncome, UnpaidExpense } from '@/hooks/useOfficeFinance';

interface RecentTransactionsProps {
  recentExpenses: RecentExpense[] | null;
  recentIncomes: RecentIncome[] | null;
  pendingIncomes: PendingIncome[] | null;
  unpaidExpenses: UnpaidExpense[] | null;
  isLoading?: boolean;
  onMarkReceived?: (id: number) => void;
  onMarkPaid?: (id: number) => void;
  onEditExpense?: (id: number) => void;
  onEditIncome?: (id: number) => void;
  onDeleteExpense?: (id: number) => void;
  onDeleteIncome?: (id: number) => void;
}

// Confirmation Dialog Component
function DeleteConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  amount,
  type
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  amount: number;
  type: 'expense' | 'income';
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="p-3 rounded-full bg-rose-100 dark:bg-rose-900/30">
            <AlertTriangle className="w-8 h-8 text-rose-600" />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-center text-slate-900 dark:text-slate-100 mb-2">
          Διαγραφή {type === 'expense' ? 'Εξόδου' : 'Εσόδου'}
        </h3>

        {/* Message */}
        <p className="text-center text-slate-600 dark:text-slate-400 mb-2">
          Είστε σίγουροι ότι θέλετε να διαγράψετε:
        </p>
        <div className="text-center p-3 bg-slate-100 dark:bg-slate-800 rounded-lg mb-4">
          <p className="font-medium text-slate-900 dark:text-slate-100">{title}</p>
          <p className={`text-lg font-bold ${type === 'expense' ? 'text-rose-600' : 'text-teal-600'}`}>
            {type === 'expense' ? '-' : '+'}{new Intl.NumberFormat('el-GR', {
              style: 'currency',
              currency: 'EUR',
            }).format(amount)}
          </p>
        </div>
        <p className="text-center text-sm text-rose-600 dark:text-rose-400 mb-6">
          Αυτή η ενέργεια δεν μπορεί να αναιρεθεί!
        </p>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors font-medium"
          >
            Ακύρωση
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors font-medium shadow-lg shadow-rose-600/20"
          >
            Διαγραφή
          </button>
        </div>
      </div>
    </div>
  );
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

type TabType = 'all' | 'incomes' | 'expenses' | 'pending' | 'unpaid';

export function RecentTransactions({
  recentExpenses,
  recentIncomes,
  pendingIncomes,
  unpaidExpenses,
  isLoading,
  onMarkReceived,
  onMarkPaid,
  onEditExpense,
  onEditIncome,
  onDeleteExpense,
  onDeleteIncome
}: RecentTransactionsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [deleteDialog, setDeleteDialog] = useState<{
    isOpen: boolean;
    id: number;
    title: string;
    amount: number;
    type: 'expense' | 'income';
  } | null>(null);

  const handleDeleteClick = (id: number, title: string, amount: number, type: 'expense' | 'income') => {
    setDeleteDialog({ isOpen: true, id, title, amount, type });
  };

  const handleConfirmDelete = () => {
    if (!deleteDialog) return;

    if (deleteDialog.type === 'expense') {
      onDeleteExpense?.(deleteDialog.id);
    } else {
      onDeleteIncome?.(deleteDialog.id);
    }
    setDeleteDialog(null);
  };

  const tabs: { id: TabType; label: string; count?: number }[] = [
    { id: 'all', label: 'Όλα' },
    { id: 'incomes', label: 'Έσοδα', count: recentIncomes?.length },
    { id: 'expenses', label: 'Έξοδα', count: recentExpenses?.length },
    { id: 'pending', label: 'Εκκρεμή Είσπραξη', count: pendingIncomes?.length },
    { id: 'unpaid', label: 'Προς Πληρωμή', count: unpaidExpenses?.length },
  ];

  if (isLoading) {
    return (
      <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-primary/10 p-2.5 rounded-lg">
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
      case 'unpaid':
        return unpaidExpenses?.map(u => ({ ...u, type: 'unpaid' as const })) || [];
      default:
        return allTransactions;
    }
  };

  const transactions = getFilteredTransactions();

  return (
    <div className="bg-card rounded-xl border border-secondary p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 p-2.5 rounded-lg">
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
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg mb-4">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === tab.id
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === tab.id ? 'bg-primary/10 text-primary' : 'bg-muted'
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
            const isUnpaid = transaction.type === 'unpaid';

            return (
              <div
                key={`${transaction.type}-${transaction.id}`}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/30 transition-colors group"
              >
                {/* Icon */}
                <div className={`p-2.5 rounded-full ${
                  isPending
                    ? 'bg-primary/10'
                    : isUnpaid
                      ? 'bg-amber-500/10'
                      : isIncome
                        ? 'bg-teal-500/10'
                        : 'bg-rose-500/10'
                }`}>
                  {isPending ? (
                    <Clock className="w-4 h-4 text-primary" />
                  ) : isUnpaid ? (
                    <CreditCard className="w-4 h-4 text-amber-600" />
                  ) : isIncome ? (
                    <ArrowDownLeft className="w-4 h-4 text-teal-600" />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-rose-600" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground truncate">
                      {transaction.title}
                    </span>
                    {!isPending && !isUnpaid && 'status' in transaction && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        transaction.status === 'received'
                          ? 'bg-teal-500/10 text-teal-600'
                          : transaction.status === 'pending'
                            ? 'bg-primary/10 text-primary'
                            : 'bg-muted text-muted-foreground'
                      }`}>
                        {transaction.status === 'received' ? 'Εισπράχθηκε' :
                         transaction.status === 'pending' ? 'Εκκρεμεί' : transaction.status}
                      </span>
                    )}
                    {isExpense && 'is_paid' in transaction && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        transaction.is_paid
                          ? 'bg-teal-500/10 text-teal-600'
                          : 'bg-amber-500/10 text-amber-600'
                      }`}>
                        {transaction.is_paid ? 'Πληρώθηκε' : 'Απλήρωτο'}
                      </span>
                    )}
                    {isUnpaid && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600">
                        Προς Πληρωμή
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
                    {'supplier_name' in transaction && transaction.supplier_name && (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span className="text-xs text-muted-foreground truncate">
                          {transaction.supplier_name}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right mr-2">
                  <span className={`text-sm font-semibold ${
                    isPending
                      ? 'text-primary'
                      : isUnpaid
                        ? 'text-amber-600'
                        : isIncome
                          ? 'text-teal-600'
                          : 'text-rose-600'
                  }`}>
                    {isPending || isIncome ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {/* Edit button - always visible for expenses and incomes */}
                  {(isExpense || isUnpaid) && onEditExpense && (
                    <button
                      onClick={() => onEditExpense(transaction.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
                      title="Επεξεργασία"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                  {(isIncome || isPending) && onEditIncome && (
                    <button
                      onClick={() => onEditIncome(transaction.id)}
                      className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
                      title="Επεξεργασία"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}

                  {/* Mark as received - for pending incomes */}
                  {isPending && onMarkReceived && (
                    <button
                      onClick={() => onMarkReceived(transaction.id)}
                      className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-all"
                      title="Σημείωση ως εισπραχθέν"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Mark as paid - for unpaid expenses */}
                  {isUnpaid && onMarkPaid && (
                    <button
                      onClick={() => onMarkPaid(transaction.id)}
                      className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-all"
                      title="Σημείωση ως πληρωμένο"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Mark as paid - for expenses in the expenses tab that are not paid */}
                  {isExpense && 'is_paid' in transaction && !transaction.is_paid && onMarkPaid && (
                    <button
                      onClick={() => onMarkPaid(transaction.id)}
                      className="p-1.5 rounded-lg bg-teal-100 dark:bg-teal-900/30 text-teal-600 hover:bg-teal-200 dark:hover:bg-teal-900/50 transition-all"
                      title="Σημείωση ως πληρωμένο"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete button */}
                  {(isExpense || isUnpaid) && onDeleteExpense && (
                    <button
                      onClick={() => handleDeleteClick(transaction.id, transaction.title, transaction.amount, 'expense')}
                      className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 hover:bg-rose-200 dark:hover:bg-rose-900/50 hover:text-rose-600 transition-all"
                      title="Διαγραφή"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  {(isIncome || isPending) && onDeleteIncome && (
                    <button
                      onClick={() => handleDeleteClick(transaction.id, transaction.title, transaction.amount, 'income')}
                      className="p-1.5 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-500 hover:bg-rose-200 dark:hover:bg-rose-900/50 hover:text-rose-600 transition-all"
                      title="Διαγραφή"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialog && (
        <DeleteConfirmDialog
          isOpen={deleteDialog.isOpen}
          onClose={() => setDeleteDialog(null)}
          onConfirm={handleConfirmDelete}
          title={deleteDialog.title}
          amount={deleteDialog.amount}
          type={deleteDialog.type}
        />
      )}
    </div>
  );
}

export default RecentTransactions;
