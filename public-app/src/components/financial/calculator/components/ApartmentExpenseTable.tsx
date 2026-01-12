
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PerApartmentAmounts, ExpenseBreakdown, ManagementFeeInfo, ReserveFundInfo, Share, ExpenseSplitRatios } from '../types/financial';
import { formatAmount, toNumber } from '../utils/formatters';
import { ApartmentWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';

interface ApartmentExpenseTableProps {
  shares: { [key: string]: Share };
  aptWithFinancial: ApartmentWithFinancialData[];
  perApartmentAmounts: PerApartmentAmounts;
  expenseBreakdown: ExpenseBreakdown;
  managementFeeInfo: ManagementFeeInfo;
  reserveFundInfo: ReserveFundInfo;
  expenseSplitRatios: ExpenseSplitRatios;
  totalExpenses: number;
  showOwnerExpenses: boolean;
}

const numericCellClasses = "text-center text-sm font-semibold text-gray-800 tabular-nums";
const mutedNumericCellClasses = "text-center text-sm text-gray-600 tabular-nums";

export const ApartmentExpenseTable: React.FC<ApartmentExpenseTableProps> = ({
  shares,
  aptWithFinancial,
  perApartmentAmounts,
  expenseBreakdown,
  managementFeeInfo,
  reserveFundInfo,
  expenseSplitRatios,
  totalExpenses,
  showOwnerExpenses
}) => {
  const sharesArray = Object.values(shares);
  const ratios = expenseSplitRatios || { elevator: 1, heating: 1 };
  const getApartmentDataForShare = (share: Share) =>
    aptWithFinancial.find(apt => apt.id === share.apartment_id || (apt as any).apartment_id === share.apartment_id);

  const getShareAmounts = (share: Share) => {
    const apartmentData = getApartmentDataForShare(share);
    const breakdown = share.breakdown || {};
    const elevatorAmount = Math.max(0, toNumber(breakdown.elevator_expenses || 0));
    const heatingAmount = Math.max(0, toNumber(breakdown.heating_expenses || 0));
    const residentTotal = toNumber(breakdown.resident_expenses ?? 0);
    const ownerTotal = toNumber(breakdown.owner_expenses ?? 0);
    const fallbackCommon = Math.max(
      0,
      toNumber(breakdown.general_expenses || 0) +
        toNumber(breakdown.equal_share_expenses || 0) +
        toNumber(breakdown.individual_expenses || 0)
    );
    const residentElevator = elevatorAmount * ratios.elevator;
    const residentHeating = heatingAmount * ratios.heating;
    const displayElevator = residentTotal > 0 ? residentElevator : elevatorAmount;
    const displayHeating = residentTotal > 0 ? residentHeating : heatingAmount;
    const commonAmountWithoutReserve = residentTotal > 0
      ? Math.max(0, residentTotal - displayElevator - displayHeating)
      : fallbackCommon;
    const commonMills = toNumber(apartmentData?.participation_mills ?? share.participation_mills ?? 0);
    const reserveFromShare = toNumber(breakdown.reserve_fund_contribution ?? 0);
    const apartmentReserveFund = reserveFromShare > 0
      ? reserveFromShare
      : reserveFundInfo.monthlyAmount > 0
        ? Math.max(0, toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000))
        : 0;
    const ownerExpensesOnlyProjects = ownerTotal > 0
      ? Math.max(0, ownerTotal)
      : Math.max(0, toNumber((apartmentData as any)?.owner_expenses || 0));
    const previousBalance = toNumber(apartmentData?.previous_balance ?? 0);
    const finalTotalWithFees = commonAmountWithoutReserve + displayElevator + displayHeating + previousBalance + ownerExpensesOnlyProjects + apartmentReserveFund;

    return {
      apartmentData,
      commonAmountWithoutReserve,
      elevatorAmount: displayElevator,
      heatingAmount: displayHeating,
      apartmentReserveFund,
      ownerExpensesOnlyProjects,
      previousBalance,
      finalTotalWithFees,
    };
  };

  const totals = sharesArray.reduce(
    (acc, share) => {
      const amounts = getShareAmounts(share);
      acc.previous += amounts.previousBalance;
      acc.common += amounts.commonAmountWithoutReserve;
      acc.elevator += amounts.elevatorAmount;
      acc.heating += amounts.heatingAmount;
      acc.owner += amounts.ownerExpensesOnlyProjects;
      acc.reserve += amounts.apartmentReserveFund;
      acc.final += amounts.finalTotalWithFees;
      return acc;
    },
    { previous: 0, common: 0, elevator: 0, heating: 0, owner: 0, reserve: 0, final: 0 }
  );

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full common-expense-table" style={{ minWidth: '1400px' }}>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="text-center border font-bold text-xs bg-destructive text-destructive-foreground">Α/Δ</TableHead>
            <TableHead className="text-center border font-bold text-xs bg-destructive text-destructive-foreground">ΟΝΟΜΑΤΕΠΩΝΥΜΟ</TableHead>
            <TableHead className="text-center border font-bold text-xs bg-destructive text-destructive-foreground">ΑΠΟ ΜΕΤΑΦΟΡΑ</TableHead>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 στήλες ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ + ΔΙΑΧΕΙΡΙΣΗ */}
            <TableHead className="text-center border font-bold text-xs bg-warning text-warning-foreground" colSpan={3}>
              <div className="flex items-center justify-center gap-1">
                ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ
                <span className="bg-white/20 text-white text-xs px-1 py-0.5 rounded">Ε</span>
              </div>
            </TableHead>
            {/* ✅ ΤΡΟΠΟΠΟΙΗΘΗΚΕ: ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ με 2 υποστήλες (Έργα + Αποθεματικό) */}
            <TableHead className="text-center border font-bold text-xs bg-success text-success-foreground" colSpan={2}>
              <div className="flex items-center justify-center gap-1">
                ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ
                <span className="bg-white/20 text-white text-xs px-1 py-0.5 rounded">Δ</span>
              </div>
            </TableHead>
            <TableHead className="text-center border font-bold text-xs bg-destructive text-destructive-foreground">ΠΛΗΡΩΤΕΟ ΠΟΣΟ</TableHead>
          </TableRow>
          <TableRow className="bg-gray-100">
            <TableHead className="text-center border"></TableHead>
            <TableHead className="text-center border"></TableHead>
            <TableHead className="text-center border"></TableHead>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 υπο-στήλες χιλιοστών + ΔΙΑΧΕΙΡΙΣΗ */}
            <TableHead className="text-center border bg-warning text-warning-foreground text-[10px] w-[80px]">Κ/ΧΡΗΣΤΑ</TableHead>
            <TableHead className="text-center border bg-warning text-warning-foreground text-[10px] w-[80px]">ΑΝΕΛ/ΡΑΣ</TableHead>
            <TableHead className="text-center border bg-warning text-warning-foreground text-[10px] w-[80px]">ΘΕΡΜ/ΣΗ</TableHead>
            {/* ✅ ΝΕΟ: 2 υπο-στήλες για δαπάνες ιδιοκτητών */}
            <TableHead className="text-center border bg-success text-success-foreground text-[10px] w-[100px]">ΕΡΓΑ</TableHead>
            <TableHead className="text-center border bg-success text-success-foreground text-[10px] w-[100px]">ΑΠΟΘΕΜΑΤΙΚΟ</TableHead>
            <TableHead className="text-center border"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sharesArray.map((share) => {
            const amounts = getShareAmounts(share);
            const {
              commonAmountWithoutReserve,
              elevatorAmount,
              heatingAmount,
              apartmentReserveFund,
              ownerExpensesOnlyProjects,
              previousBalance,
              finalTotalWithFees,
            } = amounts;

            return (
              <TableRow key={share.apartment_id}>
                <TableCell className="text-center text-xs font-semibold text-gray-700">
                  {share.identifier || share.apartment_number}
                </TableCell>
                <TableCell className="text-left text-xs font-semibold text-gray-700">
                  {share.owner_name || 'Μη καταχωρημένος'}
                </TableCell>
                <TableCell className={mutedNumericCellClasses}>{formatAmount(previousBalance)}€</TableCell>
                {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 cells για χιλιοστά + ΔΙΑΧΕΙΡΙΣΗ */}
                {/* ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ: Κ/ΧΡΗΣΤΑ ΧΩΡΙΣ αποθεματικό */}
                <TableCell className={numericCellClasses}>{formatAmount(commonAmountWithoutReserve)}€</TableCell>
                <TableCell className={numericCellClasses}>{formatAmount(elevatorAmount)}€</TableCell>
                <TableCell className={numericCellClasses}>{formatAmount(heatingAmount)}€</TableCell>
                {/* ✅ ΝΕΟ: ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ - 2 cells (ΕΡΓΑ χωρίς αποθεματικό + ΑΠΟΘΕΜΑΤΙΚΟ) */}
                <TableCell className={numericCellClasses}>
                  {ownerExpensesOnlyProjects > 0 ? `${formatAmount(ownerExpensesOnlyProjects)}€` : '-'}
                </TableCell>
                <TableCell className={numericCellClasses}>
                  {apartmentReserveFund > 0 ? `${formatAmount(apartmentReserveFund)}€` : '-'}
                </TableCell>
                {/* ΠΛΗΡΩΤΕΟ ΠΟΣΟ: Bold με € */}
                <TableCell className="text-center font-black text-gray-900 tabular-nums">
                  {formatAmount(finalTotalWithFees)}€
                </TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-gray-100 font-bold">
            <TableCell colSpan={2} className="text-left text-sm">ΣΥΝΟΛΑ</TableCell>
            <TableCell className={numericCellClasses}>
              {formatAmount(totals.previous)}€
            </TableCell>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 cells χιλιοστών */}
            {/* ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ - Κ/ΧΡΗΣΤΑ χωρίς θέρμανση/ανελκυστήρα για να μην διπλομετριούνται */}
            <TableCell className={numericCellClasses}>{`${formatAmount(totals.common)}€`}</TableCell>
            <TableCell className={numericCellClasses}>{`${formatAmount(totals.elevator)}€`}</TableCell>
            <TableCell className={numericCellClasses}>{`${formatAmount(totals.heating)}€`}</TableCell>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΕ: Cell ΔΙΑΧΕΙΡΙΣΗ (περιλαμβάνεται στο Κ/ΧΡΗΣΤΑ) */}
            {/* ✅ ΝΕΟ: ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ - 2 cells (ΕΡΓΑ χωρίς αποθεματικό + ΑΠΟΘΕΜΑΤΙΚΟ) */}
            <TableCell className={numericCellClasses}>{`${formatAmount(totals.owner)}€`}</TableCell>
            <TableCell className={numericCellClasses}>{`${formatAmount(totals.reserve)}€`}</TableCell>
            {/* ΠΛΗΡΩΤΕΟ ΠΟΣΟ: Περιλαμβάνει ΟΛΑ (+ αποθεματικό για συνολικό χρέος) */}
            <TableCell className="text-center font-black text-gray-900 tabular-nums">{`${formatAmount(totals.final)}€`}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
