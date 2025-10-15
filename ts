[1mdiff --git a/frontend/components/kiosk/widgets/ApartmentDebtsWidget.tsx b/frontend/components/kiosk/widgets/ApartmentDebtsWidget.tsx[m
[1mindex 2b0aea85..08e9ad8f 100644[m
[1m--- a/frontend/components/kiosk/widgets/ApartmentDebtsWidget.tsx[m
[1m+++ b/frontend/components/kiosk/widgets/ApartmentDebtsWidget.tsx[m
[36m@@ -123,19 +123,43 @@[m [mexport default function ApartmentDebtsWidget({ data, isLoading, error, settings,[m
   const showWarning = summary?.show_warning || false;[m
   const currentDay = summary?.current_day || new Date().getDate();[m
 [m
[32m+[m[32m  // GDPR: Mask surnames after 2nd letter[m
[32m+[m[32m  const maskName = (fullName: string): string => {[m
[32m+[m[32m    if (!fullName) return 'Μη καταχωρημένος';[m
[32m+[m[41m    [m
[32m+[m[32m    const parts = fullName.trim().split(' ');[m
[32m+[m[32m    if (parts.length === 1) return fullName; // Only first name[m
[32m+[m[41m    [m
[32m+[m[32m    // Keep first name, mask surname(s)[m
[32m+[m[32m    const firstName = parts[0];[m
[32m+[m[32m    const maskedSurnames = parts.slice(1).map(surname => {[m
[32m+[m[32m      if (surname.length <= 2) return surname;[m
[32m+[m[32m      return surname.substring(0, 2) + '****';[m
[32m+[m[32m    });[m
[32m+[m[41m    [m
[32m+[m[32m    return [firstName, ...maskedSurnames].join(' ');[m
[32m+[m[32m  };[m
[32m+[m
   return ([m
     <div className="h-full overflow-hidden flex flex-col">[m
       {/* Header */}[m
[31m-      <div className="flex items-center justify-between mb-2 pb-2 border-b border-indigo-400/30">[m
[31m-        <div className="flex items-center space-x-1.5">[m
[31m-          <Euro className="w-5 h-5 text-indigo-300" />[m
[31m-          <h2 className="text-base font-bold text-white">Κοινόχρηστα</h2>[m
[31m-        </div>[m
[31m-        <div className="text-right">[m
[31m-          <div className="text-xs text-indigo-300">[m
[31m-            €{totalExpenses.toFixed(0)}[m
[32m+[m[32m      <div className="mb-2 pb-2 border-b border-indigo-400/30">[m
[32m+[m[32m        <div className="flex items-center justify-between mb-1">[m
[32m+[m[32m          <div className="flex items-center space-x-1.5">[m
[32m+[m[32m            <Euro className="w-5 h-5 text-indigo-300" />[m
[32m+[m[32m            <h2 className="text-base font-bold text-white">Τα Κοινόχρηστα Συνοπτικά</h2>[m
[32m+[m[32m          </div>[m
[32m+[m[32m          <div className="text-right">[m
[32m+[m[32m            <div className="text-xs text-indigo-300">[m
[32m+[m[32m              €{totalExpenses.toFixed(0)}[m
[32m+[m[32m            </div>[m
           </div>[m
         </div>[m
[32m+[m[32m        {/* Info Note */}[m
[32m+[m[32m        <div className="text-[10px] text-indigo-300/80 leading-tight mt-1.5 px-0.5">[m
[32m+[m[32m          <p>Μπορείτε να δείτε την αναλυτική κατάσταση στο email που σας έχει σταλεί.</p>[m
[32m+[m[32m          <p className="mt-0.5">Μπορείτε επίσης να χρησιμοποιήσετε το QR code στο κινητό σας.</p>[m
[32m+[m[32m        </div>[m
       </div>[m
       [m
       {/* Expenses List */}[m
[36m@@ -149,23 +173,27 @@[m [mexport default function ApartmentDebtsWidget({ data, isLoading, error, settings,[m
         ) : ([m
           debts.map((apt: any) => {[m
             const amount = apt.displayAmount || apt.net_obligation || apt.current_balance;[m
[32m+[m[32m            const hasDebt = (apt.previous_balance || 0) > 0; // Orange if has previous debt[m
[32m+[m[32m            const maskedOwnerName = maskName(apt.owner_name);[m
 [m
             return ([m
               <div[m
                 key={apt.apartment_id}[m
[31m-                className="bg-indigo-900/20 backdrop-blur-sm p-2 rounded-lg border border-indigo-500/20 hover:border-indigo-400/40 transition-all"[m
[32m+[m[32m                className="bg-indigo-900/20 backdrop-blur-sm px-2 py-1.5 rounded-lg border border-indigo-500/20 hover:border-indigo-400/40 transition-all"[m
               >[m
[31m-                <div className="flex items-center justify-between">[m
[31m-                  <div className="flex items-center space-x-2 flex-1 min-w-0">[m
[31m-                    <span className="text-xs font-bold text-indigo-400">{apt.apartment_number}</span>[m
[31m-                    <p className="text-xs text-white truncate font-medium">[m
[31m-                      {apt.owner_name || 'Μη καταχωρημένος'}[m
[31m-                    </p>[m
[32m+[m[32m                <div className="flex items-center justify-between gap-2">[m
[32m+[m[32m                  <div className="flex items-center gap-1.5 flex-1 min-w-0">[m
[32m+[m[32m                    <span className="text-xs font-bold text-indigo-400 whitespace-nowrap">{apt.apartment_number}</span>[m
[32m+[m[32m                    <span className="text-xs text-white truncate font-medium leading-tight">[m
[32m+[m[32m                      {maskedOwnerName}[m
[32m+[m[32m                    </span>[m
                   </div>[m
[31m-                  <div className="text-right ml-2 flex-shrink-0">[m
[31m-                    <div className="text-sm font-semibold text-indigo-200">[m
[32m+[m[32m                  <div className="flex-shrink-0">[m
[32m+[m[32m                    <span className={`text-sm font-semibold whitespace-nowrap ${[m
[32m+[m[32m                      hasDebt ? 'text-orange-400' : 'text-indigo-200'[m
[32m+[m[32m                    }`}>[m
                       €{amount.toFixed(0)}[m
[31m-                    </div>[m
[32m+[m[32m                    </span>[m
                   </div>[m
                 </div>[m
               </div>[m
