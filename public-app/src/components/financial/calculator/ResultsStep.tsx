import React, { useMemo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  Send,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Calculator,
  Building,
  Euro,
  Eye,
  TrendingDown,
  Users,
  AlertTriangle,
  RefreshCw,
  X,
  Info
} from 'lucide-react';
import {
  CalculatorState,
  ExpenseBreakdown,
  ManagementFeeInfo,
  PerApartmentAmounts,
  ReserveFundInfo,
  Share
} from './types/financial';
import { useCommonExpenses } from '@/hooks/useCommonExpenses';
import { toast } from 'sonner';
import { CommonExpenseModal } from './CommonExpenseModal';
import { useApartmentsWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';
import { useMonthRefresh } from '@/hooks/useMonthRefresh';
import { api } from '@/lib/api';
import { useAuth } from '@/components/contexts/AuthContext';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { usePayments } from '@/hooks/usePayments';
import { useMonthlyExpenses } from '@/hooks/useMonthlyExpenses';
import { exportToJPG } from './utils/jpgGenerator';
import { formatAmount, toNumber } from './utils/formatters';
import { notificationsApi } from '@/lib/api/notifications';

interface ResultsStepProps {
  state: CalculatorState;
  updateState: (updates: Partial<CalculatorState>) => void;
  buildingId: number;
  onComplete?: (results: any) => void;
}

export const ResultsStep: React.FC<ResultsStepProps> = ({
  state,
  updateState,
  buildingId,
  onComplete
}) => {
  const [expandedBreakdown, setExpandedBreakdown] = useState<string | null>(null);
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);
  const [showCommonExpenseModal, setShowCommonExpenseModal] = useState(false);
  const [isDetailedResultsOpen, setIsDetailedResultsOpen] = useState(false);
  const [isActionsPopoverOpen, setIsActionsPopoverOpen] = useState(false);
  const { issueCommonExpenses, calculateAdvancedShares, calculateShares } = useCommonExpenses();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [calculationProgress, setCalculationProgress] = useState(0);
  const [calculationSuccess, setCalculationSuccess] = useState(false);
  const [showSendPrompt, setShowSendPrompt] = useState(false);
  const [sendScope, setSendScope] = useState<'current' | 'all' | 'selected'>('current');
  const [selectedBuildingIds, setSelectedBuildingIds] = useState<number[]>([]);
  const [isSendingNotifications, setIsSendingNotifications] = useState(false);
  const [issuedPeriodId, setIssuedPeriodId] = useState<number | null>(null);
  const [issuedMonth, setIssuedMonth] = useState<string | null>(null);

  // Get user office details
  const { user } = useAuth();
  const { buildings } = useBuilding();

  // Dashboard summary (up to today)
  interface DashboardSummary {
    current_reserve: number;
    current_obligations: number;
    last_calculation_date?: string;
    apartments_count?: number;
  }
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);

  // Extract month from state's customPeriod
  const selectedMonth = state.customPeriod?.startDate ? state.customPeriod.startDate.substring(0, 7) : undefined;
  const notificationMonth = issuedMonth || selectedMonth || state.customPeriod?.startDate?.substring(0, 7);
  // Load occupants (owner/tenant) info to show consistent names
  const { apartments: aptWithFinancial, building: buildingData, forceRefresh } = useApartmentsWithFinancialData(buildingId, selectedMonth);
  const { expenses: monthlyExpenses } = useMonthlyExpenses(buildingId, selectedMonth);

  const previousMonthInfo = useMemo(() => {
    const now = new Date();
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const year = prevDate.getFullYear();
    const monthIndex = prevDate.getMonth();
    const monthNumber = monthIndex + 1;
    const monthNames = [
      'Ιανουάριος', 'Φεβρουάριος', 'Μάρτιος', 'Απρίλιος', 'Μάιος', 'Ιούνιος',
      'Ιούλιος', 'Αύγουστος', 'Σεπτέμβριος', 'Οκτώβριος', 'Νοέμβριος', 'Δεκέμβριος'
    ];
    const startDate = new Date(Date.UTC(year, monthIndex, 1));
    const endDate = new Date(Date.UTC(year, monthIndex + 1, 0));
    return {
      monthStr: `${year}-${String(monthNumber).padStart(2, '0')}`,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      periodName: `${monthNames[monthIndex]} ${year}`,
    };
  }, []);

  const availableBuildings = useMemo(() => {
    if (buildings && buildings.length > 0) {
      return buildings;
    }
    if (buildingData) {
      return [{
        id: buildingId,
        name: buildingData.name || buildingData.address || `Κτίριο ${buildingId}`,
        address: buildingData.address || '',
      }];
    }
    return [];
  }, [buildings, buildingData, buildingId]);

  // Auto-refresh when selectedMonth changes
  useMonthRefresh(selectedMonth, forceRefresh, 'ResultsStep');
  useEffect(() => {
    setIssuedPeriodId(null);
    setIssuedMonth(null);
  }, [buildingId, selectedMonth]);
  const occupantsByApartmentId = useMemo(() => {
    const map: Record<number, { owner_name?: string; tenant_name?: string }> = {};
    aptWithFinancial.forEach((apt) => {
      map[apt.id] = { owner_name: apt.owner_name, tenant_name: apt.tenant_name };
    });
    return map;
  }, [aptWithFinancial]);

  // Payments for the selected month (YYYY-MM)
  const selectedMonthStr = useMemo(() => {
    const start = state.customPeriod?.startDate;
    return start ? start.substring(0, 7) : undefined;
  }, [state.customPeriod?.startDate]);
  const { payments } = usePayments(buildingId, selectedMonthStr);
  const paymentsCommonTotal = useMemo(() => {
    return (payments || []).reduce((sum: number, p: any) => sum + (p.payment_type === 'common_expense' ? (p.amount || 0) : 0), 0);
  }, [payments]);
  const { payments: allReservePayments } = usePayments(buildingId);
  const paymentsReserveTotal = useMemo(() => {
    return (allReservePayments || []).reduce((sum: number, p: any) => sum + (p.payment_type === 'reserve_fund' ? (p.amount || 0) : 0), 0);
  }, [allReservePayments]);
  const reserveMonthlyTarget = useMemo(() => Number(state.advancedShares?.reserve_contribution || 0), [state.advancedShares]);
  const reserveRemaining = useMemo(() => Math.max(0, reserveMonthlyTarget - paymentsReserveTotal), [reserveMonthlyTarget, paymentsReserveTotal]);

  const renderOccupants = (apartmentId: number, fallbackOwner?: string) => {
    const info = occupantsByApartmentId[apartmentId] || {};
    const owner = info.owner_name || fallbackOwner;
    const tenant = info.tenant_name;
    return (
      <div className="flex flex-col gap-0.5">
        {owner && (
          <div className="text-xs">
            <span className="inline-block px-1 mr-1 rounded bg-green-50 text-green-700 border border-green-200">Ιδιοκτήτης</span>
            <span className="text-gray-800">{owner}</span>
          </div>
        )}
        {tenant && (
          <div className="text-xs">
            <span className="inline-block px-1 mr-1 rounded bg-blue-50 text-blue-700 border border-blue-200">Ενοικιαστής</span>
            <span className="text-gray-800">{tenant}</span>
          </div>
        )}
        {!owner && !tenant && (
          <span className="text-xs text-gray-400 italic">Μη καταχωρημένοι</span>
        )}
      </div>
    );
  };

  // Fetch up-to-today summary once per building
  useEffect(() => {
    let mounted = true;
    const fetchSummary = async () => {
      try {
        setIsSummaryLoading(true);
        const params = new URLSearchParams();
        params.append('building_id', String(buildingId));
        const { data } = await api.get(`/financial/dashboard/summary/?${params.toString()}`);
        if (!mounted) return;
        setDashboardSummary({
          current_reserve: Number(data.current_reserve || 0),
          current_obligations: Number(data.current_obligations || 0),
          last_calculation_date: data.last_calculation_date,
          apartments_count: data.apartments_count
        });
      } catch (err) {
        // Silent fail; UI will fallback to 0
      } finally {
        if (mounted) setIsSummaryLoading(false);
      }
    };
    fetchSummary();
    return () => { mounted = false; };
  }, [buildingId]);

  const getDistributionTypeLabel = (type: string) => {
    switch (type) {
      case 'by_participation_mills':
        return 'Ανά Χιλιοστά';
      case 'equal_share':
        return 'Ισόποσα';
      case 'specific_apartments':
        return 'Συγκεκριμένα';
      case 'by_meters':
        return 'Μετρητές';
      default:
        return type;
    }
  };

  const perApartmentAmounts = useMemo<PerApartmentAmounts>(() => {
    const items: PerApartmentAmounts = {};
    Object.values(state.shares as Record<string, Share>).forEach((share) => {
      const apartmentId = (share as any).apartment_id;
      if (!apartmentId) return;
      const bd = (share as any).breakdown || {};
      if (Array.isArray(bd)) {
        const commonTotal = bd.reduce((sum, item) => sum + toNumber((item as any).apartment_share ?? 0), 0);
        const reserveTotal = toNumber((share as any).reserve_fund_amount ?? (share as any).reserve_fund_contribution ?? 0);
        items[apartmentId] = {
          common: commonTotal,
          elevator: 0,
          heating: 0,
          other: 0,
          coowner: 0,
          reserve: reserveTotal,
          total_due: toNumber((share as any).total_due ?? 0)
        };
        return;
      }
      items[apartmentId] = {
        common: toNumber(bd.general_expenses ?? bd.common ?? bd.general ?? 0),
        elevator: toNumber(bd.elevator_expenses ?? bd.elevator ?? 0),
        heating: toNumber(bd.heating_expenses ?? bd.heating ?? 0),
        other: toNumber(bd.equal_share_expenses ?? bd.equal_share ?? bd.other ?? 0),
        coowner: toNumber(bd.individual_expenses ?? bd.individual ?? bd.coowner ?? 0),
        reserve: toNumber(bd.reserve_fund_contribution ?? bd.reserve_fund ?? bd.reserve ?? 0),
        total_due: toNumber((share as any).total_due ?? 0)
      };
    });
    return items;
  }, [state.shares]);

  const expenseBreakdown = useMemo<ExpenseBreakdown>(() => {
    const breakdown: ExpenseBreakdown = { common: 0, elevator: 0, heating: 0, other: 0, coownership: 0 };
    if (monthlyExpenses) {
      breakdown.common = monthlyExpenses.total_expenses_month || 0;
    } else if (state.advancedShares?.expense_totals) {
      const { general, elevator, heating, equal_share, individual } = state.advancedShares.expense_totals;
      breakdown.common = Number(general || 0);
      breakdown.elevator = Number(elevator || 0);
      breakdown.heating = Number(heating || 0);
      breakdown.other = Number(equal_share || 0);
      breakdown.coownership = Number(individual || 0);
    } else if (state.totalExpenses) {
      breakdown.common = Number(state.totalExpenses || 0);
    }
    return breakdown;
  }, [monthlyExpenses, state.advancedShares, state.totalExpenses]);

  const managementFeeInfo = useMemo<ManagementFeeInfo>(() => {
    const apartmentsCount = Object.keys(state.shares).length;
    let finalFee = 0;
    if (monthlyExpenses && monthlyExpenses.total_management_cost > 0) {
      finalFee = monthlyExpenses.management_fee_per_apartment || (apartmentsCount > 0 ? monthlyExpenses.total_management_cost / apartmentsCount : 0);
    } else {
      const feeFromState = state.advancedShares?.management_fee_per_apartment || 0;
      finalFee = feeFromState > 0 ? feeFromState : (buildingData?.management_fee_per_apartment || 0);
    }
    return {
      feePerApartment: finalFee,
      totalFee: finalFee * apartmentsCount,
      apartmentsCount,
      hasFee: finalFee > 0
    };
  }, [monthlyExpenses, state.advancedShares, state.shares, buildingData?.management_fee_per_apartment]);

  const reserveFundInfo = useMemo<ReserveFundInfo>(() => {
    const goal = Number(state.advancedShares?.reserve_fund_goal || 0);
    const duration = Number(state.advancedShares?.reserve_fund_duration || 0);
    const startDate = state.advancedShares?.reserve_fund_start_date;
    const targetDate = state.advancedShares?.reserve_fund_target_date;
    let showReserveFund = true;

    if (selectedMonth && startDate) {
      const selected = new Date(`${selectedMonth}-01`);
      if (selected < new Date(startDate)) showReserveFund = false;
      if (targetDate && selected > new Date(targetDate)) showReserveFund = false;
    }

    let monthlyAmount = 0;
    if (showReserveFund && goal > 0 && duration > 0) {
      monthlyAmount = goal / duration;
    }

    const actualReserveCollected = Number(state.advancedShares?.actual_reserve_collected || 0);
    const progressPercentage = goal > 0 ? Math.min(100, (actualReserveCollected / goal) * 100) : 0;

    return {
      monthlyAmount,
      totalContribution: monthlyAmount,
      displayText: goal > 0 && duration > 0 ? `Στόχος ${formatAmount(goal)}€ σε ${duration} δόσεις` : '',
      goal,
      duration,
      monthsRemaining: duration,
      actualReserveCollected,
      progressPercentage
    };
  }, [state.advancedShares, selectedMonth]);

  const totalPreviousBalance = useMemo(() => {
    return aptWithFinancial.reduce((sum, apt) => sum + Math.abs(apt.previous_balance ?? 0), 0);
  }, [aptWithFinancial]);

  const totalExpensesForSheet = useMemo(() => {
    const basic = Object.values(expenseBreakdown).reduce((sum, value) => sum + value, 0);
    const hasAnyExpenses = basic > 0;
    return basic + managementFeeInfo.totalFee + (hasAnyExpenses ? reserveFundInfo.monthlyAmount : 0);
  }, [expenseBreakdown, managementFeeInfo, reserveFundInfo]);

  const getTotalPreviousBalance = useCallback(() => totalPreviousBalance, [totalPreviousBalance]);
  const getFinalTotalExpenses = useCallback(() => totalExpensesForSheet + totalPreviousBalance, [totalExpensesForSheet, totalPreviousBalance]);

  const getTargetBuildingIds = useCallback(() => {
    if (sendScope === 'current') {
      return [buildingId];
    }
    if (sendScope === 'all') {
      const ids = availableBuildings.map((b: any) => b.id).filter((id: number) => id !== undefined);
      return ids.length > 0 ? ids : [buildingId];
    }
    return selectedBuildingIds;
  }, [sendScope, buildingId, availableBuildings, selectedBuildingIds]);

  const handleSendNotifications = async () => {
    if (!notificationMonth) {
      toast.error('Λείπει ο μήνας κοινοχρήστων για αποστολή.');
      return;
    }

    const targetIds = getTargetBuildingIds();
    if (sendScope === 'selected' && targetIds.length === 0) {
      toast.error('Επιλέξτε τουλάχιστον μία πολυκατοικία.');
      return;
    }

    setIsSendingNotifications(true);
    try {
      if (targetIds.length === 1) {
        const periodIdForSend = targetIds[0] === buildingId ? issuedPeriodId : null;
        await notificationsApi.sendPersonalizedCommonExpenses({
          building_id: targetIds[0],
          month: notificationMonth,
          period_id: periodIdForSend ?? undefined,
          include_sheet: true,
          include_notification: true,
          mark_period_sent: true,
          sent_source: 'manual',
        });
        toast.success('Οι ειδοποιήσεις κοινοχρήστων στάλθηκαν.');
      } else {
        const response = await notificationsApi.sendPersonalizedCommonExpensesBulk({
          building_ids: targetIds,
          month: notificationMonth,
          include_sheet: true,
          include_notification: true,
          mark_period_sent: true,
          skip_if_already_sent: true,
          sent_source: 'manual',
          stagger_seconds: 60,
        });
        toast.success(`Μπήκαν ${response.queued_count} αποστολές σε σειρά.`);
      }

      setShowSendPrompt(false);
    } catch (error: any) {
      toast.error(error?.message || 'Αποτυχία αποστολής ειδοποιήσεων.');
    } finally {
      setIsSendingNotifications(false);
    }
  };

  const handleIssue = async () => {
    try {
      updateState({ isIssuing: true });

      const issuePeriod = previousMonthInfo;

      toast.info(`Η οριστική έκδοση θα γίνει για ${issuePeriod.periodName}.`);

      const issueMonthStr = issuePeriod.monthStr;
      const issueStartDate = issuePeriod.startDate;
      const issueEndDate = issuePeriod.endDate;
      let issueMonthlyExpenses: any = null;
      try {
        issueMonthlyExpenses = await api.get(`/financial/dashboard/summary/?building_id=${buildingId}&month=${issueMonthStr}`);
      } catch (error) {
        issueMonthlyExpenses = null;
      }

      const isAdvanced = state.advancedOptions.includeReserveFund ||
        state.advancedOptions.heatingFixedPercentage !== 30 ||
        state.advancedOptions.elevatorMills;

      let issueAdvancedShares: any = null;
      let issueShares: Record<string, Share> = {};

      if (isAdvanced) {
        const shouldIncludeReserveFund = state.advancedOptions.includeReserveFund &&
          checkIfPeriodInReserveFundTimeline(issueStartDate, issueEndDate);
        const result = await calculateAdvancedShares({
          building_id: buildingId,
          period_start_date: issueStartDate,
          period_end_date: issueEndDate,
          month_filter: issueMonthStr,
          reserve_fund_monthly_total: shouldIncludeReserveFund && state.advancedOptions.reserveFundMonthlyAmount > 0
            ? state.advancedOptions.reserveFundMonthlyAmount
            : undefined,
        });
        issueAdvancedShares = result;
        issueShares = result?.shares || {};
      } else {
        const result = await calculateShares({
          building_id: buildingId,
          month_filter: issueMonthStr,
        });
        issueShares = result?.shares || {};
      }

      if (!issueShares || Object.keys(issueShares).length === 0) {
        toast.error('Δεν υπάρχουν υπολογισμένα μερίδια για τον προηγούμενο μήνα.');
        return;
      }

      const issueTotalExpenses = Object.values(issueShares).reduce(
        (sum: number, share: any) => sum + (share.total_amount || 0),
        0
      );

      const issuePerApartmentAmounts: PerApartmentAmounts = {};
      Object.values(issueShares as Record<string, Share>).forEach((share) => {
        const apartmentId = (share as any).apartment_id;
        if (!apartmentId) return;
        const bd = (share as any).breakdown || {};
        if (Array.isArray(bd)) {
          const commonTotal = bd.reduce((sum, item) => sum + toNumber((item as any).apartment_share ?? 0), 0);
          const reserveTotal = toNumber((share as any).reserve_fund_amount ?? (share as any).reserve_fund_contribution ?? 0);
          issuePerApartmentAmounts[apartmentId] = {
            common: commonTotal,
            elevator: 0,
            heating: 0,
            other: 0,
            coowner: 0,
            reserve: reserveTotal,
            total_due: toNumber((share as any).total_due ?? 0)
          };
          return;
        }
        issuePerApartmentAmounts[apartmentId] = {
          common: toNumber(bd.general_expenses ?? bd.common ?? bd.general ?? 0),
          elevator: toNumber(bd.elevator_expenses ?? bd.elevator ?? 0),
          heating: toNumber(bd.heating_expenses ?? bd.heating ?? 0),
          other: toNumber(bd.equal_share_expenses ?? bd.equal_share ?? bd.other ?? 0),
          coowner: toNumber(bd.individual_expenses ?? bd.individual ?? bd.coowner ?? 0),
          reserve: toNumber(bd.reserve_fund_contribution ?? bd.reserve_fund ?? bd.reserve ?? 0),
          total_due: toNumber((share as any).total_due ?? 0)
        };
      });

      const issueExpenseBreakdown: ExpenseBreakdown = { common: 0, elevator: 0, heating: 0, other: 0, coownership: 0 };
      if (issueMonthlyExpenses) {
        issueExpenseBreakdown.common = issueMonthlyExpenses.total_expenses_month || 0;
      } else if (issueAdvancedShares?.expense_totals) {
        const { general, elevator, heating, equal_share, individual } = issueAdvancedShares.expense_totals;
        issueExpenseBreakdown.common = Number(general || 0);
        issueExpenseBreakdown.elevator = Number(elevator || 0);
        issueExpenseBreakdown.heating = Number(heating || 0);
        issueExpenseBreakdown.other = Number(equal_share || 0);
        issueExpenseBreakdown.coownership = Number(individual || 0);
      } else {
        issueExpenseBreakdown.common = issueTotalExpenses;
      }

      const apartmentsCount = Object.keys(issueShares).length;
      let feePerApartment = 0;
      if (issueMonthlyExpenses?.total_management_cost > 0) {
        feePerApartment = issueMonthlyExpenses.management_fee_per_apartment ||
          (apartmentsCount > 0 ? issueMonthlyExpenses.total_management_cost / apartmentsCount : 0);
      } else {
        const feeFromResult = issueAdvancedShares?.management_fee_per_apartment || 0;
        feePerApartment = feeFromResult > 0 ? feeFromResult : (buildingData?.management_fee_per_apartment || 0);
      }
      const issueManagementFeeInfo: ManagementFeeInfo = {
        feePerApartment,
        totalFee: feePerApartment * apartmentsCount,
        apartmentsCount,
        hasFee: feePerApartment > 0
      };

      let showReserveFund = true;
      const issueMonthDate = new Date(`${issueMonthStr}-01`);
      const reserveFundStartDate = issueAdvancedShares?.reserve_fund_start_date;
      const reserveFundTargetDate = issueAdvancedShares?.reserve_fund_target_date;
      if (reserveFundStartDate) {
        if (issueMonthDate < new Date(reserveFundStartDate)) showReserveFund = false;
      }
      if (reserveFundTargetDate) {
        if (issueMonthDate > new Date(reserveFundTargetDate)) showReserveFund = false;
      }

      const reserveGoal = Number(issueAdvancedShares?.reserve_fund_goal || 0);
      const reserveDuration = Number(issueAdvancedShares?.reserve_fund_duration_months || 0);
      const reserveMonthlyTarget = Number(issueAdvancedShares?.reserve_fund_monthly_target || 0);
      let reserveMonthlyAmount = 0;
      if (showReserveFund) {
        if (reserveMonthlyTarget > 0) {
          reserveMonthlyAmount = reserveMonthlyTarget;
        } else if (reserveGoal > 0 && reserveDuration > 0) {
          reserveMonthlyAmount = reserveGoal / reserveDuration;
        }
      }

      const actualReserveCollected = Number(issueAdvancedShares?.actual_reserve_collected || 0);
      const reserveProgressPercentage = reserveGoal > 0
        ? Math.min(100, (actualReserveCollected / reserveGoal) * 100)
        : 0;

      const issueReserveFundInfo: ReserveFundInfo = {
        monthlyAmount: reserveMonthlyAmount,
        totalContribution: reserveMonthlyAmount,
        displayText: reserveGoal > 0 && reserveDuration > 0
          ? `Στόχος ${formatAmount(reserveGoal)}€ σε ${reserveDuration} δόσεις`
          : '',
        goal: reserveGoal,
        duration: reserveDuration,
        monthsRemaining: reserveDuration,
        actualReserveCollected,
        progressPercentage: reserveProgressPercentage
      };

      const issueTotalPreviousBalance = Object.values(issueShares).reduce(
        (sum: number, share: any) => sum + Math.abs(Number(share.previous_balance || 0)),
        0
      );

      const issueTotalExpensesForSheet = (() => {
        const basic = Object.values(issueExpenseBreakdown).reduce((sum, value) => sum + value, 0);
        const hasAnyExpenses = basic > 0;
        return basic + issueManagementFeeInfo.totalFee + (hasAnyExpenses ? issueReserveFundInfo.monthlyAmount : 0);
      })();

      const getIssueTotalPreviousBalance = () => issueTotalPreviousBalance;
      const getIssueFinalTotalExpenses = () => issueTotalExpensesForSheet + issueTotalPreviousBalance;

      const issueState = {
        ...state,
        customPeriod: {
          startDate: issueStartDate,
          endDate: issueEndDate,
          periodName: issuePeriod.periodName,
        },
        shares: issueShares,
        totalExpenses: issueTotalExpenses,
        advancedShares: issueAdvancedShares ?? null,
      };

      // Transform shares to match backend expectations
      const transformedShares: Record<string, { total_amount: number; breakdown: Record<string, any> }> = {};
      const expenseIds: number[] = [];

      Object.entries(issueShares).forEach(([apartmentId, share]) => {
        // Type assertion to ensure share has the expected structure
        const typedShare = share as {
          total_amount: number;
          breakdown?: Array<{
            expense_id: number;
            expense_title: string;
            expense_amount: number;
            apartment_share: number;
            distribution_type: string;
            distribution_type_display: string;
          }>;
        };

        let breakdownPayload: Record<string, any> = {};
        if (Array.isArray(typedShare.breakdown)) {
          breakdownPayload = typedShare.breakdown.reduce(
            (
              acc: Record<
                number,
                {
                  expense_title: string;
                  expense_amount: number;
                  apartment_share: number;
                  distribution_type: string;
                  distribution_type_display: string;
                }
              >,
              item: {
                expense_id: number;
                expense_title: string;
                expense_amount: number;
                apartment_share: number;
                distribution_type: string;
                distribution_type_display: string;
              }
            ) => {
              acc[item.expense_id] = {
                expense_title: item.expense_title,
                expense_amount: item.expense_amount,
                apartment_share: item.apartment_share,
                distribution_type: item.distribution_type,
                distribution_type_display: item.distribution_type_display
              };
              // Collect expense IDs
              if (!expenseIds.includes(item.expense_id)) {
                expenseIds.push(item.expense_id);
              }
              return acc;
            }, {} as Record<string, any>);
        } else if (typedShare.breakdown && typeof typedShare.breakdown === 'object') {
          breakdownPayload = typedShare.breakdown as Record<string, any>;
        }

        transformedShares[apartmentId] = {
          total_amount: typedShare.total_amount,
          breakdown: breakdownPayload
        };
      });

      const params = {
        building_id: buildingId,
        period_data: {
          name: issuePeriod.periodName,
          start_date: issueStartDate,
          end_date: issueEndDate
        },
        shares: transformedShares,
        expense_ids: expenseIds
      };

      let sheetFile: File | null = null;
      try {
        const exportParams = {
          state: issueState,
          buildingName: buildingData?.name || 'Άγνωστο Κτίριο',
          buildingAddress: buildingData?.address || '',
          buildingCity: buildingData?.city || '',
          buildingPostalCode: buildingData?.postal_code || '',
          managerName: buildingData?.internal_manager_name || 'Διαχειριστής Κτιρίου',
          managerApartment: buildingData?.internal_manager_apartment || '',
          managerPhone: buildingData?.internal_manager_phone || '',
          managerCollectionSchedule: buildingData?.internal_manager_collection_schedule || '',
          managementOfficeName: user?.office_name || '',
          managementOfficePhone: user?.office_phone || '',
          managementOfficeAddress: user?.office_address || '',
          managementOfficeLogo: user?.office_logo || '',
          selectedMonth: issueMonthStr,
          expenseBreakdown: issueExpenseBreakdown,
          reserveFundInfo: issueReserveFundInfo,
          managementFeeInfo: issueManagementFeeInfo,
          groupedExpenses: {},
          perApartmentAmounts: issuePerApartmentAmounts,
          aptWithFinancial,
          totalExpenses: issueTotalExpensesForSheet,
          getFinalTotalExpenses: getIssueFinalTotalExpenses,
          getTotalPreviousBalance: getIssueTotalPreviousBalance,
          monthlyExpenses: issueMonthlyExpenses,
          buildingId
        };
        const jpgResult = await exportToJPG(exportParams, {
          skipDownload: true,
          skipKiosk: true,
          returnBlob: true,
          silent: true
        });
        if (jpgResult?.blob && jpgResult?.fileName) {
          sheetFile = new File([jpgResult.blob], jpgResult.fileName, { type: 'image/jpeg' });
        }
      } catch (error) {
        console.error('Failed to generate common expense sheet file:', error);
        toast.error('Αποτυχία δημιουργίας φύλλου κοινοχρήστων. Η έκδοση ακυρώθηκε.');
        return;
      }

      if (!sheetFile) {
        toast.error('Δεν δημιουργήθηκε συνημμένο φύλλο κοινοχρήστων. Η έκδοση ακυρώθηκε.');
        return;
      }

      const payload = {
        ...params,
        sheet_attachment: sheetFile
      };

      const issueResponse = await issueCommonExpenses(payload);
      if (issueResponse?.period_id) {
        setIssuedPeriodId(Number(issueResponse.period_id));
      }

      setIssuedMonth(issueMonthStr);
      toast.success(`Τα κοινοχρήστα για ${issuePeriod.periodName} εκδόθηκαν επιτυχώς!`);

      if (onComplete) {
        onComplete(params);
      }

      setSendScope('current');
      setSelectedBuildingIds([buildingId]);
      setShowSendPrompt(true);

    } catch (error: any) {
      toast.error('Σφάλμα κατά την έκδοση: ' + (error.message || 'Άγνωστο σφάλμα'));
    } finally {
      updateState({ isIssuing: false });
    }
  };



  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      if (format === 'pdf') {
        exportToPDF();
      } else if (format === 'excel') {
        exportToExcel();
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Σφάλμα κατά την εξαγωγή');
    }
  };

  const exportToPDF = async () => {
    // Ensure we're running on the client side
    if (typeof window === 'undefined') {
      toast.error('Η εξαγωγή PDF δεν είναι διαθέσιμη στον server');
      return;
    }

    try {
      // Use the same PDF generation logic as CommonExpenseModal
      const { jsPDF } = await import('jspdf');
      const html2canvas = (await import('html2canvas')).default;

      // Force recalculation of all derived values to ensure fresh data
      const currentState = state; // Get current state

      // Debug logging to check if values are updating
      console.log('PDF Export Debug (ResultsStep):', {
        stateShares: Object.keys(currentState.shares).length,
        totalExpenses: currentState.totalExpenses,
        period: getPeriodInfo(),
        timestamp: new Date().toISOString()
      });

      // Prepare data for rendering with fresh calculations
      const currentDate = new Date().toLocaleDateString('el-GR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      const period = getPeriodInfo();
      const apartmentCount = Object.keys(currentState.shares).length;

      // Enhanced HTML content with better styling and structure (same as modal)
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="el">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Φύλλο Κοινοχρήστων - ${period}</title>
          <style>
            @page {
              size: A4 landscape;
              margin: 0.5in;
            }

            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }

            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              font-size: 11pt;
              line-height: 1.4;
              color: #0B1225;
              background: white;
            }

            /* Header Section */
            .header {
              text-align: center;
              margin-bottom: 25px;
              padding-bottom: 20px;
              border-bottom: 3px solid #00BC7D;
              background: linear-gradient(135deg, #f5f6f9 0%, #d6dce8 100%);
              padding: 20px;
              border-radius: 8px;
            }

            .brand {
              font-size: 22pt;
              font-weight: 700;
              color: #00BC7D;
              margin-bottom: 8px;
              text-transform: uppercase;
              letter-spacing: 1px;
            }

            .subtitle {
              font-size: 12pt;
              color: #3e4a68;
              font-style: italic;
              margin-bottom: 15px;
            }

            .main-title {
              font-size: 24pt;
              font-weight: 700;
              color: #1D293D;
              margin: 15px 0;
              text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
            }

            .period {
              font-size: 16pt;
              font-weight: 600;
              color: #0B1225;
              background: #e6fff5;
              padding: 8px 16px;
              border-radius: 20px;
              display: inline-block;
            }

            .timestamp {
              margin-top: 12px;
              font-size: 11pt;
              color: #3e4a68;
              font-style: italic;
              background: #f5f6f9;
              padding: 6px 12px;
              border-radius: 15px;
              display: inline-block;
              border: 1px solid #d6dce8;
            }

            /* Information Table */
            .info-section {
              margin: 25px 0;
            }

            .info-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              border-radius: 8px;
              overflow: hidden;
            }

            .info-table th, .info-table td {
              border: 1px solid #d6dce8;
              padding: 12px 16px;
              text-align: left;
            }

            .info-table th {
              background: linear-gradient(135deg, #00BC7D 0%, #009A6B 100%);
              color: white;
              font-weight: 600;
              width: 30%;
              font-size: 10pt;
            }

            .info-table td {
              background: #ffffff;
              font-weight: 500;
            }

            /* Section Titles */
            .section-title {
              font-size: 16pt;
              font-weight: 700;
              color: #1D293D;
              margin: 30px 0 20px 0;
              padding: 12px 0 8px 0;
              border-bottom: 2px solid #00BC7D;
              background: linear-gradient(90deg, #f5f6f9 0%, transparent 100%);
              padding-left: 15px;
            }

            /* Analysis Table */
            .analysis-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px auto;
              font-size: 7pt;
              background: white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.1);
              table-layout: fixed; /* Fixed layout for better column control */
            }

            .analysis-table th, .analysis-table td {
              border: 1px solid #d6dce8;
              padding: 6px 4px;
              text-align: center;
              vertical-align: middle;
              word-wrap: break-word;
            }

            /* Column width specifications */
            .analysis-table th:nth-child(1), .analysis-table td:nth-child(1) { width: 5%; } /* ΑΡΙΘΜΟΣ ΔΙΑΜΕΡΙΣΜΑΤΟΣ */
            .analysis-table th:nth-child(2), .analysis-table td:nth-child(2) { width: 25%; text-align: left; } /* ΟΝΟΜΑΤΕΠΩΝΥΜΟ */
            .analysis-table th:nth-child(3), .analysis-table td:nth-child(3) { width: 15%; } /* ΧΙΛΙΟΣΤΑ */
            .analysis-table th:nth-child(4), .analysis-table td:nth-child(4) { width: 12%; } /* ΔΙΑΧΕΙΡΙΣΗ */
            .analysis-table th:nth-child(5), .analysis-table td:nth-child(5) { width: 12%; } /* ΑΠΟΘΕΜΑΤΙΚΟ */
            .analysis-table th:nth-child(6), .analysis-table td:nth-child(6) { width: 12%; } /* ΠΛΗΡΩΤΕΟ ΠΟΣΟ */
            .analysis-table th:nth-child(7), .analysis-table td:nth-child(7) { width: 19%; } /* ΠΑΛΑΙΟΤΕΡΕΣ ΟΦΕΙΛΕΣ */

            .analysis-table th {
              background: linear-gradient(135deg, #1e293b 0%, #475569 100%);
              color: white;
              font-weight: 600;
              font-size: 7pt;
            }

            .analysis-table tr:nth-child(even) {
              background: #f5f6f9;
            }

            .analysis-table tr:hover {
              background: #e6fff5;
            }

            .totals-row {
              background: linear-gradient(135deg, #f5f6f9 0%, #d6dce8 100%) !important;
              font-weight: 700;
              border-top: 2px solid #00BC7D;
            }

            .totals-row td {
              font-weight: 600;
              color: #1D293D;
            }

            /* Footer */
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #d6dce8;
              background: #f5f6f9;
              border-radius: 8px;
              padding: 20px;
            }

            .footer .info-table th {
              background: linear-gradient(135deg, #1D293D 0%, #3e4a68 100%);
            }

            /* Utility Classes */
            .text-left { text-align: left !important; }
            .text-right { text-align: right !important; }
            .font-bold { font-weight: 700; }
            .text-primary { color: #00BC7D; }

            /* Print Optimizations */
            @media print {
              body { font-size: 10pt; }
              .header { break-inside: avoid; }
              .section-title { break-after: avoid; }
              .analysis-table { font-size: 6pt; }
            }
          </style>
        </head>
        <body>
          <!-- Header Section -->
          <div class="header">
            <div class="brand">${user?.office_name || 'Γραφείο Διαχείρισης'}</div>
            <div class="subtitle">online έκδοση κοινοχρήστων</div>
            <div class="main-title">Φύλλο Κοινοχρήστων</div>
            <div class="period">${period}</div>
            <div class="timestamp">
              ⏰ Εκδόθηκε: ${new Date().toLocaleString('el-GR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
              })}
              </div>
          </div>

          <!-- Building Information -->
          <div class="info-section">
            <table class="info-table">
              <tr><th>🏢 ΠΟΛΥΚΑΤΟΙΚΙΑ</th><td>${buildingData?.name || 'Άγνωστο Κτίριο'}</td></tr>
              <tr><th>📅 ΜΗΝΑΣ</th><td>${period}</td></tr>
              <tr><th>👤 ΔΙΑΧΕΙΡΙΣΤΗΣ</th><td>Διαχειριστής Κτιρίου</td></tr>
              <tr><th>⏰ ΛΗΞΗ ΠΛΗΡΩΜΗΣ</th><td>${new Date().toLocaleDateString('el-GR', { day: '2-digit', month: '2-digit', year: 'numeric' })}</td></tr>
              </table>
          </div>

          <!-- Apartments Analysis -->
          <div class="section-title">🏠 ΑΝΑΛΥΣΗ ΚΑΤΑ ΔΙΑΜΕΡΙΣΜΑΤΑ <span style="font-size: 9pt; font-style: italic; color: #666;"> </span></div>

          <table class="analysis-table">
            <thead>
              <tr>
                <th style="text-align: center; vertical-align: middle;">Α/Δ</th>
                <th style="text-align: center; vertical-align: middle;">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</th>
                <th style="text-align: center; vertical-align: middle;">ΧΙΛΙΟΣΤΑ<br/>ΣΥΜΜΕΤΟΧΗΣ</th>
                <th style="text-align: center; vertical-align: middle;">ΔΙΑΧΕΙΡΙΣΗ<br/>(€)</th>
                <th style="text-align: center; vertical-align: middle;">ΑΠΟΘΕΜΑΤΙΚΟ<br/>(€)</th>
                <th style="text-align: center; vertical-align: middle;">ΠΛΗΡΩΤΕΟ<br/>ΠΟΣΟ (€)</th>
                <th style="text-align: center; vertical-align: middle;">ΠΑΛΑΙΟΤΕΡΕΣ<br/>ΟΦΕΙΛΕΣ (€)</th>
              </tr>
            </thead>
            <tbody>
              ${Object.values(currentState.shares).map((share: any, index: number) => {
                const managementFee = 1.0; // Default management fee per apartment
                // Calculate reserve fund from breakdown data
                const reserveFund = share.breakdown?.reserve_fund || 0;
                const previousBalance = share.previous_balance || 0;
                return `<tr>
                  <td class="font-bold text-primary">${share.identifier || share.apartment_number}</td>
                  <td class="text-left" style="padding-left: 8px;">${share.owner_name || 'Μη καταχωρημένος'}</td>
                  <td>${share.participation_mills || 0}</td>
                  <td class="font-bold">${formatAmount(managementFee)}€</td>
                  <td class="font-bold">${formatAmount(reserveFund)}€</td>
                  <td class="font-bold text-primary">${formatAmount(share.total_due || 0)}€</td>
                  <td class="font-bold" style="color: ${previousBalance < 0 ? '#dc2626' : '#059669'};">${formatAmount(Math.abs(previousBalance))}€</td>
                </tr>`;
              }).join('')}

              <tr class="totals-row">
                <td class="font-bold">ΣΥΝΟΛΑ</td>
                <td class="font-bold">-</td>
                <td class="font-bold">${Object.values(currentState.shares).reduce((sum: number, s: any) => sum + (s.participation_mills || 0), 0)}</td>
                <td class="font-bold">${formatAmount(Object.values(currentState.shares).length * 1.0)}€</td>
                <td class="font-bold">${formatAmount(Object.values(currentState.shares).reduce((sum: number, s: any) => sum + (s.breakdown?.reserve_fund || 0), 0))}€</td>
                <td class="font-bold text-primary">${formatAmount(currentState.totalExpenses)}€</td>
                <td class="font-bold">${formatAmount(Object.values(currentState.shares).reduce((sum: number, s: any) => sum + Math.abs(s.previous_balance || 0), 0))}€</td>
                </tr>
            </tbody>
          </table>

          <!-- Footer Information -->
          <div class="footer">
            <!-- Παρατηρήσεις στην αρχή του footer -->
            <div style="background-color: #fef3c7; padding: 12px; margin-bottom: 16px; border-left: 4px solid #f59e0b; border-radius: 4px;">
              <div style="font-weight: bold; color: #92400e; margin-bottom: 4px;">📝 ΠΑΡΑΤΗΡΗΣΕΙΣ:</div>
              <div style="color: #92400e; font-style: italic;">ΕΙΣΠΡΑΞΗ ΚΟΙΝΟΧΡΗΣΤΩΝ: ΔΕΥΤΕΡΑ & ΤΕΤΑΡΤΗ ΑΠΟΓΕΥΜΑ</div>
            </div>

            <table class="info-table">
              <tr><th>📅 ΗΜΕΡΟΜΗΝΙΑ ΕΚΔΟΣΗΣ</th><td>${currentDate}</td></tr>
              <tr><th>🏠 ΣΥΝΟΛΟ ΔΙΑΜΕΡΙΣΜΑΤΩΝ</th><td>${apartmentCount}</td></tr>
              <tr><th>💰 ΣΥΝΟΛΟ ΔΑΠΑΝΩΝ</th><td class="font-bold text-primary">${formatAmount(currentState.totalExpenses)}€</td></tr>
            </table>
          </div>
        </body>
        </html>
      `;

      // Create temporary element for rendering
      const element = document.createElement('div');
      element.innerHTML = htmlContent;
      element.style.position = 'absolute';
      element.style.left = '-9999px';
      element.style.top = '0';
      element.style.width = '277mm'; // A4 landscape width minus margins (297-20)
      element.style.backgroundColor = 'white';
      document.body.appendChild(element);

      // Configure html2canvas options for better Greek text rendering
      const canvasOptions = {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: 1123, // A4 landscape width in pixels at 96 DPI
        height: element.scrollHeight
      };

      // Convert HTML to canvas
      const canvas = await html2canvas(element, canvasOptions);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Create PDF in landscape format
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Calculate dimensions for landscape A4
      const imgWidth = 297; // A4 landscape width in mm
      const pageHeight = 210; // A4 landscape height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // Add image to PDF with proper margins (handle multiple pages if needed)
      const leftMargin = 10; // 10mm left margin
      const rightMargin = 10; // 10mm right margin
      const contentWidth = imgWidth - leftMargin - rightMargin; // Adjust content width
      pdf.addImage(imgData, 'JPEG', leftMargin, position, contentWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', leftMargin, position, contentWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      // Save PDF with timestamp
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const safePeriod = period.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_');
      const fileName = `common_expenses_sheet_${safePeriod}_${dateStr}_${timeStr}.pdf`;
      pdf.save(fileName);

      // Cleanup
      document.body.removeChild(element);

      toast.success('✅ Το PDF εξήχθη επιτυχώς!', {
        description: `Αρχείο: ${fileName}`
      });

    } catch (error) {
      console.error('PDF Export Error:', error);
      toast.error('❌ Σφάλμα κατά την εξαγωγή PDF', {
        description: 'Παρακαλώ δοκιμάστε ξανά ή επικοινωνήστε με την υποστήριξη.'
      });
    }
  };

  const exportToExcel = async () => {
    // Ensure we're running on the client side
    if (typeof window === 'undefined') {
      toast.error('Η εξαγωγή Excel δεν είναι διαθέσιμη στον server');
      return;
    }

    try {
      // Dynamic import of xlsx and file-saver to avoid SSR issues
      const XLSX = await import('xlsx');
      const fileSaver = await import('file-saver') as any;
      const { saveAs } = fileSaver;

      // Προετοιμασία δεδομένων
      const workbook = XLSX.utils.book_new();

    // Κύριο φύλλο με τα δεδομένα (Τμήμα Κατανομής)
    const mainData = Object.values(state.shares).map((share: any, index: number) => {
      return {
        'A/A': index + 1,
        'ΔΙΑΜΕΡΙΣΜΑ': share.apartment_number,
        'ΙΔΙΟΚΤΗΤΗΣ': share.owner_name || 'Μη καταχωρημένος',
        'ΧΙΛΙΟΣΤΑ': share.participation_mills,
        'ΠΡΟΗΓΟΥΜΕΝΟ ΥΠΟΛΟΙΠΟ (€)': share.previous_balance,
        'ΜΕΡΙΔΙΟ ΔΑΠΑΝΩΝ (€)': share.total_amount,
        'ΣΥΝΟΛΙΚΟ ΟΦΕΙΛΟΜΕΝΟ (€)': share.total_due,
        'ΚΑΤΑΣΤΑΣΗ': share.total_due < 0 ? 'Οφειλόμενο' : 'Ενεργό'
      };
    });

    const mainWorksheet = XLSX.utils.json_to_sheet(mainData);

    // Ανάλυση Δαπανών
    const expenseBreakdownData: any[] = [];
    if (state.advancedShares) {
      // Προσθήκη γενικών πληροφοριών ανάλυσης
      if (state.advancedShares.heating_costs) {
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Θέρμανση - Συνολικά',
          'ΠΟΣΟ (€)': state.advancedShares.heating_costs.total || 0,
          'ΠΕΡΙΓΡΑΦΗ': 'Συνολικό κόστος θέρμανσης'
        });
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Θέρμανση - Πάγιο',
          'ΠΟΣΟ (€)': state.advancedShares.heating_costs.fixed || 0,
          'ΠΕΡΙΓΡΑΦΗ': 'Πάγιο κόστος θέρμανσης'
        });
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Θέρμανση - Μεταβλητό',
          'ΠΟΣΟ (€)': state.advancedShares.heating_costs.variable || 0,
          'ΠΕΡΙΓΡΑΦΗ': 'Μεταβλητό κόστος θέρμανσης'
        });
      }

      if (state.advancedShares.elevator_costs) {
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Ανελκυστήρας',
          'ΠΟΣΟ (€)': state.advancedShares.elevator_costs,
          'ΠΕΡΙΓΡΑΦΗ': 'Κόστος ανελκυστήρα'
        });
      }

      if (state.advancedShares.reserve_contribution) {
        expenseBreakdownData.push({
          'ΚΑΤΗΓΟΡΙΑ': 'Αποθεματικό Ταμείο',
          'ΠΟΣΟ (€)': state.advancedShares.reserve_contribution,
          'ΠΕΡΙΓΡΑΦΗ': 'Συνεισφορά αποθεματικού ταμείου'
        });
      }

      // Προσθήκη λεπτομερών ανάλυσης αν υπάρχουν
      if (Array.isArray(state.advancedShares.expense_breakdown)) {
        state.advancedShares.expense_breakdown.forEach((category: any) => {
          expenseBreakdownData.push({
            'ΚΑΤΗΓΟΡΙΑ': category.category,
            'ΠΟΣΟ (€)': category.total_amount,
            'ΑΝΑ ΔΙΑΜΕΡΙΣΜΑ (€)': category.per_apartment,
            'ΜΕΘΟΔΟΣ ΚΑΤΑΝΟΜΗΣ': category.distribution_method
          });
        });
      }
    }

    const expenseBreakdownWorksheet = XLSX.utils.json_to_sheet(expenseBreakdownData);

    // Ειδικά Χιλιοστά Ανελκυστήρα
    let elevatorData: any[] = [];
    if (state.advancedShares && state.advancedShares.elevator_shares) {
      elevatorData = Object.values(state.advancedShares.elevator_shares).map((share: any) => ({
        'ΔΙΑΜΕΡΙΣΜΑ': share.apartment_number,
        'ΧΙΛΙΟΣΤΑ ΑΝΕΛΚΥΣΤΗΡΑ': share.elevator_mills,
        'ΜΕΡΙΔΙΟ ΑΝΕΛΚΥΣΤΗΡΑ (€)': share.elevator_share
      }));
    }

    const elevatorWorksheet = XLSX.utils.json_to_sheet(elevatorData);

    // Προσθήκη στατιστικών
    const statsData = [
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Συνολικές Δαπάνες', 'ΤΙΜΗ': `${formatAmount(stats.totalAmount)}€` },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Αριθμός Διαμερισμάτων', 'ΤΙΜΗ': stats.totalApartments },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Μέσος Όρος ανά Διαμέρισμα', 'ΤΙΜΗ': `${formatAmount(stats.averagePerApartment)}€` },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Συνολικό Οφειλόμενο', 'ΤΙΜΗ': `${formatAmount(stats.totalDue)}€` },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Περίοδος', 'ΤΙΜΗ': getPeriodInfo() },
      { 'ΣΤΑΤΙΣΤΙΚΑ': 'Ημερομηνία Έκδοσης', 'ΤΙΜΗ': new Date().toLocaleDateString('el-GR') },
    ];

    const statsWorksheet = XLSX.utils.json_to_sheet(statsData);

    // Προσθήκη φύλλων στο βιβλίο
    XLSX.utils.book_append_sheet(workbook, mainWorksheet, 'Τμήμα Κατανομής');
    XLSX.utils.book_append_sheet(workbook, expenseBreakdownWorksheet, 'Ανάλυση Δαπανών');
    if (elevatorData.length > 0) {
      XLSX.utils.book_append_sheet(workbook, elevatorWorksheet, 'Χιλιοστά Ανελκυστήρα');
    }
    XLSX.utils.book_append_sheet(workbook, statsWorksheet, 'Στατιστικά');

      // Αποθήκευση αρχείου
      const fileName = `φυλλο_κοινοχρηστων_${getPeriodInfo().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`;
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, fileName);

      toast.success('Εξαγωγή Excel ολοκληρώθηκε επιτυχώς!');
    } catch (error) {
      console.error('Excel Export Error:', error);
      toast.error('Σφάλμα κατά την εξαγωγή Excel');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Helper function to check if period is within reserve fund collection timeline
  const checkIfPeriodInReserveFundTimeline = (startDate: string, endDate: string) => {
    try {
      // Use buildingData instead of localStorage
      const reserveFundGoal = buildingData?.reserve_fund_goal || 0;
      if (!reserveFundGoal || reserveFundGoal === 0) {
        console.log('🔄 Reserve fund goal is zero or not set, returning false');
        return false;
      }

      const reserveFundStartDate = buildingData?.reserve_fund_start_date;
      const reserveFundEndDate = buildingData?.reserve_fund_target_date;

      // If no dates are set, return false
      if (!reserveFundStartDate || !reserveFundEndDate) {
        console.log('🔄 Reserve fund dates not set, returning false');
        return false;
      }

      const periodStart = new Date(startDate);
      const periodEnd = new Date(endDate);
      const rfStart = new Date(reserveFundStartDate);
      const rfEnd = new Date(reserveFundEndDate);

      console.log('🔄 Reserve fund timeline check:', {
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        rfStart: rfStart.toISOString().split('T')[0],
        rfEnd: rfEnd.toISOString().split('T')[0],
        reserveFundGoal
      });

      // Check if the period overlaps with reserve fund timeline
      const isWithinTimeline = periodStart <= rfEnd && periodEnd >= rfStart;

      console.log('🔄 Reserve fund within timeline:', isWithinTimeline);
      return isWithinTimeline;
    } catch (error) {
      console.error('Error checking reserve fund timeline:', error);
      return false; // Safe fallback
    }
  };

  const getPeriodInfo = () => {
    console.log('🔍 ResultsStep getPeriodInfo:', {
      periodMode: state.periodMode,
      quickOptions: state.quickOptions,
      customPeriodName: state.customPeriod.periodName
    });

    // FIXED: Always use the customPeriod.periodName which is set correctly based on selectedMonth
    const result = state.customPeriod.periodName;
    console.log('🔄 ResultsStep: Using customPeriod.periodName (FIXED):', result);
    return result;
  };

  const getSummaryStats = () => {
    const shares = Object.values(state.shares);
    const totalApartments = shares.length;

    // Calculate expense breakdown data for Excel export
    const expenseBreakdownData = shares.map((share: any) => ({
      apartment: share.identifier || share.apartment_number,
      owner: share.owner_name || 'Μη καταχωρημένος',
      participation_mills: share.participation_mills,
      common_amount: share.breakdown?.common || 0,
      heating_amount: share.breakdown?.heating || 0,
      elevator_amount: share.breakdown?.elevator || 0,
      equal_share_amount: share.breakdown?.equal_share || 0,
      individual_amount: share.breakdown?.individual || 0,
      reserve_fund_amount: share.breakdown?.reserve_fund_contribution || 0,
      management_fee: 1.00,
      total_amount: share.total_amount || 0
    }));

    const expenseBreakdownWorksheet = XLSX.utils.json_to_sheet(expenseBreakdownData);

    // Reserve handling: if reserve is already included in shares, don't add again.
    const reserveIncludedInShares = shares.some((s: any) => Number((s.breakdown || {}).reserve_fund_contribution || 0) > 0);
    const advancedTotals = (state.advancedShares && state.advancedShares.expense_totals) || null;
    const hasOtherExpenses = advancedTotals
      ? (Number(advancedTotals.heating || 0) > 0 ||
         Number(advancedTotals.elevator || 0) > 0 ||
         Number(advancedTotals.equal_share || 0) > 0 ||
         Number(advancedTotals.individual || 0) > 0)
      : false;
    const reserveMonthlyCandidate = Number(state.advancedShares?.reserve_contribution || 0); // building-level monthly
    const reserveExtra = !reserveIncludedInShares && hasOtherExpenses ? reserveMonthlyCandidate : 0;

    const baseTotalAmount = Number(state.totalExpenses || 0);
    const totalAmount = baseTotalAmount + reserveExtra;
    const averagePerApartment = totalApartments > 0 ? totalAmount / totalApartments : 0;
    const totalDue = shares.reduce((sum: number, share: any) => sum + (share.total_due || 0), 0);
    const totalCredits = shares.reduce((sum: number, share: any) => sum + Math.max(0, share.total_due || 0), 0);

    return {
      totalApartments,
      totalAmount,
      averagePerApartment,
      totalDue,
      totalCredits
    };
  };

  const getPaymentAnalytics = () => {
    const shares = Object.values(state.shares);
    const totalApartments = shares.length;
    const graceDay = (buildingData?.grace_day_of_month as number) || 15;
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const selectedMonthStr = state.customPeriod?.startDate?.substring(0, 7) || currentMonthStr;
    const isCurrentMonth = selectedMonthStr === currentMonthStr;
    const isPastGracePeriod = isCurrentMonth ? now.getDate() > graceDay : true;

    // Helper: effective due for classification respecting grace period
    const getEffectiveTotalDue = (share: any): number => {
      const totalDue = share.total_due || 0; // negative means owes
      const previousBalance = share.previous_balance || 0; // negative means owes
      // Before/On grace day of current month: count only previous arrears
      if (!isPastGracePeriod) {
        return Math.min(0, previousBalance);
      }
      // After grace day or other months: count full due
      return Math.min(0, totalDue);
    };

    // Κατηγοριοποίηση διαμερισμάτων βάσει οφειλών
    const currentApartments = shares.filter((share: any) => getEffectiveTotalDue(share) >= 0).length;
    const behindApartments = shares.filter((share: any) => {
      const effectiveDue = getEffectiveTotalDue(share);
              return effectiveDue < 0 && Math.abs(effectiveDue) <= (share.total_amount || 0) * 2; // Έως 2 μήνες οφειλή
    }).length;
    const criticalApartments = shares.filter((share: any) => {
      const effectiveDue = getEffectiveTotalDue(share);
              return effectiveDue < 0 && Math.abs(effectiveDue) > (share.total_amount || 0) * 2; // Πάνω από 2 μήνες οφειλή
    }).length;

    // Υπολογισμός συνολικής κάλυψης
    const totalMonthlyObligations = shares.reduce((sum: number, share: any) => sum + (share.total_amount || 0), 0);
    const totalPendingAmount = shares.reduce((sum: number, share: any) => {
      const effectiveDue = getEffectiveTotalDue(share);
      return effectiveDue < 0 ? sum + Math.abs(effectiveDue) : sum;
    }, 0);

    // Include reserve in monthly obligations if not already in shares
    const reserveIncludedInShares = shares.some((s: any) => Number((s.breakdown || {}).reserve_fund_contribution || 0) > 0);
    const advancedTotals = (state.advancedShares && state.advancedShares.expense_totals) || null;
    const hasOtherExpenses = advancedTotals
      ? (Number(advancedTotals.heating || 0) > 0 ||
         Number(advancedTotals.elevator || 0) > 0 ||
         Number(advancedTotals.equal_share || 0) > 0 ||
         Number(advancedTotals.individual || 0) > 0)
      : false;
    const reserveMonthlyCandidate = Number(state.advancedShares?.reserve_contribution || 0);
    const reserveExtra = !reserveIncludedInShares && hasOtherExpenses ? reserveMonthlyCandidate : 0;

    const overallMonthlyObligationsWithReserve = totalMonthlyObligations + reserveExtra;

    const overallCoveragePercentage = overallMonthlyObligationsWithReserve > 0
      ? Math.min(100, Math.max(0, ((overallMonthlyObligationsWithReserve - totalPendingAmount) / overallMonthlyObligationsWithReserve) * 100))
      : 0;

    return {
      currentApartments,
      behindApartments,
      criticalApartments,
      totalPendingAmount,
      totalMonthlyObligations: overallMonthlyObligationsWithReserve,
      overallCoveragePercentage
    };
  };

  const stats = getSummaryStats();
  const analytics = getPaymentAnalytics();

  // Auto-calculate results when entering the Results step
  React.useEffect(() => {
    const run = async () => {
      try {
        setIsLoading(true);
        setLoadError(null);
        setCalculationProgress(0);

        const startDate = state.customPeriod.startDate;
        const endDate = state.customPeriod.endDate;
        if (!startDate || !endDate) return;

        // Simulate realistic progress
        const progressSteps = [
          { progress: 10, message: 'Φόρτωση δεδομένων κτιρίου...' },
          { progress: 30, message: 'Ανάκτηση δαπανών...' },
          { progress: 60, message: 'Υπολογισμός μεριδίων...' },
          { progress: 90, message: 'Τελικοί υπολογισμοί...' },
          { progress: 100, message: 'Ολοκληρώθηκε!' }
        ];

        for (let i = 0; i < progressSteps.length - 1; i++) {
          await new Promise(resolve => setTimeout(resolve, 300));
          setCalculationProgress(progressSteps[i].progress);
        }

        const isAdvanced = state.advancedOptions.includeReserveFund ||
          state.advancedOptions.heatingFixedPercentage !== 30 ||
          state.advancedOptions.elevatorMills;

        if (isAdvanced) {
          // Check if selected period is within reserve fund collection timeline
          const shouldIncludeReserveFund = state.advancedOptions.includeReserveFund &&
            checkIfPeriodInReserveFundTimeline(startDate, endDate);

          console.log('🔄 ResultsStep: Reserve fund check:', {
            includeReserveFund: state.advancedOptions.includeReserveFund,
            shouldIncludeReserveFund,
            startDate,
            endDate,
            reserveFundAmount: state.advancedOptions.reserveFundMonthlyAmount
          });

          const result = await calculateAdvancedShares({
            building_id: buildingId,
            period_start_date: startDate,
            period_end_date: endDate,
            month_filter: startDate ? startDate.substring(0, 7) : undefined, // "2025-05" format
            reserve_fund_monthly_total: shouldIncludeReserveFund && state.advancedOptions.reserveFundMonthlyAmount > 0
              ? state.advancedOptions.reserveFundMonthlyAmount
              : undefined, // Let backend calculate from building settings
          });
          const shares = result?.shares || {};
          const totalExpenses = Object.values(shares).reduce((sum: number, share: any) => sum + (share.total_amount || 0), 0);
          updateState({ shares, totalExpenses, advancedShares: result });
        } else {
          const result = await calculateShares({
            building_id: buildingId,
            month_filter: startDate ? startDate.substring(0, 7) : undefined, // "2025-05" format
          });
          updateState({ shares: result.shares || {}, totalExpenses: result.total_expenses || 0, advancedShares: null });
        }

        setCalculationProgress(100);
        // Show success message
        setCalculationSuccess(true);
      } catch (err: any) {
        setLoadError(err?.message || 'Σφάλμα κατά τον υπολογισμό');
        setCalculationSuccess(false);
      } finally {
        // Small delay to show completion
        setTimeout(() => {
        setIsLoading(false);
          setCalculationProgress(0);
        }, 500);

        // Hide success message after 4 seconds (total)
        setTimeout(() => setCalculationSuccess(false), 4000);
      }
    };
    run();
  }, [buildingId, state.customPeriod.startDate, state.customPeriod.endDate, state.advancedOptions.includeReserveFund, state.advancedOptions.heatingFixedPercentage, state.advancedOptions.elevatorMills, state.advancedOptions.reserveFundMonthlyAmount]);

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div className="space-y-6">
      {/* Loading Progress */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
            Υπολογισμός σε εξέλιξη...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Πρόοδος</span>
              <span>{calculationProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${calculationProgress}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards Skeleton */}
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-3 sm:p-4 rounded-lg border animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-4 w-4 bg-gray-300 rounded"></div>
                  <div className="h-4 bg-gray-300 rounded w-20"></div>
                </div>
                <div className="h-8 bg-gray-300 rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons Skeleton */}
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-0">
            <div className="animate-pulse">
              <div className="h-12 bg-gray-300 rounded w-full sm:w-48"></div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-10 bg-gray-200 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Table Skeleton */}
      <Card>
        <CardHeader>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-300 rounded w-1/3"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="h-5 bg-gray-300 rounded w-12 mb-1"></div>
                      <div className="h-3 bg-gray-200 rounded w-24"></div>
                    </div>
                    <div className="h-5 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {[1, 2, 3, 4].map((j) => (
                      <div key={j}>
                        <div className="h-3 bg-gray-200 rounded w-16 mb-1"></div>
                        <div className="h-4 bg-gray-300 rounded w-12"></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // Enhanced error handling
  const ErrorStateComponent = ({ error }: { error: string }) => {
    const [isRetrying, setIsRetrying] = useState(false);

    const handleRetry = async () => {
      setIsRetrying(true);
      try {
        // Wait a moment before retrying
        await new Promise(resolve => setTimeout(resolve, 1000));
        window.location.reload();
      } catch (err) {
        console.error('Retry failed:', err);
      } finally {
        setIsRetrying(false);
      }
    };

    const getErrorDetails = (error: string) => {
      if (error.toLowerCase().includes('network') || error.toLowerCase().includes('fetch')) {
        return {
          title: 'Πρόβλημα Σύνδεσης',
          description: 'Δεν ήταν δυνατή η σύνδεση με τον διακομιστή. Ελέγξτε τη σύνδεσή σας στο internet.',
          suggestions: [
            'Ελέγξτε τη σύνδεση internet',
            'Δοκιμάστε να ανανεώσετε τη σελίδα',
            'Προσπαθήστε ξανά σε λίγα λεπτά'
          ]
        };
      } else if (error.toLowerCase().includes('unauthorized') || error.toLowerCase().includes('403')) {
        return {
          title: 'Μη Εξουσιοδοτημένη Πρόσβαση',
          description: 'Δεν έχετε δικαίωμα πρόσβασης σε αυτά τα δεδομένα.',
          suggestions: [
            'Συνδεθείτε ξανά στο λογαριασμό σας',
            'Επικοινωνήστε με τον διαχειριστή',
            'Ελέγξτε τα δικαιώματά σας'
          ]
        };
      } else if (error.toLowerCase().includes('timeout')) {
        return {
          title: 'Λήξη Χρονικού Ορίου',
          description: 'Η αίτηση χρειάστηκε περισσότερο χρόνο από τον αναμενόμενο.',
          suggestions: [
            'Δοκιμάστε ξανά με λιγότερα δεδομένα',
            'Ελέγξτε τη ταχύτητα της σύνδεσής σας',
            'Προσπαθήστε ξανά αργότερα'
          ]
        };
      } else {
        return {
          title: 'Σφάλμα Υπολογισμού',
          description: error || 'Προέκυψε απροσδόκητο σφάλμα κατά τον υπολογισμό.',
          suggestions: [
            'Ελέγξτε αν όλα τα απαιτούμενα δεδομένα είναι διαθέσιμα',
            'Δοκιμάστε με διαφορετική περίοδο',
            'Επικοινωνήστε με την υποστήριξη αν το πρόβλημα συνεχίζεται'
          ]
        };
      }
    };

    const errorDetails = getErrorDetails(error);

  return (
    <div className="space-y-6">
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <AlertCircle className="h-5 w-5" />
              {errorDetails.title}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-red-700">{errorDetails.description}</p>

            <div className="bg-red-100 border border-red-200 rounded-lg p-4">
              <h4 className="font-semibold text-red-800 mb-2">Προτεινόμενες Λύσεις:</h4>
              <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                {errorDetails.suggestions.map((suggestion, index) => (
                  <li key={index}>{suggestion}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleRetry}
                disabled={isRetrying}
                variant="outline"
                className="border-red-300 text-red-700 hover:bg-red-100 flex items-center gap-2"
              >
                {isRetrying ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                    Επανάληψη...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Επανάληψη
                  </>
                )}
              </Button>

              <Button
                onClick={() => {
                  // Go back to previous step or refresh data
                  setLoadError(null);
                  setIsLoading(false);
                }}
                variant="ghost"
                className="text-gray-600 hover:text-gray-800"
              >
                <X className="h-4 w-4 mr-2" />
                Ακύρωση
              </Button>
            </div>

            <div className="mt-4 pt-4 border-t border-red-200">
              <details className="text-xs text-red-600">
                <summary className="cursor-pointer font-medium">Τεχνικές Λεπτομέρειες</summary>
                <pre className="mt-2 p-2 bg-red-50 rounded border text-red-800 overflow-auto">
                  {error}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Show error state
  if (loadError) {
    return <ErrorStateComponent error={loadError} />;
  }

  // Show loading state
  if (isLoading || Object.keys(state.shares).length === 0) {
    return <LoadingSkeleton />;
  }

  // Success message component
  const SuccessMessage = () => (
    <Card className="border-green-200 bg-green-50/50 animate-in slide-in-from-top duration-500">
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h4 className="font-semibold text-green-800">Επιτυχής Υπολογισμός</h4>
            <p className="text-sm text-green-600">Τα δεδομένα ενημερώθηκαν επιτυχώς</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      {/* Success Message - shown after successful calculation */}
      {calculationSuccess && <SuccessMessage />}



      {/* Enhanced Floating Action Button using Popover */}
      <div className="flex flex-wrap items-center justify-end gap-3 mb-4">
        <Button
          onClick={handleIssue}
          disabled={state.isIssuing}
          title="Η οριστική έκδοση γίνεται πάντα για τον προηγούμενο μήνα."
          className="bg-gradient-to-r from-rose-600 via-red-600 to-orange-500 hover:from-rose-700 hover:via-red-700 hover:to-orange-600 text-white shadow-xl hover:shadow-rose-500/30 border-0 rounded-full px-7 py-6 h-auto transition-all duration-300 transform hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {state.isIssuing ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Έκδοση...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              Οριστική έκδοση προηγούμενου μήνα
            </>
          )}
        </Button>

        <Popover open={isActionsPopoverOpen} onOpenChange={setIsActionsPopoverOpen}>
          <PopoverTrigger asChild>
            <Button
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white shadow-lg hover:shadow-indigo-500/25 border-0 rounded-full px-6 py-6 h-auto transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full backdrop-blur-sm">
                  <Send className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-bold text-base">Ενέργειες Κοινοχρήστων</div>
                  <div className="text-xs text-indigo-100 font-medium opacity-90">
                    {Object.keys(state.shares).length} Διαμερίσματα
                  </div>
                </div>
                <ChevronDown className="h-4 w-4 ml-2 opacity-70" />
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-2" align="end" sideOffset={8}>
            <div className="grid gap-2">
              <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground border-b border-slate-200/50 mb-1">
                Διαθέσιμες Ενέργειες
              </div>

              <Button
                onClick={() => {
                  setIsActionsPopoverOpen(false);
                  // Small delay to ensure popover is fully closed before opening modal
                  setTimeout(() => setShowCommonExpenseModal(true), 50);
                }}
                variant="ghost"
                className="justify-start h-auto py-3 px-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 group"
              >
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg mr-3 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Eye className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Προβολή Φύλλου</div>
                  <div className="text-xs text-muted-foreground">Λεπτομερής ανάλυση & εκτύπωση</div>
                </div>
              </Button>

              <Button
                onClick={() => {
                  setIsActionsPopoverOpen(false);
                  handleExport('pdf');
                }}
                variant="ghost"
                className="justify-start h-auto py-3 px-3 hover:bg-rose-50 dark:hover:bg-rose-900/20 group"
              >
                <div className="p-2 bg-rose-100 text-rose-600 rounded-lg mr-3 group-hover:bg-rose-600 group-hover:text-white transition-colors">
                  <FileText className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Εξαγωγή PDF</div>
                  <div className="text-xs text-muted-foreground">Αποθήκευση ως αρχείο PDF</div>
                </div>
              </Button>

              <Button
                onClick={() => {
                  setIsActionsPopoverOpen(false);
                  handleExport('excel');
                }}
                variant="ghost"
                className="justify-start h-auto py-3 px-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 group"
              >
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg mr-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <Download className="h-5 w-5" />
                </div>
                <div className="text-left">
                  <div className="font-semibold text-foreground">Εξαγωγή Excel</div>
                  <div className="text-xs text-muted-foreground">Για επεξεργασία δεδομένων</div>
                </div>
              </Button>

            </div>
          </PopoverContent>
        </Popover>
      </div>



      {/* Common Expense Modal - Only rendered when open */}
      {showCommonExpenseModal && (
        <CommonExpenseModal
          isOpen={showCommonExpenseModal}
          onClose={() => setShowCommonExpenseModal(false)}
        state={state}
        buildingId={buildingId}
        buildingName={buildingData?.name || "Άγνωστο Κτίριο"}
        managementFeePerApartment={buildingData?.management_fee_per_apartment || 0}
        reserveContributionPerApartment={buildingData?.reserve_contribution_per_apartment || 0}
        managerName={buildingData?.internal_manager_name || "Διαχειριστής Κτιρίου"}
        managerPhone={buildingData?.internal_manager_phone || "210-1234567"}
        managerApartment={buildingData?.internal_manager_apartment || ""}
        managerCollectionSchedule={buildingData?.internal_manager_collection_schedule || "Δευ-Παρ 9:00-17:00"}
        buildingAddress={buildingData?.address || ""}
        buildingCity={buildingData?.city || ""}
        buildingPostalCode={buildingData?.postal_code || ""}
        managementOfficeName={user?.office_name || ""}
        managementOfficePhone={user?.office_phone || ""}
        managementOfficeAddress={user?.office_address || ""}
        managementOfficeLogo={user?.office_logo || ""}
        />
      )}

      <Dialog open={showSendPrompt} onOpenChange={setShowSendPrompt}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Αποστολή ειδοποιήσεων κοινοχρήστων</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Θέλετε να σταλούν τώρα τα κοινόχρηστα και τα ατομικά ειδοποιητήρια;
            </p>

            <div className="space-y-2">
              <Label>Εμβέλεια αποστολής</Label>
              <Select
                value={sendScope}
                onValueChange={(value) => setSendScope(value as 'current' | 'all' | 'selected')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Επιλέξτε εμβέλεια" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="current">Μόνο αυτή η πολυκατοικία</SelectItem>
                  <SelectItem value="all">Όλες οι πολυκατοικίες</SelectItem>
                  <SelectItem value="selected">Επιλογή πολυκατοικιών</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {sendScope === 'selected' && (
              <div className="space-y-2 max-h-48 overflow-auto rounded-md border border-slate-200 p-2">
                {availableBuildings.map((building: any) => {
                  const label = building.name || building.address || `Κτίριο ${building.id}`;
                  const checked = selectedBuildingIds.includes(building.id);
                  return (
                    <label key={building.id} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) => {
                          const isChecked = value === true;
                          setSelectedBuildingIds((prev) => {
                            if (isChecked) {
                              return Array.from(new Set([...prev, building.id]));
                            }
                            return prev.filter((id) => id !== building.id);
                          });
                        }}
                      />
                      <span>{label}</span>
                    </label>
                  );
                })}
              </div>
            )}

            <Alert>
              <AlertDescription>
                Αν δεν γίνει αποστολή τώρα, οι ειδοποιήσεις θα φύγουν αυτόματα την 1η του μήνα.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSendPrompt(false);
                toast.message('Η αποστολή θα γίνει αυτόματα την 1η του μήνα.');
              }}
              disabled={isSendingNotifications}
            >
              Όχι τώρα
            </Button>
            <Button onClick={handleSendNotifications} disabled={isSendingNotifications}>
              {isSendingNotifications ? 'Αποστολή…' : 'Αποστολή τώρα'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
