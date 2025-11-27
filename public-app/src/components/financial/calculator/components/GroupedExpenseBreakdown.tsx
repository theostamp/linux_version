import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ExpenseBreakdownGrouped } from '@/hooks/useMonthlyExpenses';
import { formatAmount } from '../utils/formatters';

interface GroupedExpenseBreakdownProps {
  groupedExpenses: ExpenseBreakdownGrouped;
  managementFee: number;
  reserveFund: number;
  previousBalance: number;
}

export const GroupedExpenseBreakdown: React.FC<GroupedExpenseBreakdownProps> = ({
  groupedExpenses,
  managementFee,
  reserveFund,
  previousBalance
}) => {
  // State για το ποιες ομάδες είναι expanded
  const [expandedPayers, setExpandedPayers] = useState<Record<string, boolean>>({
    resident: true,
    owner: true,
    shared: true
  });

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const togglePayer = (payer: string) => {
    setExpandedPayers(prev => ({ ...prev, [payer]: !prev[payer] }));
  };

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));
  };

  // Υπολογισμός συνολικών
  const residentTotal = (groupedExpenses.resident?.total || 0) + managementFee;
  const ownerTotal = (groupedExpenses.owner?.total || 0) + reserveFund;
  const sharedTotal = groupedExpenses.shared?.total || 0;
  const grandTotal = residentTotal + ownerTotal + sharedTotal + previousBalance;

  return (
    <div className="space-y-3">
      {/* 🟢 ΔΑΠΑΝΕΣ ΕΝΟΙΚΩΝ */}
      {groupedExpenses.resident && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => togglePayer('resident')}
            className="w-full bg-gradient-to-r from-emerald-50 to-emerald-100 hover:from-emerald-100 hover:to-emerald-150 p-3 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{groupedExpenses.resident.icon}</span>
              <span className="font-bold text-emerald-800">{groupedExpenses.resident.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-emerald-700">{formatAmount(residentTotal)}€</span>
              {expandedPayers.resident ? (
                <ChevronUp className="h-5 w-5 text-emerald-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-emerald-600" />
              )}
            </div>
          </button>

          {expandedPayers.resident && (
            <div className="bg-white p-2 space-y-2">
              {Object.entries(groupedExpenses.resident.groups).map(([groupKey, group]) => (
                <div key={groupKey} className="border rounded">
                  <button
                    onClick={() => toggleGroup(`resident_${groupKey}`)}
                    className="w-full bg-muted hover:bg-accent p-2 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{group.icon}</span>
                      <span className="text-sm font-semibold text-foreground">{group.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{formatAmount(group.total)}€</span>
                      {expandedGroups[`resident_${groupKey}`] ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedGroups[`resident_${groupKey}`] && (
                    <div className="p-2 space-y-1">
                      {group.expenses.map((expense, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 px-2 bg-white rounded text-xs">
                          <span className="text-muted-foreground">{expense.category_display}</span>
                          <span className="font-semibold text-foreground">{formatAmount(expense.amount)}€</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Κόστος διαχείρισης */}
              {managementFee > 0 && (
                <div className="flex items-center justify-between py-2 px-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <span className="text-emerald-600 font-bold text-xs">Ε</span>
                    <span className="text-sm font-semibold text-gray-700">Κόστος Διαχείρισης</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{formatAmount(managementFee)}€</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🔴 ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ */}
      {groupedExpenses.owner && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => togglePayer('owner')}
            className="w-full bg-gradient-to-r from-red-50 to-red-100 hover:from-red-100 hover:to-red-150 p-3 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{groupedExpenses.owner.icon}</span>
              <span className="font-bold text-red-800">{groupedExpenses.owner.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-red-700">{formatAmount(ownerTotal)}€</span>
              {expandedPayers.owner ? (
                <ChevronUp className="h-5 w-5 text-red-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-red-600" />
              )}
            </div>
          </button>

          {expandedPayers.owner && (
            <div className="bg-white p-2 space-y-2">
              {Object.entries(groupedExpenses.owner.groups).map(([groupKey, group]) => (
                <div key={groupKey} className="border rounded">
                  <button
                    onClick={() => toggleGroup(`owner_${groupKey}`)}
                    className="w-full bg-muted hover:bg-accent p-2 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{group.icon}</span>
                      <span className="text-sm font-semibold text-foreground">{group.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{formatAmount(group.total)}€</span>
                      {expandedGroups[`owner_${groupKey}`] ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedGroups[`owner_${groupKey}`] && (
                    <div className="p-2 space-y-1">
                      {group.expenses.map((expense, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 px-2 bg-white rounded text-xs">
                          <span className="text-muted-foreground">{expense.category_display}</span>
                          <span className="font-semibold text-foreground">{formatAmount(expense.amount)}€</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Αποθεματικό Ταμείο */}
              {reserveFund > 0 && (
                <div className="flex items-center justify-between py-2 px-2 bg-white rounded border">
                  <div className="flex items-center gap-2">
                    <span className="text-red-600 font-bold text-xs">Δ</span>
                    <span className="text-sm font-semibold text-gray-700">Αποθεματικό Ταμείο</span>
                  </div>
                  <span className="text-sm font-bold text-blue-600">{formatAmount(reserveFund)}€</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 🔵 ΚΟΙΝΕΣ ΔΑΠΑΝΕΣ */}
      {groupedExpenses.shared && groupedExpenses.shared.total > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <button
            onClick={() => togglePayer('shared')}
            className="w-full bg-gradient-to-r from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-150 p-3 flex items-center justify-between transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{groupedExpenses.shared.icon}</span>
              <span className="font-bold text-blue-800">{groupedExpenses.shared.label}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-blue-700">{formatAmount(sharedTotal)}€</span>
              {expandedPayers.shared ? (
                <ChevronUp className="h-5 w-5 text-blue-600" />
              ) : (
                <ChevronDown className="h-5 w-5 text-blue-600" />
              )}
            </div>
          </button>

          {expandedPayers.shared && (
            <div className="bg-white p-2 space-y-2">
              {Object.entries(groupedExpenses.shared.groups).map(([groupKey, group]) => (
                <div key={groupKey} className="border rounded">
                  <button
                    onClick={() => toggleGroup(`shared_${groupKey}`)}
                    className="w-full bg-muted hover:bg-accent p-2 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span>{group.icon}</span>
                      <span className="text-sm font-semibold text-foreground">{group.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-primary">{formatAmount(group.total)}€</span>
                      {expandedGroups[`shared_${groupKey}`] ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {expandedGroups[`shared_${groupKey}`] && (
                    <div className="p-2 space-y-1">
                      {group.expenses.map((expense, idx) => (
                        <div key={idx} className="flex items-center justify-between py-1 px-2 bg-white rounded text-xs">
                          <span className="text-muted-foreground">{expense.category_display}</span>
                          <span className="font-semibold text-foreground">{formatAmount(expense.amount)}€</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Παλαιότερες οφειλές */}
      {previousBalance > 0 && (
        <div className="flex items-center justify-between py-2 px-3 bg-yellow-50 rounded border border-yellow-200">
          <span className="text-sm font-semibold text-yellow-800">Παλαιότερες Οφειλές</span>
          <span className="text-sm font-bold text-yellow-700">{formatAmount(previousBalance)}€</span>
        </div>
      )}

      {/* ΓΕΝΙΚΟ ΣΥΝΟΛΟ */}
      <div className="flex items-center justify-between py-3 px-3 bg-blue-50 rounded border-2 border-blue-200">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-blue-800">Σ</span>
          <span className="text-base font-bold text-blue-900">ΓΕΝΙΚΟ ΣΥΝΟΛΟ</span>
        </div>
        <span className="text-lg font-bold text-blue-700">{formatAmount(grandTotal)}€</span>
      </div>
    </div>
  );
};

