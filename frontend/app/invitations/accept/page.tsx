'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { invitationApi } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MailCheck, Mail, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function AcceptInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  
  const [invitation, setInvitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
  });

  useEffect(() => {
    if (token) {
      verifyInvitation();
    } else {
      setLoading(false);
    }
  }, [token]);

  const verifyInvitation = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setVerifying(true);
    try {
      const result = await invitationApi.verify(token);
      if (result.valid && result.invitation) {
        setInvitation(result.invitation);
        // Pre-fill name if available from invitation email
        const emailParts = result.invitation.email.split('@')[0];
        if (emailParts && !formData.first_name && !formData.last_name) {
          const nameParts = emailParts.split('.');
          if (nameParts.length >= 2) {
            setFormData(prev => ({
              ...prev,
              first_name: nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1),
              last_name: nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1),
            }));
          }
        }
      } else {
        toast.error(result.error || 'Η πρόσκληση δεν είναι έγκυρη');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Σφάλμα επαλήθευσης πρόσκλησης';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setVerifying(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      toast.error('Λείπει το token πρόσκλησης');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Οι κωδικοί δεν ταιριάζουν');
      return;
    }

    setAccepting(true);
    try {
      const result = await invitationApi.accept({
        token,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone,
      });

      toast.success(result.message || 'Η πρόσκληση αποδεχτήθηκε επιτυχώς!');
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        router.push('/login?invitation_accepted=true');
      }, 2000);
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || error.response?.data?.detail || 'Αποτυχία αποδοχής πρόσκλησης';
      toast.error(errorMessage);
    } finally {
      setAccepting(false);
    }
  };

  if (loading || verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-gray-600">Επαλήθευση πρόσκλησης...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              Λείπει το Token
            </CardTitle>
            <CardDescription>
              Η πρόσκληση δεν είναι έγκυρη. Παρακαλώ χρησιμοποιήστε τον σύνδεσμο από το email.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Μετάβαση στη Σύνδεση</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invitation || invitation.status !== 'pending' || invitation.is_expired) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              {invitation?.is_expired ? 'Η Πρόσκληση Έληξε' : 'Μη Έγκυρη Πρόσκληση'}
            </CardTitle>
            <CardDescription>
              {invitation?.is_expired 
                ? 'Η πρόσκληση έχει λήξει. Επικοινωνήστε με τον διαχειριστή για νέα πρόσκληση.'
                : 'Αυτή η πρόσκληση δεν είναι πλέον έγκυρη ή έχει ήδη χρησιμοποιηθεί.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/login">
              <Button className="w-full">Μετάβαση στη Σύνδεση</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <MailCheck className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Αποδοχή Πρόσκλησης</CardTitle>
          <CardDescription>
            Συμπληρώστε τα στοιχεία σας για να αποκτήσετε πρόσβαση στην πλατφόρμα
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Invitation Info */}
          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">{invitation.email}</span>
              </div>
              {invitation.apartment_info && (
                <div className="text-blue-700">
                  <span className="font-medium">Διαμέρισμα:</span> {invitation.apartment_info.number}
                  {invitation.apartment_info.building && (
                    <> - {invitation.apartment_info.building}</>
                  )}
                </div>
              )}
              <div className="text-blue-700">
                <span className="font-medium">Ρόλος:</span> {invitation.invited_role === 'resident' ? 'Κάτοικος' : invitation.invited_role}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="first_name">Όνομα *</Label>
                <Input
                  id="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="last_name">Επώνυμο *</Label>
                <Input
                  id="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Τηλέφωνο</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="π.χ. +30 210 1234567"
              />
            </div>

            <div>
              <Label htmlFor="password">Κωδικός Πρόσβασης *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={8}
                placeholder="Ελάχιστο 8 χαρακτήρες"
              />
            </div>

            <div>
              <Label htmlFor="confirmPassword">Επιβεβαίωση Κωδικού *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={8}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Αποδοχή...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Αποδοχή Πρόσκλησης
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              Με την αποδοχή της πρόσκλησης, συμφωνείτε με τους{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Όρους Χρήσης
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

