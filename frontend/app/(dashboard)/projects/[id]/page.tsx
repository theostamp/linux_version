'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isUnifiedProjectsEnabled } from '@/lib/featureFlags';

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

  useEffect(() => {
    const fetchProject = async () => {
      if (!projectId || !isFinite(projectId)) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        const json = await res.json();
        if (!res.ok || !json?.success) throw new Error(json?.error || 'Αποτυχία φόρτωσης έργου');
        setProject(json.data);
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
          <Button asChild variant="outline">
            <Link href="/projects">Πίσω</Link>
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Επισκόπηση</TabsTrigger>
          <TabsTrigger value="procurement">Προμήθεια</TabsTrigger>
          <TabsTrigger value="offers">Προσφορές</TabsTrigger>
          <TabsTrigger value="decisions">Αποφάσεις</TabsTrigger>
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
          <Card>
            <CardHeader>
              <CardTitle>Προσφορές</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Σκελετός λίστας προσφορών (σύντομα).</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions">
          <Card>
            <CardHeader>
              <CardTitle>Αποφάσεις</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Σκελετός αποφάσεων (σύντομα).</div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tasks">
          <Card>
            <CardHeader>
              <CardTitle>Εργασίες</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">Σκελετός εργασιών (σύντομα).</div>
            </CardContent>
          </Card>
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
    </div>
  );
}


