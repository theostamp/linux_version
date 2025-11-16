
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PerApartmentAmounts, ExpenseBreakdown, ManagementFeeInfo, ReserveFundInfo, Share } from '../types/financial';
import { formatAmount, toNumber } from '../utils/formatters';
import { ApartmentWithFinancialData } from '@/hooks/useApartmentsWithFinancialData';

interface ApartmentExpenseTableProps {
  shares: { [key: string]: Share };
  aptWithFinancial: ApartmentWithFinancialData[];
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
            <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>ΑΠΟ ΜΕΤΑΦΟΡΑ</TableHead>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 στήλες ΧΙΛΙΟΣΤΑ ΣΥΜΜΕΤΟΧΗΣ + ΔΙΑΧΕΙΡΙΣΗ */}
            <TableHead className="text-center border font-bold text-xs text-white" colSpan={3} style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)"}}>
              <div className="flex items-center justify-center gap-1">
                ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ
                <span className="bg-green-600 text-white text-xs px-1 py-0.5 rounded">Ε</span>
              </div>
            </TableHead>
            {/* ✅ ΤΡΟΠΟΠΟΙΗΘΗΚΕ: ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ με 2 υποστήλες (Έργα + Αποθεματικό) */}
            <TableHead className="text-center border font-bold text-xs text-white" colSpan={2} style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)"}}>
              <div className="flex items-center justify-center gap-1">
                ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ
                <span className="bg-red-600 text-white text-xs px-1 py-0.5 rounded">Δ</span>
              </div>
            </TableHead>
            <TableHead className="text-center border font-bold text-xs" style={{background: "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)", color: "white"}}>ΠΛΗΡΩΤΕΟ ΠΟΣΟ</TableHead>
          </TableRow>
          <TableRow className="bg-gray-100">
            <TableHead className="text-center border"></TableHead>
            <TableHead className="text-center border"></TableHead>
            <TableHead className="text-center border"></TableHead>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 υπο-στήλες χιλιοστών + ΔΙΑΧΕΙΡΙΣΗ */}
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>Κ/ΧΡΗΣΤΑ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΑΝΕΛ/ΡΑΣ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #ea580c 0%, #c2410c 100%)", fontSize: "10px", width: "80px"}}>ΘΕΡΜ/ΣΗ</TableHead>
            {/* ✅ ΝΕΟ: 2 υπο-στήλες για δαπάνες ιδιοκτητών */}
            <TableHead className="text-center border text-white" style={{background: "linear-gradient(135deg, #059669 0%, #047857 100%)", fontSize: "10px", width: "100px"}}>ΕΡΓΑ</TableHead>
            <TableHead className="text-center border text-white" style={{background: "#048C63", fontSize: "10px", width: "100px"}}>ΑΠΟΘΕΜΑΤΙΚΟ</TableHead>
            <TableHead className="text-center border"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sharesArray.map((share) => {
            const apartmentData = aptWithFinancial.find(apt => (apt as any).apartment_id === share.apartment_id);
            const commonMills = apartmentData?.participation_mills ?? toNumber(share.participation_mills);
            const breakdown = share.breakdown || {};
            const elevatorAmount = toNumber(breakdown.elevator_expenses || 0);
            const heatingAmount = toNumber(breakdown.heating_expenses || 0);
            const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0 && Object.values(expenseBreakdown).some(v => v > 0)) ? toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000) : 0;
            
            // Fix: Show positive previous balance amounts
            const previousBalance = Math.abs(apartmentData?.previous_balance ?? 0);
            
            // ✅ ΔΙΟΡΘΩΣΗ: Χρήση resident_expenses και owner_expenses από API (ήδη διαχωρισμένα)
            // Αυτά ΗΔΗ εξαιρούν το αποθεματικό και τα management fees όπου χρειάζεται
            const residentExpensesTotal = toNumber((apartmentData as any)?.resident_expenses || 0);
            const ownerExpensesTotal = toNumber((apartmentData as any)?.owner_expenses || 0);
            
            // Κ/ΧΡΗΣΤΑ = Δαπάνες ενοίκων (ΗΔΗ διαχωρισμένες από το API, ΔΕΝ περιλαμβάνουν owner expenses)
            // Αφαιρούμε ΜΟΝΟ το αποθεματικό (που είναι owner expense)
            const commonAmountWithoutReserve = residentExpensesTotal - apartmentReserveFund;
            
            // ΕΡΓΑ = Owner expenses χωρίς αποθεματικό
            const ownerExpensesOnlyProjects = Math.max(0, ownerExpensesTotal - apartmentReserveFund);
            
            // ✅ ΤΕΛΙΚΟ ΠΛΗΡΩΤΕΟ ΠΟΣΟ: Περιλαμβάνει ΟΛΑ (ενοικιαστές + ιδιοκτήτες + αποθεματικό)
            // = Οφειλές + Κ/Χρήστα + Ανελκυστήρας + Θέρμανση + Έργα Ιδιοκτητών + Αποθεματικό
            const finalTotalWithFees = commonAmountWithoutReserve + elevatorAmount + heatingAmount + previousBalance + ownerExpensesOnlyProjects + apartmentReserveFund;

            return (
              <TableRow key={share.apartment_id}>
                <TableCell>{share.identifier || share.apartment_number}</TableCell>
                <TableCell>{share.owner_name || 'Μη καταχωρημένος'}</TableCell>
                <TableCell>{formatAmount(previousBalance)}€</TableCell>
                {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 cells για χιλιοστά + ΔΙΑΧΕΙΡΙΣΗ */}
                {/* ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ: Κ/ΧΡΗΣΤΑ ΧΩΡΙΣ αποθεματικό */}
                <TableCell>{formatAmount(commonAmountWithoutReserve)}</TableCell>
                <TableCell>{formatAmount(elevatorAmount)}</TableCell>
                <TableCell>{formatAmount(heatingAmount)}</TableCell>
                {/* ✅ ΝΕΟ: ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ - 2 cells (ΕΡΓΑ χωρίς αποθεματικό + ΑΠΟΘΕΜΑΤΙΚΟ) */}
                <TableCell className="font-semibold">{ownerExpensesOnlyProjects > 0 ? formatAmount(ownerExpensesOnlyProjects) + '€' : '-'}</TableCell>
                <TableCell>{apartmentReserveFund > 0 ? formatAmount(apartmentReserveFund) + '€' : '-'}</TableCell>
                {/* ΠΛΗΡΩΤΕΟ ΠΟΣΟ: Bold με € */}
                <TableCell className="font-bold">{formatAmount(finalTotalWithFees)}€</TableCell>
              </TableRow>
            );
          })}
          <TableRow className="bg-gray-100 font-bold">
            <TableCell colSpan={2}>ΣΥΝΟΛΑ</TableCell>
            <TableCell>{formatAmount(sharesArray.reduce((s, a) => s + Math.abs(aptWithFinancial.find(apt => apt.id === a.apartment_id)?.previous_balance ?? 0), 0))}€</TableCell>
            {/* ✅ ΑΦΑΙΡΕΘΗΚΑΝ: 3 cells χιλιοστών */}
            {/* ΔΑΠΑΝΕΣ ΕΝΟΙΚΙΑΣΤΩΝ - Κ/ΧΡΗΣΤΑ από resident_expenses (ΔΕΝ περιλαμβάνει owner expenses) */}
            <TableCell>{formatAmount(
              sharesArray.reduce((sum, share) => {
                const apartmentData = aptWithFinancial.find(apt => (apt as any).apartment_id === share.apartment_id);
                const commonMills = apartmentData?.participation_mills ?? toNumber(share.participation_mills);
                const residentExpensesTotal = toNumber((apartmentData as any)?.resident_expenses || 0);
                const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0 && Object.values(expenseBreakdown).some(v => v > 0)) ? toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000) : 0;
                // ✅ ΔΙΟΡΘΩΣΗ: Χρήση resident_expenses (ΗΔΗ εξαιρεί owner expenses)
                return sum + (residentExpensesTotal - apartmentReserveFund);
              }, 0)
            )}€</TableCell>
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
            {/* ✅ ΑΦΑΙΡΕΘΗΚΕ: Cell ΔΙΑΧΕΙΡΙΣΗ (περιλαμβάνεται στο Κ/ΧΡΗΣΤΑ) */}
            {/* ✅ ΝΕΟ: ΔΑΠΑΝΕΣ ΙΔΙΟΚΤΗΤΩΝ - 2 cells (ΕΡΓΑ χωρίς αποθεματικό + ΑΠΟΘΕΜΑΤΙΚΟ) */}
            <TableCell className="font-semibold">{formatAmount(
              sharesArray.reduce((sum, share) => {
                const apartmentData = aptWithFinancial.find(apt => (apt as any).apartment_id === share.apartment_id);
                const commonMills = apartmentData?.participation_mills ?? toNumber(share.participation_mills);
                const ownerExpensesTotal = toNumber((apartmentData as any)?.owner_expenses || 0);
                const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0 && Object.values(expenseBreakdown).some(v => v > 0)) ? toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000) : 0;
                // ✅ ΔΙΟΡΘΩΣΗ: Αφαιρούμε το αποθεματικό από τα έργα
                const ownerExpensesOnlyProjects = ownerExpensesTotal - apartmentReserveFund;
                return sum + ownerExpensesOnlyProjects;
              }, 0)
            )}€</TableCell>
            <TableCell className="font-semibold">{formatAmount(reserveFundInfo.monthlyAmount)}€</TableCell>
            {/* ΠΛΗΡΩΤΕΟ ΠΟΣΟ: Περιλαμβάνει ΟΛΑ (+ αποθεματικό για συνολικό χρέος) */}
            <TableCell>{formatAmount(
              sharesArray.reduce((sum, share) => {
                const apartmentData = aptWithFinancial.find(apt => (apt as any).apartment_id === share.apartment_id);
                const commonMills = apartmentData?.participation_mills ?? toNumber(share.participation_mills);
                const breakdown = share.breakdown || {};
                const residentExpensesTotal = toNumber((apartmentData as any)?.resident_expenses || 0);
                const ownerExpensesTotal = toNumber((apartmentData as any)?.owner_expenses || 0);
                const elevatorAmount = toNumber(breakdown.elevator_expenses || 0);
                const heatingAmount = toNumber(breakdown.heating_expenses || 0);
                const previousBalance = Math.abs(apartmentData?.previous_balance ?? 0);
                const apartmentReserveFund = (reserveFundInfo.monthlyAmount > 0 && Object.values(expenseBreakdown).some(v => v > 0)) ? toNumber(reserveFundInfo.monthlyAmount) * (commonMills / 1000) : 0;
                // ✅ ΔΙΟΡΘΩΣΗ: Χρήση resident_expenses και owner_expenses (ΗΔΗ διαχωρισμένα)
                const commonAmountWithoutReserve = residentExpensesTotal - apartmentReserveFund;
                const ownerExpensesOnlyProjects = Math.max(0, ownerExpensesTotal - apartmentReserveFund);
                // ✅ ΤΕΛΙΚΟ: Προσθέτουμε και το apartmentReserveFund για συνολικό χρέος
                return sum + commonAmountWithoutReserve + elevatorAmount + heatingAmount + previousBalance + ownerExpensesOnlyProjects + apartmentReserveFund;
              }, 0)
            )}€</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
};
