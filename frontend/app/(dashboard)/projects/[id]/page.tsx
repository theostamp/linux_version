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

interface Project {
  id: number;
  title: string;
  description?: string;
  status: string;
  project_type?: string;
  budget?: number;
}

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const projectId = useMemo(() => Number(params?.id), [params]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [confirm, setConfirm] = useState<{ open: boolean; action: 'start' | 'complete' | null }>({ open: false, action: null });
  const [isActing, setIsActing] = useState(false);

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId || !isFinite(projectId)) return;
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get(`/projects/projects/${projectId}/`);
        setProject(data);
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
          <Card>
            <CardHeader>
              <CardTitle>Επισκόπηση</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div>Περιγραφή: {project.description || '—'}</div>
                <div>Κατάσταση: {project.status}</div>
                {typeof project.budget === 'number' && (
                  <div>Προϋπολογισμός: €{project.budget.toLocaleString()}</div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement">
          <Card>
            <CardHeader>
              <CardTitle>Προμήθεια</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Σκελετός σελίδας (σύντομα).</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="offers">
          <ProjectOffersTab projectId={project.id} onApproved={async () => {
            try {
              const { data } = await api.get(`/projects/projects/${project.id}/`);
              setProject(data);
            } catch {}
          }} />
        </TabsContent>

        <TabsContent value="decisions">
          <ProjectRFQsTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="tasks">
          <ProjectMilestonesTab projectId={project.id} />
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardHeader>
              <CardTitle>Συμβόλαια</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Σκελετός συμβολαίων (σύντομα).</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Αρχεία</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Σκελετός αρχείων (σύντομα).</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardHeader>
              <CardTitle>Δραστηριότητα</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Σκελετός δραστηριότητας (σύντομα).</div>
            </CardContent>
          </Card>
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

function ProjectOffersTab({ projectId, onApproved }: { projectId: number; onApproved?: () => void }) {
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
            await makeRequestWithRetry({ method: 'post', url: `/projects/offers/${confirm.id}/approve/`, xToastSuppress: true } as any);
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

function ProjectMilestonesTab({ projectId }: { projectId: number }) {
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

function ProjectRFQsTab({ projectId }: { projectId: number }) {
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


