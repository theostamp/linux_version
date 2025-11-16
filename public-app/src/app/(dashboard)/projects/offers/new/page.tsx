'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Building as BuildingIcon, FileText, HandCoins, ShieldCheck } from 'lucide-react';
import { getActiveBuildingId } from '@/lib/api';
import type { Project } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useProjects } from '@/hooks/useProjects';
import { useOfferMutations } from '@/hooks/useOffers';
import AuthGate from '@/components/AuthGate';
import SubscriptionGate from '@/components/SubscriptionGate';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import { BackButton } from '@/components/ui/BackButton';
import { Badge } from '@/components/ui/badge';

type OfferFormState = {
  project: string;
  contractor_name: string;
  contractor_contact: string;
  contractor_phone: string;
  contractor_email: string;
  contractor_address: string;
  amount: string;
  description: string;
  payment_terms: string;
  payment_method: string;
  installments: string;
  advance_payment: string;
  warranty_period: string;
  completion_time: string;
};

const PAYMENT_METHODS = [
  { value: 'one_time', label: 'Εφάπαξ πληρωμή' },
  { value: 'installments', label: 'Δόσεις' },
  { value: 'milestones', label: 'Ορόσημα έργου' },
  { value: 'other', label: 'Άλλο' },
];

const COMPLETION_TIMES = [
  '2 εβδομάδες',
  '1 μήνας',
  '2 μήνες',
  '3 μήνες',
  'Άλλο',
];

const INITIAL_FORM: OfferFormState = {
  project: '',
  contractor_name: '',
  contractor_contact: '',
  contractor_phone: '',
  contractor_email: '',
  contractor_address: '',
  amount: '',
  description: '',
  payment_terms: '',
  payment_method: 'one_time',
  installments: '',
  advance_payment: '',
  warranty_period: '',
  completion_time: '',
};

function NewOfferPageContent() {
  const router = useRouter();
  const { toast } = useToast();
  const { buildings, selectedBuilding, setSelectedBuilding } = useBuilding();
  const defaultBuildingId = selectedBuilding?.id ?? getActiveBuildingId();
  const [formState, setFormState] = useState<OfferFormState>({
    ...INITIAL_FORM,
    project: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!selectedBuilding && buildings.length > 0) {
      setSelectedBuilding(buildings[0]);
    }
  }, [selectedBuilding, buildings, setSelectedBuilding]);

  // Auto-validate installments when payment_method changes
  useEffect(() => {
    if (formState.payment_method === 'installments') {
      validateField('installments', formState.installments);
    } else {
      // Clear installments error if payment_method is not installments
      if (fieldErrors.installments) {
        setFieldErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.installments;
          return newErrors;
        });
      }
    }
  }, [formState.payment_method]);

  const handleFieldChange = (field: keyof OfferFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFieldBlur = (field: keyof OfferFormState) => {
    validateField(field, formState[field]);
  };

  const buildingId = selectedBuilding?.id ?? defaultBuildingId ?? null;

  const { projects, isLoading: projectsLoading, isError: projectsError } = useProjects({
    buildingId: buildingId ?? undefined,
    pageSize: 1000,
  });

  const selectedProject = projects.find((project) => project.id === Number(formState.project));

  const { create: createOffer } = useOfferMutations();

  const handleSubmit = async () => {
      if (!formState.project || !formState.project.trim()) {
        throw new Error('Πρέπει να επιλέξετε έργο');
      }
      
      const projectId = parseInt(formState.project, 10);
      if (Number.isNaN(projectId) || projectId <= 0) {
        throw new Error('Μη έγκυρο έργο');
      }
      
      const payload: Record<string, any> = {
        project: projectId,
        contractor_name: formState.contractor_name.trim(),
        description: formState.description.trim() || '',
        payment_method: formState.payment_method || 'one_time',
      };

      // Only include optional fields if they have values
      if (formState.contractor_contact?.trim()) {
        payload.contractor_contact = formState.contractor_contact.trim();
      }
      if (formState.contractor_phone?.trim()) {
        payload.contractor_phone = formState.contractor_phone.trim();
      }
      if (formState.contractor_email?.trim()) {
        payload.contractor_email = formState.contractor_email.trim();
      }
      if (formState.contractor_address?.trim()) {
        payload.contractor_address = formState.contractor_address.trim();
      }
      if (formState.amount && !Number.isNaN(parseFloat(formState.amount))) {
        payload.amount = parseFloat(formState.amount);
      }
      if (formState.payment_terms?.trim()) {
        payload.payment_terms = formState.payment_terms.trim();
      }
      if (formState.installments && !Number.isNaN(parseInt(formState.installments, 10))) {
        payload.installments = parseInt(formState.installments, 10);
      }
      if (formState.advance_payment && !Number.isNaN(parseFloat(formState.advance_payment))) {
        payload.advance_payment = parseFloat(formState.advance_payment);
      }
      if (formState.warranty_period?.trim()) {
        payload.warranty_period = formState.warranty_period.trim();
      }
      if (formState.completion_time?.trim()) {
        payload.completion_time = formState.completion_time.trim();
      }

      console.log('[New Offer] Payload:', JSON.stringify(payload, null, 2));
      return createOffer.mutateAsync(payload);
    };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || createOffer.isPending) return;
    
    try {
      await handleSubmit();
      toast({
        title: 'Η προσφορά δημιουργήθηκε',
        description: 'Η εργοληπτική προσφορά καταχωρήθηκε επιτυχώς.',
      });
      const destination = selectedProject?.id ? `/projects/${selectedProject.id}` : '/projects';
      router.push(destination);
    } catch (error: any) {
      console.error('[New Offer] Error:', error);
      console.error('[New Offer] Error response:', error?.response);
      console.error('[New Offer] Error body:', error?.response?.body);
      
      const message =
        error?.response?.body ||
        error?.message ||
        'Η αποθήκευση της προσφοράς απέτυχε. Παρακαλώ δοκιμάστε ξανά.';
      toast({
        title: 'Σφάλμα',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const validateField = (field: keyof OfferFormState, value: string) => {
    const errors: Record<string, string> = {};
    
    switch (field) {
      case 'project':
        if (!value || !value.trim()) {
          errors.project = 'Πρέπει να επιλέξετε έργο';
        }
        break;
      case 'contractor_name':
        if (!value || !value.trim()) {
          errors.contractor_name = 'Το όνομά του συνεργείου είναι υποχρεωτικό';
        }
        break;
      case 'amount':
        if (!value || value.trim() === '') {
          errors.amount = 'Το ποσό είναι υποχρεωτικό';
        } else {
          const num = parseFloat(value);
          if (Number.isNaN(num) || num <= 0) {
            errors.amount = 'Το ποσό πρέπει να είναι μεγαλύτερο από 0';
          }
        }
        break;
      case 'advance_payment':
        if (value && value.trim() !== '') {
          const num = parseFloat(value);
          const amount = parseFloat(formState.amount);
          if (!Number.isNaN(num) && !Number.isNaN(amount) && num > amount) {
            errors.advance_payment = 'Η προκαταβολή δεν μπορεί να είναι μεγαλύτερη από το συνολικό ποσό';
          }
        }
        break;
      case 'installments':
        if (formState.payment_method === 'installments' && (!value || value.trim() === '')) {
          errors.installments = 'Ο αριθμός δόσεων είναι υποχρεωτικός όταν ο τρόπος πληρωμής είναι "Δόσεις"';
        } else if (value && value.trim() !== '') {
          const num = parseInt(value, 10);
          if (Number.isNaN(num) || num <= 0) {
            errors.installments = 'Ο αριθμός δόσεων πρέπει να είναι μεγαλύτερος από 0';
          }
        }
        break;
    }
    
    setFieldErrors((prev) => ({ ...prev, ...errors }));
    return Object.keys(errors).length === 0;
  };

  const canSubmit = Boolean(
    formState.project &&
      formState.project.trim() &&
      !Number.isNaN(parseInt(formState.project, 10)) &&
      parseInt(formState.project, 10) > 0 &&
      formState.contractor_name.trim() &&
      formState.amount &&
      !Number.isNaN(parseFloat(formState.amount)) &&
      parseFloat(formState.amount) > 0 &&
      // If payment_method is installments, installments must be provided
      (formState.payment_method !== 'installments' || (formState.installments && formState.installments.trim() !== '' && !Number.isNaN(parseInt(formState.installments, 10)) && parseInt(formState.installments, 10) > 0)) &&
      Object.keys(fieldErrors).length === 0,
  );

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <BackButton href="/projects" label="Πίσω στα έργα" size="sm" />
            <Badge variant="outline" className="text-xs">
              Νέα προσφορά
            </Badge>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Καταχώρηση προσφοράς εργολάβου</h1>
          <p className="text-sm text-slate-500">
            Συνδέστε μία προσφορά με υπάρχον έργο για να συγκρίνετε κόστος &amp; όρους πληρωμής.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 text-sm text-slate-500">
          <Label className="text-xs uppercase text-slate-400">Ενεργό κτίριο</Label>
          <Select
            value={buildingId ? String(buildingId) : ''}
            onValueChange={(value) => {
              const building = buildings.find((b) => b.id === Number(value)) || null;
              setSelectedBuilding(building);
              setFormState((prev) => ({ ...prev, project: '' }));
            }}
          >
            <SelectTrigger className="w-64 bg-white/40 text-slate-800">
              <SelectValue placeholder="Επιλέξτε κτίριο" />
            </SelectTrigger>
            <SelectContent>
              {buildings.map((building) => (
                <SelectItem key={building.id} value={String(building.id)}>
                  {building.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!buildingId && (
        <Card className="border-dashed border-slate-300 bg-slate-50">
          <CardContent className="py-6 text-sm text-slate-600">
            Επιλέξτε κτίριο για να εμφανιστούν τα διαθέσιμα έργα. Μπορείτε να προσθέσετε κτίρια από την ενότητα
            &ldquo;Διαχείριση Κτιρίων&rdquo;.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Στοιχεία προσφοράς</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={handleFormSubmit}
              className="space-y-5"
            >
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Έργο</Label>
                  {projectsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Φόρτωση έργων...
                    </div>
                  ) : projectsError ? (
                    <p className="text-sm text-red-500">Αποτυχία φόρτωσης έργων. Προσπαθήστε ξανά.</p>
                  ) : projects.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Δεν υπάρχουν διαθέσιμα έργα για το κτίριο. Δημιουργήστε πρώτα ένα έργο.
                    </p>
                  ) : (
                    <>
                      <Select 
                        value={formState.project} 
                        onValueChange={(value) => handleFieldChange('project', value)}
                        onOpenChange={(open) => {
                          if (!open && formState.project) {
                            handleFieldBlur('project');
                          }
                        }}
                      >
                        <SelectTrigger className={fieldErrors.project ? 'border-red-500' : ''}>
                          <SelectValue placeholder="Επιλέξτε έργο" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={String(project.id)}>
                              {project.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {fieldErrors.project && (
                        <p className="text-sm text-red-500">{fieldErrors.project}</p>
                      )}
                    </>
                  )}
                </div>

                {selectedProject && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 space-y-2">
                    <div className="flex items-center gap-2 text-slate-800 font-medium">
                      <BuildingIcon className="w-4 h-4 text-indigo-500" />
                      {selectedProject.title}
                    </div>
                    <div className="grid gap-1 md:grid-cols-2">
                      <div>
                        <span className="text-xs uppercase text-slate-400">Προϋπολογισμός</span>
                        <p className="font-medium">{selectedProject.estimated_cost ? `${selectedProject.estimated_cost} €` : '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs uppercase text-slate-400">Προτεραιότητα</span>
                        <p className="font-medium capitalize">{selectedProject.priority ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Εταιρεία / Εργολάβος</Label>
                    <Input
                      placeholder="Π.χ. Εργοληπτική Α.Ε."
                      value={formState.contractor_name}
                      onChange={(e) => handleFieldChange('contractor_name', e.target.value)}
                      onBlur={() => handleFieldBlur('contractor_name')}
                      required
                      className={fieldErrors.contractor_name ? 'border-red-500' : ''}
                    />
                    {fieldErrors.contractor_name && (
                      <p className="text-sm text-red-500">{fieldErrors.contractor_name}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Υπεύθυνος επικοινωνίας</Label>
                    <Input
                      placeholder="Όνομα υπευθύνου"
                      value={formState.contractor_contact}
                      onChange={(e) => handleFieldChange('contractor_contact', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <Label>Τηλέφωνο</Label>
                    <Input
                      placeholder="+30 210 ..."
                      value={formState.contractor_phone}
                      onChange={(e) => handleFieldChange('contractor_phone', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      placeholder="contact@example.com"
                      value={formState.contractor_email}
                      onChange={(e) => handleFieldChange('contractor_email', e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Διεύθυνση εταιρείας</Label>
                    <Input
                      placeholder="Οδός, αριθμός"
                      value={formState.contractor_address}
                      onChange={(e) => handleFieldChange('contractor_address', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>
                      Ποσό προσφοράς <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="π.χ. 12500"
                      value={formState.amount}
                      onChange={(e) => handleFieldChange('amount', e.target.value)}
                      onBlur={() => handleFieldBlur('amount')}
                      required
                      className={fieldErrors.amount ? 'border-red-500' : ''}
                    />
                    {fieldErrors.amount && (
                      <p className="text-sm text-red-500">{fieldErrors.amount}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Προκαταβολή (€)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="π.χ. 2000"
                      value={formState.advance_payment}
                      onChange={(e) => handleFieldChange('advance_payment', e.target.value)}
                      onBlur={() => handleFieldBlur('advance_payment')}
                      className={fieldErrors.advance_payment ? 'border-red-500' : ''}
                    />
                    {fieldErrors.advance_payment && (
                      <p className="text-sm text-red-500">{fieldErrors.advance_payment}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Τρόπος πληρωμής</Label>
                    <Select
                      value={formState.payment_method}
                      onValueChange={(value) => handleFieldChange('payment_method', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Επιλογή" />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((method) => (
                          <SelectItem key={method.value} value={method.value}>
                            {method.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Αριθμός δόσεων</Label>
                    <Input
                      type="number"
                      min="1"
                      step="1"
                      placeholder="π.χ. 3"
                      value={formState.installments}
                      onChange={(e) => handleFieldChange('installments', e.target.value)}
                      onBlur={() => handleFieldBlur('installments')}
                      className={fieldErrors.installments ? 'border-red-500' : ''}
                    />
                    {fieldErrors.installments && (
                      <p className="text-sm text-red-500">{fieldErrors.installments}</p>
                    )}
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Χρόνος ολοκλήρωσης</Label>
                    <Select
                      value={formState.completion_time}
                      onValueChange={(value) => handleFieldChange('completion_time', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="π.χ. 2 μήνες" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMPLETION_TIMES.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Περίοδος εγγύησης</Label>
                    <Input
                      placeholder="π.χ. 12 μήνες"
                      value={formState.warranty_period}
                      onChange={(e) => handleFieldChange('warranty_period', e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Περιγραφή εργασιών</Label>
                  <Textarea
                    rows={4}
                    placeholder="Αναλυτική περιγραφή υλικών, εργασιών και χρονοδιαγράμματος"
                    value={formState.description}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label>Όροι πληρωμής / σημειώσεις</Label>
                  <Textarea
                    rows={3}
                    placeholder="Περιγράψτε τους όρους πληρωμής, τις παρατηρήσεις ή ειδικές απαιτήσεις"
                    value={formState.payment_terms}
                    onChange={(e) => handleFieldChange('payment_terms', e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => router.push('/projects')}>
                    Ακύρωση
                  </Button>
                  <Button type="submit" disabled={!canSubmit || createOffer.isPending}>
                    {createOffer.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Αποθήκευση...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        Καταχώρηση προσφοράς
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold">Συμβουλές αξιολόγησης</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-slate-600">
              <div className="flex items-start gap-3">
                <HandCoins className="w-4 h-4 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800">Συγκρίνετε τουλάχιστον 3 προσφορές</p>
                  <p>Συγκρίνετε όχι μόνο το κόστος αλλά και την ποιότητα υλικών &amp; παροχές.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-4 h-4 text-emerald-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800">Ζητήστε εγγύηση</p>
                  <p>Η εγγύηση πρέπει να καλύπτει υλικά και εργασία για συγκεκριμένη περίοδο.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="w-4 h-4 text-indigo-600 mt-0.5" />
                <div>
                  <p className="font-medium text-slate-800">Τεκμηριώστε τους όρους</p>
                  <p>Σημειώστε λεπτομερώς τους όρους πληρωμής και τις υποχρεώσεις.</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 text-white">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Συμβουλή</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-slate-200 space-y-3">
              <p>
                Μόλις εγκρίνετε μία προσφορά από το dashboard έργου, δημιουργούνται αυτόματα οι σχετικές δαπάνες και
                δόσεις για τα διαμερίσματα.
              </p>
              <Button
                variant="secondary"
                className="bg-white/10 hover:bg-white/20"
                onClick={() => router.push('/projects')}
              >
                Μετάβαση στα έργα
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function NewOfferPage() {
  return (
    <AuthGate role="any">
      <SubscriptionGate requiredStatus="any">
        <NewOfferPageContent />
      </SubscriptionGate>
    </AuthGate>
  );
}
