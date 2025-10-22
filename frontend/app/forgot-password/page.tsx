'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      toast.error('Παρακαλώ εισάγετε το email σας');
      return;
    }

    setIsLoading(true);

    try {
      // Call password reset API endpoint
      await api.post('/api/users/password-reset/', { email });

      setIsSuccess(true);
      toast.success('Οδηγίες επαναφοράς κωδικού στάλθηκαν στο email σας');
    } catch (error: any) {
      console.error('Password reset error:', error);

      // Show error but don't reveal if email exists (security)
      toast.error('Εάν το email υπάρχει, θα λάβετε οδηγίες επαναφοράς');

      // Still show success state for better UX (security best practice)
      setIsSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full shadow-xl">
          <CardContent className="p-8">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold mb-4">Έλεγξτε το Email σας</h2>
              <p className="text-gray-600 mb-6">
                Εάν το email <strong>{email}</strong> υπάρχει στο σύστημά μας,
                θα λάβετε οδηγίες για την επαναφορά του κωδικού σας.
              </p>
              <p className="text-sm text-gray-500 mb-6">
                Δεν λάβατε email; Ελέγξτε τον φάκελο spam ή προσπαθήστε ξανά σε λίγα λεπτά.
              </p>
              <div className="space-y-3">
                <Button
                  onClick={() => router.push('/login')}
                  className="w-full"
                  variant="default"
                >
                  Επιστροφή στη Σύνδεση
                </Button>
                <Button
                  onClick={() => setIsSuccess(false)}
                  className="w-full"
                  variant="outline"
                >
                  Αποστολή Ξανά
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full shadow-xl">
        <CardContent className="p-8">
          <button
            onClick={() => router.push('/login')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Επιστροφή στη Σύνδεση
          </button>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-center mb-2">Επαναφορά Κωδικού</h2>
            <p className="text-gray-600 text-center text-sm">
              Εισάγετε το email σας και θα σας στείλουμε οδηγίες για την επαναφορά του κωδικού σας.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your.email@example.com"
                  className="pl-10"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Αποστολή...
                </>
              ) : (
                <>
                  <Mail className="h-5 w-5 mr-2" />
                  Αποστολή Οδηγιών
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Θυμηθήκατε τον κωδικό σας;{' '}
              <button
                type="button"
                onClick={() => router.push('/login')}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Σύνδεση
              </button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
