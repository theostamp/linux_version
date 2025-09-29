// frontend/components/LogoutButton.tsx
'use client';

import { Button } from "@/components/ui/button";    // Το UI component του κουμπιού (π.χ., από shadcn/ui)
import useLogout from "@/hooks/useLogout";          // Το custom hook που χειρίζεται τη λογική logout
import { cn } from "@/lib/utils";                    // Utility function για συνδυασμό CSS classes (συνήθως με shadcn/ui)

// Το component δέχεται πλέον ένα προαιρετικό className prop
export default function LogoutButton({ className }: { readonly className?: string }) {
  // Παίρνουμε τη συνάρτηση logout από το custom hook μας
  const logout = useLogout();

  // Αυτή η συνάρτηση καλείται όταν πατηθεί το κουμπί
  const handleLogout = async () => {
    // Απλά καλούμε τη συνάρτηση logout από το hook.
    // Το hook θα χειριστεί την κλήση στο API, την ενημέρωση του context
    // και την ανακατεύθυνση του χρήστη.
    await logout();
  };

  return (
    // Εφαρμόζουμε το className που λάβαμε ως prop,
    // συνδυάζοντάς το με τυχόν άλλες βασικές classes που θέλουμε, χρησιμοποιώντας το cn().
    // Αφαίρεσα το "w-full" από εδώ για να είναι πιο ευέλικτο - μπορείς να το προσθέσεις
    // μέσω του className όταν καλείς το component αν το θέλεις πάντα full width.
    <Button
      variant="outline" // ή όποιο variant προτιμάς ως προεπιλογή
      onClick={handleLogout}
      className={cn(className)} // Εφαρμογή του εξωτερικού className
    >
      Αποσύνδεση
    </Button>
  );
}