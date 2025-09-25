
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
            <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>ΠΑΛΑΙΟΤΕΡΕΣ ΟΦΕΙΛΕΣ</TableHead>
            <TableHead className="text-center border font-bold text-xs text-white" colSpan={3} style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)"}}>ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ</TableHead>
            <TableHead className="text-center border font-bold text-xs text-white" colSpan={4} style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)"}}>ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ</TableHead>
            {showOwnerExpenses && <TableHead className="text-center border font-bold text-xs text-white" colSpan={3} style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)"}}>ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ</TableHead>}
            {reserveFundInfo.monthlyAmount > 0 && <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #7e22ce 0%, #6d28d9 100%)", color: "white"}}>ΑΠΟΘΕΜΑΤΙΚΟ</TableHead>}
            <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>ΠΛΗΡΩΤΕΟ ΠΟΣΟ</TableHead>
          </TableRow>
          <TableRow className="bg-gray-100">
            <TableHead className="text-center border"></TableHead>
            <TableHead className="text-center border"></TableHead>
            <TableHead className="text-center border"></TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", fontSize: "10px", width: "80px"}}>ΚΟΙΝΟΧΡΗΣΤΑ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", fontSize: "10px", width: "80px"}}>ΑΝΕΛΚ/ΡΑΣ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", fontSize: "10px", width: "80px"}}>ΘΕΡΜΑΝΣΗ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΚΟΙΝΟΧΡΗΣΤΑ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΑΝΕΛΚ/ΡΑΣ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΘΕΡΜΑΝΣΗ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΔΙΑΧΕΙΡΙΣΗ</TableHead>
            {showOwnerExpenses && (<> <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)", fontSize: "10px", width: "80px"}}>ΚΟΙΝΟΧΡΗΣΤΑ</TableHead> <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)", fontSize: "10px", width: "80px"}}>ΑΝΕΛΚ/ΡΑΣ</TableHead> <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)", fontSize: "10px", width: "80px"}}>ΘΕΡΜΑΝΣΗ</TableHead> </>)}
            <TableHead className="text-center border"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sharesArray.map((share) => {
            const apartmentData = aptWithFinancial.find(apt => apt.id === share.apartment_id);
            const commonMills = apartmentData?.participation_mills ?? toNumber(share.participation_mills);
            const elevatorMills = apartmentData?.participation_mills ?? toNumber(share.participation_mills);
            const heatingMills = apartmentData?.heating_mills ?? toNumber(share.participation_mills);
            const breakdown = share.breakdown || {};
            const commonAmount = toNumber(breakdown.general_expenses || 0);
            const elevatorAmount = toNumber(breakdown.elevator_expenses || 0);
            const heatingAmount = toNumber(breakdown.heating_expenses || 0);
            const managementFee = toNumber((breakdown as any).management_fee ?? managementFeeInfo.feePerApartment);
            const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0 && Object.values(expenseBreakdown).some(v => v > 0)) ? toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000) : 0;
            
            // Fix: Show positive previous balance amounts
            const previousBalance = Math.abs(apartmentData?.previous_balance ?? 0);
            
            // Fix: Include previous balance in final total
            const finalTotalWithFees = commonAmount + elevatorAmount + heatingAmount + managementFee + apartmentReserveFund + previousBalance;

            return (
              <TableRow key={share.apartment_id}>
                <TableCell>{share.identifier || share.apartment_number}</TableCell>
                <TableCell>{share.owner_name || 'Μη καταχωρημένος'}</TableCell>
                <TableCell>{formatAmount(previousBalance)}€</TableCell>
                <TableCell>{commonMills.toFixed(2)}</TableCell>
                <TableCell>{elevatorMills.toFixed(2)}</TableCell>
                <TableCell>{heatingMills.toFixed(2)}</TableCell>
                <TableCell>{formatAmount(commonAmount + apartmentReserveFund)}</TableCell>
                <TableCell>{formatAmount(elevatorAmount)}</TableCell>
                <TableCell>{formatAmount(heatingAmount)}</TableCell>
                <TableCell>{formatAmount(managementFee)}</TableCell>
                {showOwnerExpenses && (<> <TableCell>-</TableCell> <TableCell>-</TableCell> <TableCell>-</TableCell> </>)}
                {reserveFundInfo.monthlyAmount > 0 && <TableCell>{formatAmount(apartmentReserveFund)}</TableCell>}
                <TableCell>{formatAmount(finalTotalWithFees)}</TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-gray-100 font-bold">
            <TableCell colSpan={2}>ΣΥΝΟΛΑ</TableCell>
            <TableCell>{formatAmount(sharesArray.reduce((s, a) => s + Math.abs(aptWithFinancial.find(apt => apt.id === a.apartment_id)?.previous_balance ?? 0), 0))}€</TableCell>
            <TableCell>{sharesArray.reduce((s, a) => s + (aptWithFinancial.find(apt => apt.id === a.apartment_id)?.participation_mills ?? 0), 0).toFixed(2)}</TableCell>
            <TableCell>{sharesArray.reduce((s, a) => s + (aptWithFinancial.find(apt => apt.id === a.apartment_id)?.participation_mills ?? 0), 0).toFixed(2)}</TableCell>
            <TableCell>{sharesArray.reduce((s, a) => s + (aptWithFinancial.find(apt => apt.id === a.apartment_id)?.heating_mills ?? 0), 0).toFixed(2)}</TableCell>
            <TableCell>{formatAmount(expenseBreakdown.common + reserveFundInfo.monthlyAmount)}</TableCell>
            <TableCell>{formatAmount(expenseBreakdown.elevator)}</TableCell>
            <TableCell>{formatAmount(expenseBreakdown.heating)}</TableCell>
            <TableCell>{formatAmount(managementFeeInfo.totalFee)}</TableCell>
            {showOwnerExpenses && (<> <TableCell>-</TableCell> <TableCell>-</TableCell> <TableCell>-</TableCell> </>)}
            {reserveFundInfo.monthlyAmount > 0 && <TableCell>{formatAmount(reserveFundInfo.monthlyAmount)}</TableCell>}
            <TableCell>{formatAmount(totalExpenses + sharesArray.reduce((s, a) => s + Math.abs(aptWithFinancial.find(apt => apt.id === a.apartment_id)?.previous_balance ?? 0), 0))}€</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
