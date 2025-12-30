'use client';

import * as React from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Loader2, Mail, Building2, Shield, CreditCard, RefreshCw, User as UserIcon, Bell, AlertTriangle } from 'lucide-react';
import { api } from '@/lib/api';
import type { User } from '@/types/user';
import { BentoGrid, BentoGridItem } from '@/components/ui/bento-grid';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { getEffectiveRole, getRoleLabel, hasOfficeAdminAccess } from '@/lib/roleUtils';
import { usePushNotifications } from '@/hooks/usePushNotifications';

import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

type ProfileFormState = {
  first_name: string;
  last_name: string;
  office_name: string;
  office_phone: string;
  office_address: string;
  office_bank_name: string;
  office_bank_account: string;
  office_bank_iban: string;
  office_bank_beneficiary: string;
};

const createFormState = (user?: User | null): ProfileFormState => ({
  first_name: user?.first_name || '',
  last_name: user?.last_name || '',
  office_name: user?.office_name || '',
  office_phone: user?.office_phone || '',
  office_address: user?.office_address || '',
  office_bank_name: user?.office_bank_name || '',
  office_bank_account: user?.office_bank_account || '',
  office_bank_iban: user?.office_bank_iban || '',
  office_bank_beneficiary: user?.office_bank_beneficiary || '',
});

export default function MyProfilePage() {
  const { data: user, isLoading, isError, refetch } = useQuery<User>({
    queryKey: ['my-profile'],
    queryFn: async () => api.get<User>('/users/me/'),
    staleTime: 60_000,
  });

  const [formState, setFormState] = React.useState<ProfileFormState>(createFormState());
  const [initialState, setInitialState] = React.useState<ProfileFormState>(createFormState());
  const [deleteEmail, setDeleteEmail] = React.useState('');
  const [deletePhrase, setDeletePhrase] = React.useState('');
  const [deletePassword, setDeletePassword] = React.useState('');
  const [deleteTenant, setDeleteTenant] = React.useState(false);
  const roleLabel = getRoleLabel(user);
  const normalizedRole = getEffectiveRole(user);
  const isAdminRole = hasOfficeAdminAccess(user);
  const canDeleteTenant = Boolean(
    user?.tenant && (normalizedRole === 'manager' || normalizedRole === 'superuser')
  );
  const { requestPermission, fcmToken, permission } = usePushNotifications();

  React.useEffect(() => {
    if (user) {
      const mapped = createFormState(user);
      setFormState(mapped);
      setInitialState(mapped);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: async (payload: ProfileFormState) => {
      console.log('[MyProfile] Updating user profile:', payload);
      const result = await api.patch<User>('/users/me/', payload);
      console.log('[MyProfile] ✓ Profile update successful:', result);
      return result;
    },
    onSuccess: (updatedUser) => {
      console.log('[MyProfile] Profile update confirmed, user data:', updatedUser);
      toast.success('Το προφίλ ενημερώθηκε με επιτυχία', {
        description: 'Οι αλλαγές αποθηκεύτηκαν στον server.',
      });
      const mapped = createFormState(updatedUser);
      setFormState(mapped);
      setInitialState(mapped);
      void refetch();
    },
    onError: (error: unknown) => {
      const err = error as { status?: number; message?: string; response?: { data?: { detail?: string } } };
      const message = err?.response?.data?.detail || err?.message || 'Σφάλμα κατά την ενημέρωση';
      toast.error(message);

      // If 401, suggest token clearing
      if (err?.status === 401) {
        toast.info('Το token έχει λήξει. Χρησιμοποίησε το κουμπί "Καθαρισμός token" για επανασύνδεση.');
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (payload: {
      password?: string;
      confirm_phrase: string;
      confirm_email: string;
      delete_tenant?: boolean;
    }) =>
      api.post<{
        warnings?: string[];
        tenant_deleted?: boolean;
        deleted_users?: number;
      }>('/users/profile/delete-account/', payload),
    onSuccess: (data) => {
      toast.success('Ο λογαριασμός διαγράφηκε οριστικά.');
      if (data?.warnings?.length) {
        toast.warning('Η συνδρομή δεν ακυρώθηκε πλήρως. Επικοινώνησε μαζί μας για έλεγχο.');
      }
      if (typeof window !== 'undefined') {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = '/login?deleted=1';
      }
    },
    onError: (error: unknown) => {
      const err = error as { message?: string; response?: { data?: { error?: string } } };
      const message = err?.response?.data?.error || err?.message || 'Αποτυχία διαγραφής λογαριασμού';
      toast.error(message);
    },
  });

  const handleChange = <Field extends keyof ProfileFormState>(field: Field) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const value = event.target.value;
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => setFormState(initialState);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user || mutation.isPending) return;
    mutation.mutate(formState);
  };

  const isPristine = React.useMemo(() => JSON.stringify(formState) === JSON.stringify(initialState), [formState, initialState]);
  const phraseNormalized = deletePhrase.trim().toUpperCase();
  const isPhraseValid = phraseNormalized === 'DELETE' || phraseNormalized === 'ΔΙΑΓΡΑΦΗ';
  const isEmailValid = Boolean(user?.email && deleteEmail.trim().toLowerCase() === user.email.toLowerCase());
  const isDeleteDisabled = !isPhraseValid || !isEmailValid || deleteMutation.isPending;
  const deleteLabel = deleteTenant && canDeleteTenant ? 'Διαγραφή λογαριασμού & workspace' : 'Διαγραφή λογαριασμού';

  const handleDeleteAccount = () => {
    if (!user || deleteMutation.isPending) return;
    const confirmText =
      deleteTenant && canDeleteTenant
        ? 'Η ενέργεια θα διαγράψει ΟΛΟ το workspace και όλους τους χρήστες. Θέλεις να συνεχίσεις;'
        : 'Η ενέργεια είναι μόνιμη. Θέλεις να συνεχίσεις;';
    if (!window.confirm(confirmText)) return;

    deleteMutation.mutate({
      password: deletePassword || undefined,
      confirm_phrase: deletePhrase.trim(),
      confirm_email: deleteEmail.trim(),
      delete_tenant: canDeleteTenant && deleteTenant,
    });
  };

  if (isLoading && !user) {
    return (
      <div className="flex h-full min-h-[40vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          <p>Φόρτωση στοιχείων χρήστη…</p>
        </div>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="flex h-full min-h-[40vh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-lg font-medium text-destructive">Δεν ήταν δυνατή η φόρτωση του προφίλ.</p>
        <Button onClick={() => refetch()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Προσπάθησε ξανά
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>

        {/* Header Action Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-card p-6 rounded-xl border border-slate-200/50 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-condensed text-foreground">Το προφίλ μου</h1>
            <p className="text-muted-foreground mt-1">Διατήρησε ενημερωμένα τα προσωπικά σου στοιχεία και τις πληροφορίες διαχείρισης.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={() => refetch()} disabled={isLoading}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Ανανέωση
            </Button>
            <Button type="submit" disabled={isPristine || mutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Αποθήκευση αλλαγών
            </Button>
          </div>
        </div>

        <BentoGrid className="max-w-[1920px] auto-rows-auto gap-6">

          {/* Basic Info */}
          <BentoGridItem
            className="md:col-span-2"
            title="Βασικές πληροφορίες"
            description="Στοιχεία λογαριασμού και προφίλ διαχειριστή"
            header={
              <div className="space-y-6 mt-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Όνομα</Label>
                    <Input id="first_name" value={formState.first_name} onChange={handleChange('first_name')} placeholder="Π.χ. Μαρία" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Επώνυμο</Label>
                    <Input id="last_name" value={formState.last_name} onChange={handleChange('last_name')} placeholder="Π.χ. Παπαδοπούλου" />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input id="email" className="pl-9" value={user.email} readOnly />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Ρόλος</Label>
                    <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm h-10">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>{roleLabel}</span>
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="office_name">Επωνυμία γραφείου</Label>
                    <Input id="office_name" value={formState.office_name} onChange={handleChange('office_name')} placeholder="Π.χ. Theo Concierge" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office_phone">Τηλέφωνο επικοινωνίας</Label>
                    <Input id="office_phone" value={formState.office_phone} onChange={handleChange('office_phone')} placeholder="+30 210 0000000" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office_address">Διεύθυνση γραφείου</Label>
                  <Textarea
                    id="office_address"
                    value={formState.office_address}
                    onChange={handleChange('office_address')}
                    placeholder="Οδός, αριθμός, πόλη, Τ.Κ."
                    rows={3}
                  />
                </div>
              </div>
            }
          />

          {/* Account Info */}
          <BentoGridItem
            className="md:col-span-1"
            title="Στοιχεία λογαριασμού"
            description="Ρυθμίσεις πρόσβασης και μισθωτή"
            header={
              <div className="space-y-4 mt-4 text-sm">
                <div className="flex items-center justify-between rounded-lg border bg-card/50 px-4 py-3">
                  <div>
                    <p className="text-xs uppercase text-muted-foreground font-semibold">Κατάσταση</p>
                    <p className="font-medium mt-1">{roleLabel}</p>
                  </div>
                  <Badge variant={isAdminRole ? 'default' : 'secondary'}>
                    {roleLabel}
                  </Badge>
                </div>
                <div className="space-y-1 rounded-lg border bg-card/50 px-4 py-3">
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Tenant</p>
                  {user.tenant ? (
                    <div className="flex items-center justify-between mt-1">
                      <div>
                        <p className="font-medium">{user.tenant.name}</p>
                        <p className="text-xs text-muted-foreground">{user.tenant.schema_name}</p>
                      </div>
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <p className="text-muted-foreground mt-1">Δεν βρέθηκε tenant.</p>
                  )}
                </div>
                <div className="space-y-1 rounded-lg border bg-card/50 px-4 py-3">
                  <p className="text-xs uppercase text-muted-foreground font-semibold">Όνομα χρήστη</p>
                  <div className="flex items-center gap-2 font-medium mt-1">
                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                    <span>{user.username}</span>
                  </div>
                </div>
              </div>
            }
          />

          {/* Banking Info */}
          <BentoGridItem
            className="md:col-span-2"
            title="Τραπεζικές πληροφορίες"
            description="Χρησιμοποιούνται σε ειδοποιήσεις πληρωμών"
            header={
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="office_bank_name">Τράπεζα</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="office_bank_name" className="pl-9" value={formState.office_bank_name} onChange={handleChange('office_bank_name')} />
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="office_bank_account">Αριθμός λογαριασμού</Label>
                    <Input id="office_bank_account" value={formState.office_bank_account} onChange={handleChange('office_bank_account')} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="office_bank_iban">IBAN</Label>
                    <Input id="office_bank_iban" value={formState.office_bank_iban} onChange={handleChange('office_bank_iban')} placeholder="GRxx xxxx xxxx xxxx xxxx xxxx xxx" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="office_bank_beneficiary">Δικαιούχος</Label>
                  <Input id="office_bank_beneficiary" value={formState.office_bank_beneficiary} onChange={handleChange('office_bank_beneficiary')} />
                </div>
              </div>
            }
          />

          {/* Notifications */}
          <BentoGridItem
            className="md:col-span-1"
            title="Ειδοποιήσεις"
            description="Ρυθμίσεις Push Notifications"
            header={
              <div className="space-y-4 mt-4 text-sm">
                <p className="text-muted-foreground">
                  Λάβετε ενημερώσεις για ανακοινώσεις και λογαριασμούς στο κινητό σας.
                </p>
                <Separator />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-muted-foreground" />
                    <span>Push Notifications</span>
                  </div>
                  {fcmToken ? (
                    <Badge variant="default" className="bg-green-600">Ενεργοποιημένες</Badge>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={requestPermission}
                      disabled={permission === 'denied'}
                    >
                      {permission === 'denied' ? 'Μπλοκαρισμένες' : 'Ενεργοποίηση'}
                    </Button>
                  )}
                </div>
                {permission === 'denied' && (
                  <p className="text-xs text-red-500 mt-2">
                    Οι ειδοποιήσεις έχουν αποκλειστεί από τον browser. Παρακαλώ ενεργοποιήστε τις από τις ρυθμίσεις της σελίδας.
                  </p>
                )}
              </div>
            }
          />

          {/* Quick Actions */}
          <BentoGridItem
            className="md:col-span-1"
            title="Γρήγορες ενέργειες"
            description="Επαναφορά και ασφάλεια"
            header={
              <div className="space-y-4 mt-4 text-sm">
                <p className="text-muted-foreground">
                  Σε περίπτωση που τα στοιχεία αυθεντικοποίησης έχουν λήξει, μπορείς να κάνεις επανασύνδεση από την σελίδα login ή να καθαρίσεις τα tokens.
                </p>
                <Separator />
                <div className="flex flex-col gap-3">
                  <Button type="button" variant="outline" onClick={handleReset} disabled={isPristine || mutation.isPending} className="w-full justify-start">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Επαναφορά αλλαγών
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      if (typeof window !== 'undefined') {
                        localStorage.removeItem('access_token');
                        localStorage.removeItem('refresh_token');
                        localStorage.removeItem('access');
                        localStorage.removeItem('refresh');
                        toast.success('Τα tokens διαγράφηκαν. Συνδέσου ξανά αν χρειαστεί.');
                      }
                    }}
                    className="w-full justify-start text-destructive hover:text-destructive/90"
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Καθαρισμός token
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => {
                      const target = document.getElementById('danger-zone');
                      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }}
                    className="w-full justify-start"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Μετάβαση στο Danger Zone
                  </Button>
                </div>
              </div>
            }
          />

        </BentoGrid>
      </form>

      <Card id="danger-zone" className="scroll-mt-24 border-destructive/50 bg-destructive/5">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            Η διαγραφή λογαριασμού είναι <strong>μόνιμη</strong> και δεν μπορεί να αναιρεθεί.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {canDeleteTenant ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
              <p className="font-medium text-destructive">Προσοχή: Διαγραφή ολόκληρου workspace</p>
              <p className="text-muted-foreground mt-1">
                Αν ενεργοποιήσεις αυτή την επιλογή, θα διαγραφούν όλα τα κτίρια, οι χρήστες και τα δεδομένα του tenant.
              </p>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={deleteTenant}
                  onChange={(event) => setDeleteTenant(event.target.checked)}
                />
                Διαγραφή ολόκληρου workspace
              </label>
            </div>
          ) : (
            <p className="text-muted-foreground">
              Θα διαγραφούν τα προσωπικά σου στοιχεία και η πρόσβαση στο σύστημα.
            </p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="delete-email">Επιβεβαίωσε το email σου</Label>
              <Input
                id="delete-email"
                value={deleteEmail}
                onChange={(event) => setDeleteEmail(event.target.value)}
                placeholder={user?.email}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delete-phrase">Πληκτρολόγησε “DELETE” ή “ΔΙΑΓΡΑΦΗ”</Label>
              <Input
                id="delete-phrase"
                value={deletePhrase}
                onChange={(event) => setDeletePhrase(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="delete-password">Κωδικός πρόσβασης</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              placeholder="Αν έχεις social login, άφησέ το κενό"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleteDisabled}
              onClick={handleDeleteAccount}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {deleteLabel}
            </Button>
            {!isPhraseValid && deletePhrase.trim().length > 0 && (
              <span className="text-xs text-destructive">Η φράση επιβεβαίωσης δεν είναι σωστή.</span>
            )}
            {deleteEmail.trim().length > 0 && !isEmailValid && (
              <span className="text-xs text-destructive">Το email δεν ταιριάζει.</span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
