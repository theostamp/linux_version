'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Loader2, RefreshCw, Save, Download } from 'lucide-react';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import {
  generateAssemblyMinutes,
} from '@/lib/api';

import { useDownloadAssemblyMinutes, useGenerateMinutes, useUpdateAssembly } from '@/hooks/useAssemblies';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assemblyId: string;
};

export default function AssemblyMinutesModal({ open, onOpenChange, assemblyId }: Props) {
  const [minutesText, setMinutesText] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [chairmanName, setChairmanName] = useState('');
  const [secretaryName, setSecretaryName] = useState('');

  const generateMutation = useGenerateMinutes();
  const updateAssembly = useUpdateAssembly();
  const downloadMinutes = useDownloadAssemblyMinutes();

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['assembly-minutes', assemblyId],
    queryFn: () => generateAssemblyMinutes(assemblyId),
    enabled: open && !!assemblyId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const approved = !!data?.approved;
  const serverMinutesText = data?.minutes_text ?? '';

  // Initialize editor content on first load (or after regenerate), but don't clobber user edits.
  useEffect(() => {
    if (!open) return;
    if (!serverMinutesText) return;
    if (isDirty) return;
    setMinutesText(serverMinutesText);
  }, [open, serverMinutesText, isDirty]);

  // Reset dirty flag when closing
  useEffect(() => {
    if (open) return;
    setIsDirty(false);
    setChairmanName('');
    setSecretaryName('');
  }, [open]);

  const canSave = useMemo(() => (minutesText || '').trim().length > 0, [minutesText]);

  const handleRegenerate = async () => {
    const res = await generateMutation.mutateAsync({
      id: assemblyId,
      options: {
        chairman_name: chairmanName?.trim() || undefined,
        secretary_name: secretaryName?.trim() || undefined,
      },
    });
    setMinutesText(res.minutes_text || '');
    setIsDirty(false);
  };

  const handleSave = async () => {
    await updateAssembly.mutateAsync({
      id: assemblyId,
      payload: {
        minutes_text: minutesText,
      },
    });
    setIsDirty(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Πρακτικά Γενικής Συνέλευσης
          </DialogTitle>
          <DialogDescription>
            Αυτόματη δημιουργία πρακτικών με δυνατότητα επεξεργασίας, αποθήκευσης και εξαγωγής σε PDF.
          </DialogDescription>
        </DialogHeader>

        {/* Controls */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Πρόεδρος (προαιρετικό)</Label>
            <Input
              value={chairmanName}
              onChange={(e) => setChairmanName(e.target.value)}
              placeholder="π.χ. Γ. Παπαδόπουλος"
            />
          </div>
          <div className="space-y-2">
            <Label>Γραμματέας (προαιρετικό)</Label>
            <Input
              value={secretaryName}
              onChange={(e) => setSecretaryName(e.target.value)}
              placeholder="π.χ. Μ. Ιωάννου"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading || isFetching}
            >
              {(isLoading || isFetching) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Ανανέωση
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleRegenerate}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Δημιουργία / Επαναδημιουργία
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => downloadMinutes.mutate(assemblyId)}
              disabled={downloadMinutes.isPending}
            >
              {downloadMinutes.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Λήψη PDF
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={!canSave || updateAssembly.isPending}
              className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
            >
              {updateAssembly.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Αποθήκευση
            </Button>
          </div>
        </div>

        {/* Status */}
        <div className="text-sm text-muted-foreground">
          {approved ? 'Κατάσταση: Εγκεκριμένα' : 'Κατάσταση: Μη εγκεκριμένα'}
          {isDirty ? ' • Μη αποθηκευμένες αλλαγές' : ''}
          {isError ? ' • Σφάλμα φόρτωσης (δοκιμάστε Ανανέωση)' : ''}
        </div>

        {/* Editor */}
        <div className="space-y-2">
          <Label>Κείμενο Πρακτικών (Markdown)</Label>
          <Textarea
            value={minutesText}
            onChange={(e) => {
              setMinutesText(e.target.value);
              setIsDirty(true);
            }}
            placeholder="Τα πρακτικά θα εμφανιστούν εδώ..."
            className="min-h-[45vh] font-mono text-xs"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
