
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PerApartmentAmounts, ExpenseBreakdown, ManagementFeeInfo, ReserveFundInfo, Share } from '../types/financial';
import { formatAmount, toNumber } from '../utils/formatters';

interface ApartmentExpenseTableProps {
  shares: { [key: string]: Share };
  aptWithFinancial: any[];
  perApartmentAmounts: PerApartmentAmounts;
  expenseBreakdown: ExpenseBreakdown;
  managementFeeInfo: ManagementFeeInfo;
  reserveFundInfo: ReserveFundInfo;
  totalExpenses: number;
  showOwnerExpenses: boolean;
}

export const ApartmentExpenseTable: React.FC<ApartmentExpenseTableProps> = ({
  shares,
  aptWithFinancial,
  perApartmentAmounts,
  expenseBreakdown,
  managementFeeInfo,
  reserveFundInfo,
  totalExpenses,
  showOwnerExpenses
}) => {
  const sharesArray = Object.values(shares);

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-full common-expense-table" style={{ minWidth: '1400px' }}>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>Α/Δ</TableHead>
            <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>ΟΝΟΜΑΤΕΠΩΝΥΜΟ</TableHead>
            <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>ΟΦΕΙΛΕΣ</TableHead>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 στήλες ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ */}
            <TableHead className="text-center border font-bold text-xs text-white" colSpan={4} style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)"}}>ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ</TableHead>
            {/* ✅ ΝΕΟ: Μία στήλη ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ */}
            <TableHead className="text-center border font-bold text-xs text-white" style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)"}}>ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ</TableHead>
            {reserveFundInfo.monthlyAmount > 0 && <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #7e22ce 0%, #6d28d9 100%)", color: "white"}}>ΑΠΟΘΕΜΑΤΙΚΟ</TableHead>}
            <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>ΠΛΗΡΩΤΕΟ ΠΟΣΟ</TableHead>
          </TableRow>
          <TableRow className="bg-gray-100">
            <TableHead className="text-center border"></TableHead>
            <TableHead className="text-center border"></TableHead>
            <TableHead className="text-center border"></TableHead>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 υπο-στήλες χιλιοστών */}
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>Κ/ΧΡΗΣΤΑ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΑΝΕΛ/ΡΑΣ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΘΕΡΜ/ΣΗ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΔΙΑΧΕΙΡΙΣΗ</TableHead>
            {/* ✅ ΝΕΟ: Μία υπο-στήλη για δαπάνες ιδιοκτητών */}
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)", fontSize: "10px", width: "100px"}}>ΣΥΝΟΛΟ</TableHead>
            {reserveFundInfo.monthlyAmount > 0 && <TableHead className="text-center border"></TableHead>}
            <TableHead className="text-center border"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sharesArray.map((share) => {
            const apartmentData = aptWithFinancial.find(apt => apt.apartment_id === share.apartment_id);
            const commonMills = apartmentData?.participation_mills ?? toNumber(share.participation_mills);
            const breakdown = share.breakdown || {};
            const commonAmount = toNumber(apartmentData?.expense_share || 0);
            const elevatorAmount = toNumber(breakdown.elevator_expenses || 0);
            const heatingAmount = toNumber(breakdown.heating_expenses || 0);
            const managementFee = toNumber((breakdown as any).management_fee ?? managementFeeInfo.feePerApartment);
            const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0 && Object.values(expenseBreakdown).some(v => v > 0)) ? toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000) : 0;
            
            // Fix: Show positive previous balance amounts
            const previousBalance = Math.abs(apartmentData?.previous_balance ?? 0);
            
            // ✅ ΝΕΟ: Υπολογισμός δαπανών ιδιοκτήτη
            // Παίρνουμε από το apartmentData.owner_expenses αν υπάρχει
            const ownerExpenses = toNumber(apartmentData?.owner_expenses || 0);
            
            // Fix: Include previous balance in final total + owner expenses
            const finalTotalWithFees = commonAmount + elevatorAmount + heatingAmount + managementFee + apartmentReserveFund + previousBalance + ownerExpenses;

            return (
              <TableRow key={share.apartment_id}>
                <TableCell>{share.identifier || share.apartment_number}</TableCell>
                <TableCell>{share.owner_name || 'Μη καταχωρημένος'}</TableCell>
                <TableCell>{formatAmount(previousBalance)}€</TableCell>
                {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 cells για χιλιοστά */}
                <TableCell>{formatAmount(commonAmount + apartmentReserveFund)}</TableCell>
                <TableCell>{formatAmount(elevatorAmount)}</TableCell>
                <TableCell>{formatAmount(heatingAmount)}</TableCell>
                <TableCell>{formatAmount(managementFee)}</TableCell>
                {/* ✅ ΝΕΟ: Μία στήλη για δαπάνες ιδιοκτητών */}
                <TableCell className="font-semibold">{ownerExpenses > 0 ? formatAmount(ownerExpenses) + '€' : '-'}</TableCell>
                {reserveFundInfo.monthlyAmount > 0 && <TableCell>{formatAmount(apartmentReserveFund)}</TableCell>}
                <TableCell>{formatAmount(finalTotalWithFees)}</TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-gray-100 font-bold">
            <TableCell colSpan={2}>ΣΥΝΟΛΑ</TableCell>
            <TableCell>{formatAmount(sharesArray.reduce((s, a) => s + Math.abs(aptWithFinancial.find(apt => apt.id === a.apartment_id)?.previous_balance ?? 0), 0))}€</TableCell>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 cells χιλιοστών */}
            <TableCell>{formatAmount(
              sharesArray.reduce((sum, share) => {
                const apartmentData = aptWithFinancial.find(apt => apt.apartment_id === share.apartment_id);
                const commonMills = apartmentData?.participation_mills ?? toNumber(share.participation_mills);
                const commonAmount = toNumber(apartmentData?.expense_share || 0);
                const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0 && Object.values(expenseBreakdown).some(v => v > 0)) ? toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000) : 0;
                return sum + commonAmount + apartmentReserveFund;
              }, 0)
            )}</TableCell>
            <TableCell>{formatAmount(
              sharesArray.reduce((sum, share) => {
                const breakdown = share.breakdown || {};
                return sum + toNumber(breakdown.elevator_expenses || 0);
              }, 0)
            )}</TableCell>
            <TableCell>{formatAmount(
              sharesArray.reduce((sum, share) => {
                const breakdown = share.breakdown || {};
                return sum + toNumber(breakdown.heating_expenses || 0);
              }, 0)
            )}</TableCell>
            <TableCell>{formatAmount(managementFeeInfo.totalFee)}</TableCell>
            {/* ✅ ΝΕΟ: Σύνολο δαπανών ιδιοκτητών */}
            <TableCell className="font-semibold">{formatAmount(
              sharesArray.reduce((sum, share) => {
                const apartmentData = aptWithFinancial.find(apt => apt.apartment_id === share.apartment_id);
                const ownerExpenses = toNumber(apartmentData?.owner_expenses || 0);
                return sum + ownerExpenses;
              }, 0)
            )}€</TableCell>
            {reserveFundInfo.monthlyAmount > 0 && <TableCell>{formatAmount(reserveFundInfo.monthlyAmount)}</TableCell>}
            <TableCell>{formatAmount(
              sharesArray.reduce((sum, share) => {
                const apartmentData = aptWithFinancial.find(apt => apt.apartment_id === share.apartment_id);
                const commonMills = apartmentData?.participation_mills ?? toNumber(share.participation_mills);
                const breakdown = share.breakdown || {};
                const commonAmount = toNumber(apartmentData?.expense_share || 0);
                const elevatorAmount = toNumber(breakdown.elevator_expenses || 0);
                const heatingAmount = toNumber(breakdown.heating_expenses || 0);
                const managementFee = toNumber((breakdown as any).management_fee ?? managementFeeInfo.feePerApartment);
                const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0 && Object.values(expenseBreakdown).some(v => v > 0)) ? toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000) : 0;
                const previousBalance = Math.abs(apartmentData?.previous_balance ?? 0);
                const ownerExpenses = toNumber(apartmentData?.owner_expenses || 0);
                return sum + commonAmount + elevatorAmount + heatingAmount + managementFee + apartmentReserveFund + previousBalance + ownerExpenses;
              }, 0)
            )}€</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
