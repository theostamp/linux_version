// /frontend/components/LoginForm.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import useEnsureCsrf from '@/hooks/useEnsureCsrf';

// Utility function για την ανάγνωση cookie (παραμένει ως έχει)
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const regex = new RegExp(`(^| )${name}=([^;]+)`);
  const match = regex.exec(document.cookie);
  return match ? match[2] : null;
}

export default function LoginForm() {
  const router = useRouter();
  const csrfReady = useEnsureCsrf(); // Hook για εξασφάλιση CSRF

  const [email, setEmail] = useState(''); // Χρησιμοποιούμε email για το input field
  const [password, setPassword] = useState('');
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  // Διαβάζουμε το CSRF token από τα cookies μόλις είναι έτοιμο
  useEffect(() => {
    if (csrfReady) {
      setCsrfToken(getCookie('csrftoken'));
    }
  }, [csrfReady]);

  // Εμφάνιση μηνύματος φόρτωσης μέχρι να είναι έτοιμο το CSRF
  if (!csrfReady || !csrfToken) {
    return <div className="text-center mt-10 text-gray-500">🛡️ Φόρτωση ασφαλείας...</div>;
  }

  // Συνάρτηση που καλείται κατά την υποβολή της φόρμας
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Αποτροπή default συμπεριφοράς φόρμας

    // ✅ Χρήση της μεταβλητής περιβάλλοντος για το API URL
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!apiUrl) {
        // Σημαντικό: Έλεγχος αν έχει οριστεί το URL
        console.error("API URL is not defined in environment variables!");
        toast.error("Σφάλμα διαμόρφωσης: Δεν βρέθηκε το URL του API.");
        return; // Διακοπή αν δεν υπάρχει
    }

    // Έλεγχος αν το CSRF token είναι διαθέσιμο (πρόσθετη ασφάλεια)
    if (!csrfToken) {
        toast.error("Σφάλμα ασφαλείας. Παρακαλώ ανανεώστε τη σελίδα.");
        return;
    }

    // Log των δεδομένων που θα σταλούν (χρήσιμο για debugging)
    const loginPayload = { email, password }; // ✅ Στέλνουμε την τιμή του email ως username
    console.log("Attempting login with payload:", loginPayload);
    console.log("Using API URL:", apiUrl);
    console.log("Using CSRF Token:", csrfToken);

    try {
      const res = await fetch(`${apiUrl}/users/login/`, { // ✅ Χρήση apiUrl
        method: 'POST',
        credentials: 'include', // Απαραίτητο για cookies (sessionid, csrftoken)
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken, // Συμπερίληψη του CSRF token
        },
        body: JSON.stringify(loginPayload), // ✅ Χρήση του payload με username
      });

      const data = await res.json(); // Προσπάθεια ανάγνωσης της απάντησης ως JSON

      if (!res.ok) {
        router.refresh();      // αναγκάζει fetchUser
        router.push('/dashboard'); // μετά από refresh

        // Αν η απάντηση δεν είναι ΟΚ (π.χ., 401, 400, 500)
        // Προσπάθησε να πάρεις το μήνυμα λάθους από την απάντηση του backend, αλλιώς εμφάνισε γενικό μήνυμα
        const errorMessage = data?.detail ?? data?.error ?? `Σφάλμα ${res.status}: ${res.statusText}`;
        console.error("Login failed:", errorMessage, "Response data:", data);
        throw new Error(errorMessage);
      }

      // Επιτυχής σύνδεση
      toast.success('Επιτυχής σύνδεση!');
      // Καθαρισμός πεδίων (προαιρετικά)
      setEmail('');
      setPassword('');
      // Ανακατεύθυνση στο dashboard (ή όπου αλλού θέλεις)
      // router.push('/dashboard'); // Κάνε το redirect ενεργό όταν όλα λειτουργούν
      router.refresh(); // Κάνει refresh τα server components για να πάρουν τα νέα δεδομένα (π.χ., user state)
      // Ίσως χρειαστεί και push ανάλογα με τη ροή της εφαρμογής σου
       router.push('/dashboard');


    } catch (err: any) {
      // Διαχείριση σφαλμάτων δικτύου ή αυτών που προέκυψαν από το throw new Error παραπάνω
      console.error("Caught login error:", err);
      toast.error(err.message ?? 'Υπήρξε ένα μη αναμενόμενο σφάλμα.');
    }
  };

  // Το JSX της φόρμας (παραμένει ως έχει)
  return (
    <Card className="max-w-sm mx-auto mt-10 shadow-xl">
      <CardContent className="p-6 space-y-4">
        <h2 className="text-xl font-semibold text-center">Σύνδεση</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <Label htmlFor="email">Email (Username)</Label>
            <Input
              id="email"
              type="email" // Το input παραμένει type="email" για ευκολία χρήστη
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username" // Βοηθάει τους password managers
            />
          </div>
          <div>
            <Label htmlFor="password">Κωδικός</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password" // Βοηθάει τους password managers
            />
          </div>
          <Button type="submit" className="w-full" disabled={!csrfReady || !csrfToken}>
             {(!csrfReady || !csrfToken) ? 'Φόρτωση...' : 'Σύνδεση'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}