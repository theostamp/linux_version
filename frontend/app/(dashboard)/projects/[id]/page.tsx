'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { BackButton } from '@/components/ui/BackButton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isUnifiedProjectsEnabled } from '@/lib/featureFlags';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { api, makeRequestWithRetry } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import React from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PaymentFieldsLockAlert } from '@/components/projects/PaymentFieldsLockAlert';
import { ManualSyncExpensesButton } from '@/components/projects/ManualSyncExpensesButton';

interface Project {
  id: string | number;  // Support both UUID strings and numeric IDs
  title: string;
  description?: string;
  status: string;
  project_type?: string;
  budget?: number;
  payment_fields_locked?: boolean;
  payment_lock_reason?: string | null;
  expenses_count?: number;
}

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = params?.id; // Keep as string for UUID support
  const [project, setProject] = useState<Project | null>(null);
  const [acceptedOffer, setAcceptedOffer] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<{ open: boolean; action: 'start' | 'complete' | null }>({ open: false, action: null });
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/projects/projects/${projectId}/`);
        setProject(data);
        
        // Fetch accepted offer for overview
        try {
          const offersResp = await api.get('/projects/offers/', {
            params: { project: projectId, status: 'accepted' }
          });
          const acceptedOffers = offersResp.data.results || offersResp.data || [];
          if (acceptedOffers.length > 0) {
            setAcceptedOffer(acceptedOffers[0]);
          }
        } catch (e) {
          // Ignore if no accepted offer
        }
      } catch (err: any) {
        setError(err?.message ?? 'Σφάλμα φόρτωσης');
      } finally {
        setLoading(false);
      }
    };
    fetchProject();
  }, [projectId]);

  if (!isUnifiedProjectsEnabled()) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Η ενοποιημένη προβολή είναι απενεργοποιημένη.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (error) {
    return <div className="text-sm text-red-600">{error}</div>;
  }

  if (!project) {
    return <div className="text-sm text-muted-foreground">Δεν βρέθηκε έργο.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline">{project.status}</Badge>
            {project.project_type && <Badge variant="secondary">{project.project_type}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <BackButton href="/projects" />
          {project.status !== 'in_progress' && project.status !== 'completed' && (
            <Button variant="secondary" onClick={() => setConfirm({ open: true, action: 'start' })}>Έναρξη Έργου</Button>
          )}
          {project.status !== 'completed' && (
            <Button variant="destructive" onClick={() => setConfirm({ open: true, action: 'complete' })}>Ολοκλήρωση</Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="procurement">Προμήθεια</TabsTrigger>
          <TabsTrigger value="offers">Προσφορές</TabsTrigger>
          <TabsTrigger value="decisions">RFQs</TabsTrigger>
          <TabsTrigger value="tasks">Εργασίες</TabsTrigger>
          <TabsTrigger value="contracts">Συμβόλαια</TabsTrigger>
          <TabsTrigger value="files">Αρχεία</TabsTrigger>
          <TabsTrigger value="activity">Δραστηριότητα</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-4">
            {/* Payment Fields Lock Alert */}
            {project.payment_fields_locked && (
              <PaymentFieldsLockAlert
                isLocked={project.payment_fields_locked}
                reason={project.payment_lock_reason}
                expensesCount={project.expenses_count}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Επισκόπηση Έργου</span>
                  {/* Manual Sync Button - only show if payment fields are locked and there are expenses */}
                  {project.payment_fields_locked && project.expenses_count && project.expenses_count > 0 && (
                    <ManualSyncExpensesButton
                      projectId={String(project.id)}
                      expensesCount={project.expenses_count}
                      onSyncComplete={async () => {
                        // Refetch project data after sync
                        try {
                          const { data } = await api.get(`/projects/projects/${project.id}/`);
                          setProject(data);
                          toast({
                            title: 'Επιτυχής Ανανέωση',
                            description: 'Τα δεδομένα του έργου ανανεώθηκαν.'
                          });
                        } catch (e: any) {
                          console.error('Failed to refetch project:', e);
                        }
                      }}
                      size="sm"
                    />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="text-sm font-medium text-muted-foreground">Περιγραφή</div>
                    <div className="text-sm mt-1">{project.description || '—'}</div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Κατάσταση</div>
                      <div className="text-sm mt-1">{project.status}</div>
                    </div>
                    {typeof project.budget === 'number' && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Προϋπολογισμός</div>
                        <div className="text-sm mt-1">€{project.budget.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {acceptedOffer && (
              <Card>
                <CardHeader>
                  <CardTitle>Εγκεκριμένο Συμβόλαιο</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground">Ανάδοχος</div>
                      <div className="text-sm mt-1 font-semibold">{acceptedOffer.contractor_name}</div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Συμβατικό Ποσό</div>
                        <div className="text-lg font-bold text-blue-600 mt-1">
                          €{Number(acceptedOffer.amount).toLocaleString()}
                        </div>
                      </div>
                      
                      {acceptedOffer.advance_payment && Number(acceptedOffer.advance_payment) > 0 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Προκαταβολή</div>
                          <div className="text-lg font-bold text-green-600 mt-1">
                            €{Number(acceptedOffer.advance_payment).toLocaleString()}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {acceptedOffer.installments && acceptedOffer.installments > 1 && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Αριθμός Δόσεων</div>
                          <div className="text-sm mt-1">{acceptedOffer.installments}</div>
                        </div>
                      )}
                      {acceptedOffer.warranty_period && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Εγγύηση</div>
                          <div className="text-sm mt-1">{acceptedOffer.warranty_period}</div>
                        </div>
                      )}
                      {acceptedOffer.completion_time && (
                        <div>
                          <div className="text-sm font-medium text-muted-foreground">Χρόνος Ολοκλήρωσης</div>
                          <div className="text-sm mt-1">{acceptedOffer.completion_time}</div>
                        </div>
                      )}
                    </div>

                    {acceptedOffer.payment_terms && (
                      <div>
                        <div className="text-sm font-medium text-muted-foreground">Όροι Πληρωμής</div>
                        <div className="text-sm mt-1 whitespace-pre-wrap">{acceptedOffer.payment_terms}</div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="procurement">
          <ProjectProcurementTab projectId={String(project.id)} />
        </TabsContent>

        <TabsContent value="offers">
          <ProjectOffersTab projectId={String(project.id)} onApproved={async () => {
            try {
              const { data } = await api.get(`/projects/projects/${project.id}/`);
              setProject(data);
            } catch {}
          }} />
        </TabsContent>

        <TabsContent value="decisions">
          <ProjectRFQsTab projectId={String(project.id)} />
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectMilestonesTab projectId={String(project.id)} />
        </TabsContent>

        <TabsContent value="contracts">
          <ProjectContractsTab projectId={String(project.id)} />
        </TabsContent>

        <TabsContent value="files">
          <ProjectFilesTab projectId={String(project.id)} />
        </TabsContent>

        <TabsContent value="activity">
          <ProjectActivityTab projectId={String(project.id)} />
        </TabsContent>
      </Tabs>

      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm((s) => ({ ...s, open }))}
        title={confirm.action === 'start' ? 'Έναρξη Έργου;' : 'Ολοκλήρωση Έργου;'}
        description={confirm.action === 'start' ? 'Θέλετε να ξεκινήσει το έργο;' : 'Θέλετε να ολοκληρωθεί το έργο;'}
        confirmText={confirm.action === 'start' ? 'Έναρξη' : 'Ολοκλήρωση'}
        confirmVariant={confirm.action === 'start' ? 'secondary' : 'destructive'}
        isConfirmLoading={isActing}
        onConfirm={async () => {
          if (!project) return;
          try {
            setIsActing(true);
            const action = confirm.action === 'start' ? 'start' : 'complete';
            await makeRequestWithRetry({ method: 'post', url: `/projects/projects/${project.id}/${action}/`, xToastSuppress: true } as any);
            toast({ title: 'Επιτυχία', description: 'Η ενέργεια ολοκληρώθηκε.' });
            // refresh project
            const { data } = await api.get(`/projects/projects/${project.id}/`);
            setProject(data);
          } catch (e: any) {
            toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία ενέργειας' });
          } finally {
            setIsActing(false);
            setConfirm({ open: false, action: null });
          }
        }}
      />
    </div>
  );
}

function ProjectOffersTab({ projectId, onApproved }: { projectId: string; onApproved?: () => void }) {
  const { toast } = useToast();
  const [offers, setOffers] = React.useState<Array<{ id: number; amount: number; status: string; description: string; submitted_date: string }>>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [confirm, setConfirm] = React.useState<{ open: boolean; id: number | null }>({ open: false, id: null });
  const [isApproving, setIsApproving] = React.useState(false);
  const [refresh, setRefresh] = React.useState(0);

  React.useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await makeRequestWithRetry({ method: 'get', url: '/projects/offers/', params: { project: projectId } });
        const rows = Array.isArray(data) ? data : data.results ?? data.data ?? [];
        setOffers(rows);
      } catch (e: any) {
        setError(e?.message ?? 'Αποτυχία φόρτωσης προσφορών');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [projectId, refresh]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Προσφορές</CardTitle>
      </CardHeader>
      <CardContent>
        {loading && <div className="text-sm">Φόρτωση...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        {!loading && offers.length === 0 && (
          <div className="text-sm text-muted-foreground">Δεν υπάρχουν προσφορές.</div>
        )}
        <div className="grid gap-3">
          {offers.map((o) => (
            <div key={o.id} className="flex items-center justify-between border rounded p-3">
              <div className="text-sm">
                <div className="font-medium">Προσφορά #{o.id} — €{Number(o.amount).toLocaleString()}</div>
                <div className="text-muted-foreground">{o.description}</div>
                <div className="text-muted-foreground">{new Date(o.submitted_date).toLocaleDateString()} — {o.status}</div>
              </div>
              {o.status !== 'accepted' && (
                <Button size="sm" variant="secondary" onClick={() => setConfirm({ open: true, id: o.id })}>
                  Έγκριση
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirm.open}
        onOpenChange={(open) => setConfirm((s) => ({ ...s, open }))}
        title="Έγκριση Προσφοράς"
        description="Οι υπόλοιπες προσφορές θα απορριφθούν. Συνέχεια;"
        confirmText="Έγκριση"
        confirmVariant="secondary"
        isConfirmLoading={isApproving}
        onConfirm={async () => {
          if (!confirm.id) return;
          try {
            setIsApproving(true);

            // 🔴 ΚΡΙΣΙΜΟ ENDPOINT - ΜΗΝ ΑΛΛΑΞΕΤΕ
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            // ΣΩΣΤΟ: /projects/offers/{id}/approve/
            // ΛΑΘΟΣ: /projects/offers/{id}/ με PATCH
            //
            // Το approve endpoint:
            // 1. Εγκρίνει την προσφορά
            // 2. Δημιουργεί ScheduledMaintenance
            // 3. Δημιουργεί Expenses (δαπάνες)
            //
            // Δείτε: OFFER_PROJECT_EXPENSE_ARCHITECTURE.md
            // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            await makeRequestWithRetry({
              method: 'post',
              url: `/projects/offers/${confirm.id}/approve/`,  // ⚠️ ΚΡΙΣΙΜΟ: Χρήση του approve action
              xToastSuppress: true
            } as any);

            toast({ title: 'Επιτυχία', description: 'Η προσφορά εγκρίθηκε.' });
            setRefresh((n) => n + 1);
            onApproved && onApproved();
          } catch (e: any) {
            toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία έγκρισης' });
          } finally {
            setIsApproving(false);
            setConfirm({ open: false, id: null });
          }
        }}
      />
    </Card>
  );
}

function ProjectMilestonesTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [milestones, setMilestones] = React.useState<Array<{ id: number; title: string; status: string; due_at: string | null; amount: number | null }>>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refresh, setRefresh] = React.useState(0);
  const [title, setTitle] = React.useState('');
  const [dueAt, setDueAt] = React.useState<string>('');
  const [amount, setAmount] = React.useState<string>('');
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState<{ open: boolean; id: number | null }>({ open: false, id: null });

  const STATUS_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
    { value: 'pending', label: 'Σε εκκρεμότητα' },
    { value: 'in_progress', label: 'Σε εξέλιξη' },
    { value: 'awaiting_approval', label: 'Προς έγκριση' },
    { value: 'approved', label: 'Εγκρίθηκε' },
  ];

  const getProgressForStatus = (status: string): number => {
    switch (status) {
      case 'approved':
        return 100;
      case 'awaiting_approval':
        return 80;
      case 'in_progress':
        return 50;
      case 'pending':
      default:
        return 10;
    }
  };

  React.useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await makeRequestWithRetry({ method: 'get', url: '/projects/milestones/', params: { project: projectId }, });
        const rows = Array.isArray(data) ? data : data.results ?? data.data ?? [];
        setMilestones(rows);
      } catch (e: any) {
        setError(e?.message ?? 'Αποτυχία φόρτωσης ορόσημων');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [projectId, refresh]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = { project: projectId, title };
      if (dueAt) payload.due_at = new Date(dueAt).toISOString();
      if (amount) payload.amount = parseFloat(amount);
      await makeRequestWithRetry({ method: 'post', url: '/projects/milestones/', data: payload, xToastSuppress: true } as any);
      toast({ title: 'Επιτυχία', description: 'Το ορόσημο δημιουργήθηκε.' });
      setTitle('');
      setDueAt('');
      setAmount('');
      setRefresh((n) => n + 1);
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία δημιουργίας ορόσημου' });
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id: number, status: string) => {
    try {
      await makeRequestWithRetry({ method: 'patch', url: `/projects/milestones/${id}/`, data: { status }, xToastSuppress: true } as any);
      toast({ title: 'Ενημερώθηκε', description: 'Η κατάσταση ενημερώθηκε.' });
      setRefresh((n) => n + 1);
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία ενημέρωσης κατάστασης' });
    }
  };

  const deleteMilestone = async (id: number) => {
    try {
      setDeleting(true);
      await makeRequestWithRetry({ method: 'delete', url: `/projects/milestones/${id}/`, xToastSuppress: true } as any);
      toast({ title: 'Διαγράφηκε', description: 'Το ορόσημο διαγράφηκε.' });
      setRefresh((n) => n + 1);
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία διαγραφής' });
    } finally {
      setDeleting(false);
      setConfirmDelete({ open: false, id: null });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ορόσημα</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Τίτλος</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Π.χ. Έγκριση μελέτης" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Προθεσμία</label>
            <Input type="datetime-local" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ποσό (€)</label>
            <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Button type="submit" disabled={saving}>{saving ? 'Αποθήκευση…' : 'Προσθήκη'}</Button>
          </div>
        </form>

        {loading && <div className="text-sm">Φόρτωση...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}

        <div className="grid gap-3">
          {milestones.map((m) => {
            const isOverdue = !!m.due_at && m.status !== 'approved' && new Date(m.due_at).getTime() < Date.now();
            const isDueSoon = !!m.due_at && !isOverdue && (new Date(m.due_at).getTime() - Date.now()) <= 48 * 3600 * 1000;
            const progress = getProgressForStatus(m.status);
            return (
              <div key={m.id} className="flex flex-col gap-2 border rounded p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{m.title}</div>
                    <div className="text-muted-foreground">
                      {m.status} {m.due_at ? `— ${new Date(m.due_at).toLocaleString()}` : ''}
                    </div>
                    <div className="mt-2 h-2 bg-muted rounded">
                      <div className="h-2 bg-primary rounded" style={{ width: `${progress}%` }} />
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {isOverdue && <Badge variant="outline" className="text-red-600 border-red-600">Ληξιπρόθεσμο</Badge>}
                      {!isOverdue && isDueSoon && <Badge variant="outline">Λήγει σύντομα</Badge>}
                      {m.amount !== null && <span className="text-xs">€{Number(m.amount).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={m.status}
                      onChange={(e) => updateStatus(m.id, e.target.value)}
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <Button size="sm" variant="destructive" onClick={() => setConfirmDelete({ open: true, id: m.id })}>Διαγραφή</Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <ConfirmDialog
        open={confirmDelete.open}
        onOpenChange={(open) => setConfirmDelete((s) => ({ ...s, open }))}
        title="Διαγραφή Ορόσημου"
        description="Είστε βέβαιοι ότι θέλετε να διαγράψετε αυτό το ορόσημο;"
        confirmText="Διαγραφή"
        confirmVariant="destructive"
        isConfirmLoading={deleting}
        onConfirm={() => {
          if (confirmDelete.id) deleteMilestone(confirmDelete.id);
        }}
      />
    </Card>
  );
}

function ProjectRFQsTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [rfqs, setRfqs] = React.useState<Array<{ id: number; title: string; status: string; due_date: string | null }>>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [refresh, setRefresh] = React.useState(0);
  const [title, setTitle] = React.useState('');
  const [due, setDue] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data } = await makeRequestWithRetry({ method: 'get', url: '/projects/rfqs/', params: { project: projectId } });
        const rows = Array.isArray(data) ? data : data.results ?? data.data ?? [];
        setRfqs(rows);
      } catch (e: any) {
        setError(e?.message ?? 'Αποτυχία φόρτωσης RFQs');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [projectId, refresh]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload: any = { project: projectId, title };
      if (due) payload.due_date = new Date(due).toISOString().slice(0, 10);
      const resp = await makeRequestWithRetry({ method: 'post', url: '/projects/rfqs/', data: payload, xToastSuppress: true } as any);
      if (resp?.data?.id) {
        toast({ title: 'Επιτυχία', description: 'Το RFQ δημιουργήθηκε.' });
      }
      setTitle('');
      setDue('');
      setRefresh((n) => n + 1);
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e?.message ?? 'Αποτυχία δημιουργίας RFQ' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>RFQs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1">Τίτλος</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Π.χ. RFQ για ηλεκτρολογικά" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Προθεσμία</label>
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </div>
          <div>
            <Button type="submit" disabled={saving}>{saving ? 'Αποθήκευση…' : 'Δημιουργία RFQ'}</Button>
          </div>
        </form>

        {loading && <div className="text-sm">Φόρτωση...</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="grid gap-3">
          {rfqs.map((r) => (
            <div key={r.id} className="flex items-center justify-between border rounded p-3">
              <div className="text-sm">
                <div className="font-medium">{r.title}</div>
                <div className="text-muted-foreground">{r.status} {r.due_date ? `— ${new Date(r.due_date).toLocaleDateString()}` : ''}</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProjectProcurementTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [items, setItems] = React.useState<Array<any>>([]);
  const [loading, setLoading] = React.useState(true);
  const [refresh, setRefresh] = React.useState(0);
  const [itemName, setItemName] = React.useState('');
  const [quantity, setQuantity] = React.useState('');
  const [unitPrice, setUnitPrice] = React.useState('');
  const [supplier, setSupplier] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/projects/projects/${projectId}/`);
        const procurementItems = data.procurement_items || [];
        setItems(procurementItems);
      } catch (e: any) {
        toast({ title: 'Σφάλμα', description: 'Αποτυχία φόρτωσης στοιχείων' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId, refresh]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const newItem = {
        name: itemName,
        quantity: parseInt(quantity),
        unit_price: parseFloat(unitPrice),
        supplier: supplier,
        total: parseInt(quantity) * parseFloat(unitPrice)
      };

      const currentData = await api.get(`/projects/projects/${projectId}/`);
      const updatedItems = [...(currentData.data.procurement_items || []), newItem];

      await api.patch(`/projects/projects/${projectId}/`, {
        procurement_items: updatedItems
      });

      toast({ title: 'Επιτυχία', description: 'Το υλικό προστέθηκε' });
      setItemName('');
      setQuantity('');
      setUnitPrice('');
      setSupplier('');
      setRefresh(n => n + 1);
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: e?.message || 'Αποτυχία προσθήκης' });
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Προμήθεια Υλικών</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Υλικό</label>
            <Input
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              placeholder="Π.χ. Καλώδιο 3x2.5"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ποσότητα</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="10"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Τιμή/μονάδα (€)</label>
            <Input
              type="number"
              step="0.01"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="25.00"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Προμηθευτής</label>
            <Input
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="ΑΒΓ Α.Ε."
            />
          </div>
          <Button type="submit" disabled={saving}>
            {saving ? 'Προσθήκη...' : 'Προσθήκη'}
          </Button>
        </form>

        {loading ? (
          <div className="text-sm">Φόρτωση...</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground">Δεν υπάρχουν υλικά προμήθειας.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Υλικό</th>
                    <th className="text-right p-2">Ποσότητα</th>
                    <th className="text-right p-2">Τιμή/μον.</th>
                    <th className="text-right p-2">Σύνολο</th>
                    <th className="text-left p-2">Προμηθευτής</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{item.name}</td>
                      <td className="text-right p-2">{item.quantity}</td>
                      <td className="text-right p-2">€{item.unit_price?.toFixed(2)}</td>
                      <td className="text-right p-2 font-medium">€{item.total?.toFixed(2)}</td>
                      <td className="p-2">{item.supplier || '-'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td colSpan={3} className="p-2 text-right">Σύνολο:</td>
                    <td className="text-right p-2">€{totalAmount.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectContractsTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [contracts, setContracts] = React.useState<Array<any>>([]);
  const [loading, setLoading] = React.useState(true);
  const [selectedOffer, setSelectedOffer] = React.useState<any>(null);

  React.useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const offersResp = await api.get('/projects/offers/', {
          params: { project: projectId, status: 'accepted' }
        });
        const acceptedOffers = offersResp.data.results || offersResp.data || [];
        setContracts(acceptedOffers);

        if (acceptedOffers.length > 0) {
          setSelectedOffer(acceptedOffers[0]);
        }
      } catch (e: any) {
        toast({ title: 'Σφάλμα', description: 'Αποτυχία φόρτωσης συμβολαίων' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Συμβόλαια</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm">Φόρτωση...</div>
        ) : contracts.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Δεν υπάρχουν εγκεκριμένα συμβόλαια.
          </div>
        ) : (
          <div className="space-y-4">
            {selectedOffer && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold">Συμβόλαιο με {selectedOffer.contractor_name}</h3>
                    <Badge variant="outline" className="mt-1">Εγκεκριμένο</Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">€{Number(selectedOffer.amount).toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">Συμβατικό ποσό</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <div className="text-sm font-medium mb-1">Στοιχεία Συνεργείου</div>
                    <div className="text-sm space-y-1">
                      <div>Επωνυμία: {selectedOffer.contractor_name}</div>
                      {selectedOffer.contractor_contact && (
                        <div>Υπεύθυνος: {selectedOffer.contractor_contact}</div>
                      )}
                      {selectedOffer.contractor_phone && (
                        <div>Τηλ: {selectedOffer.contractor_phone}</div>
                      )}
                      {selectedOffer.contractor_email && (
                        <div>Email: {selectedOffer.contractor_email}</div>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-1">Όροι Πληρωμής</div>
                    <div className="text-sm space-y-1">
                      {selectedOffer.payment_method && (
                        <div>Τρόπος: {selectedOffer.payment_method}</div>
                      )}
                      {selectedOffer.installments > 1 && (
                        <div>Δόσεις: {selectedOffer.installments}</div>
                      )}
                      {selectedOffer.advance_payment && (
                        <div>Προκαταβολή: €{Number(selectedOffer.advance_payment).toLocaleString()}</div>
                      )}
                      {selectedOffer.warranty_period && (
                        <div>Εγγύηση: {selectedOffer.warranty_period}</div>
                      )}
                      {selectedOffer.completion_time && (
                        <div>Χρόνος ολοκλήρωσης: {selectedOffer.completion_time}</div>
                      )}
                    </div>
                  </div>
                </div>

                {selectedOffer.payment_terms && (
                  <div className="pt-4 border-t">
                    <div className="text-sm font-medium mb-1">Λεπτομερείς Όροι</div>
                    <div className="text-sm whitespace-pre-wrap">{selectedOffer.payment_terms}</div>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" size="sm">
                    Κατέβασμα PDF
                  </Button>
                  <Button variant="outline" size="sm">
                    Εκτύπωση
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectFilesTab({ projectId }: { projectId: string }) {
  const { toast } = useToast();
  const [files, setFiles] = React.useState<Array<any>>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const fetchFiles = async () => {
      setLoading(true);
      try {
        const offersResp = await api.get('/projects/offers/', { params: { project: projectId } });
        const offers = offersResp.data.results || offersResp.data || [];

        const allFiles: any[] = [];
        for (const offer of offers) {
          if (offer.files && offer.files.length > 0) {
            allFiles.push(...offer.files.map((f: any) => ({
              ...f,
              offer_name: offer.contractor_name
            })));
          }
        }
        setFiles(allFiles);
      } catch (e: any) {
        toast({ title: 'Σφάλμα', description: 'Αποτυχία φόρτωσης αρχείων' });
      } finally {
        setLoading(false);
      }
    };
    fetchFiles();
  }, [projectId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name);
        formData.append('file_type', file.type);
        formData.append('file_size', String(file.size));

        toast({ title: 'Επιτυχία', description: `Το αρχείο ${file.name} θα ανέβει σύντομα` });
      }
    } catch (e: any) {
      toast({ title: 'Σφάλμα', description: 'Αποτυχία ανεβάσματος' });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Αρχεία Έργου</CardTitle>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <Button
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? 'Ανέβασμα...' : 'Ανέβασμα Αρχείων'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm">Φόρτωση...</div>
        ) : files.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            Δεν υπάρχουν αρχεία για αυτό το έργο.
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                    📄
                  </div>
                  <div>
                    <div className="font-medium text-sm">{file.filename}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(file.file_size || 0)} • {file.offer_name || 'Άγνωστο'}
                    </div>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Κατέβασμα
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectActivityTab({ projectId }: { projectId: string }) {
  const [activities, setActivities] = React.useState<Array<any>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchActivity = async () => {
      setLoading(true);
      try {
        const projectResp = await api.get(`/projects/projects/${projectId}/`);
        const offersResp = await api.get('/projects/offers/', { params: { project: projectId } });

        const project = projectResp.data;
        const offers = offersResp.data.results || offersResp.data || [];

        const activityList: any[] = [];

        // Project creation
        activityList.push({
          id: 'created',
          type: 'project_created',
          date: project.created_at,
          title: 'Δημιουργία έργου',
          description: `Το έργο "${project.title}" δημιουργήθηκε`,
          icon: '🆕',
          user: project.created_by_name || 'Σύστημα'
        });

        // Offers
        offers.forEach((offer: any) => {
          activityList.push({
            id: `offer-${offer.id}`,
            type: 'offer_submitted',
            date: offer.submitted_at,
            title: 'Υποβολή προσφοράς',
            description: `Προσφορά από ${offer.contractor_name} - €${Number(offer.amount).toLocaleString()}`,
            icon: '💰',
            user: offer.contractor_name
          });

          if (offer.status === 'accepted' && offer.reviewed_at) {
            activityList.push({
              id: `offer-accepted-${offer.id}`,
              type: 'offer_accepted',
              date: offer.reviewed_at,
              title: 'Έγκριση προσφοράς',
              description: `Εγκρίθηκε η προσφορά του ${offer.contractor_name}`,
              icon: '✅',
              user: offer.reviewed_by_name || 'Σύστημα'
            });
          }
        });

        // Status changes
        if (project.status === 'in_progress') {
          activityList.push({
            id: 'started',
            type: 'project_started',
            date: project.updated_at,
            title: 'Έναρξη έργου',
            description: 'Το έργο ξεκίνησε',
            icon: '🚀',
            user: 'Σύστημα'
          });
        }

        if (project.status === 'completed') {
          activityList.push({
            id: 'completed',
            type: 'project_completed',
            date: project.updated_at,
            title: 'Ολοκλήρωση έργου',
            description: 'Το έργο ολοκληρώθηκε επιτυχώς',
            icon: '🎉',
            user: 'Σύστημα'
          });
        }

        // Sort by date
        activityList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setActivities(activityList);
      } catch (e: any) {
        console.error('Σφάλμα φόρτωσης activity:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchActivity();
  }, [projectId]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `Πριν ${diffMins} λεπτά`;
    if (diffHours < 24) return `Πριν ${diffHours} ώρες`;
    if (diffDays < 30) return `Πριν ${diffDays} ημέρες`;

    return date.toLocaleDateString('el-GR');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ιστορικό Δραστηριότητας</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm">Φόρτωση...</div>
        ) : activities.length === 0 ? (
          <div className="text-sm text-muted-foreground">Δεν υπάρχει δραστηριότητα.</div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-4">
                <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-lg">
                  {activity.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="font-medium text-sm">{activity.title}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(activity.date)}</div>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{activity.description}</div>
                  <div className="text-xs text-muted-foreground mt-1">από {activity.user}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


