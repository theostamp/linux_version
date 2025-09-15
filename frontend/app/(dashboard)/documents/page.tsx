'use client';

import { useState, useEffect } from 'react';
import {
    useGetDocumentUploads,
    useCleanupStaleDocuments,
    useBulkDeleteDocuments
} from '@/hooks/useDocumentParser';
import { DocumentUploadModal } from '@/components/DocumentUploadModal';
import { DocumentStatusLog, useDocumentLogs } from '@/components/DocumentStatusLog';
import { DocumentLogProvider } from '@/components/contexts/DocumentLogContext';
import { DocumentActions } from '@/components/documents/DocumentActions';
import { CeleryStatusIndicator } from '@/components/documents/CeleryStatusIndicator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
    FileText,
    Upload,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Eye,
    RefreshCw,
    Activity,
    Trash2,
    Download
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

const statusConfig = {
    pending: {
        label: 'Εκκρεμεί',
        icon: Clock,
        variant: 'secondary' as const,
        color: 'text-yellow-600',
    },
    processing: {
        label: 'Επεξεργασία',
        icon: RefreshCw,
        variant: 'default' as const,
        color: 'text-blue-600',
    },
    awaiting_confirmation: {
        label: 'Αναμονή Επιβεβαίωσης',
        icon: AlertTriangle,
        variant: 'outline' as const,
        color: 'text-orange-600',
    },
    completed: {
        label: 'Ολοκληρώθηκε',
        icon: CheckCircle,
        variant: 'default' as const,
        color: 'text-green-600',
    },
    failed: {
        label: 'Απέτυχε',
        icon: XCircle,
        variant: 'destructive' as const,
        color: 'text-red-600',
    },
};

export default function DocumentsPage() {
    const [page, setPage] = useState(1);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
    const [showBulkActions, setShowBulkActions] = useState(false);

    const { data, isLoading, isError, error, refetch } = useGetDocumentUploads(page);
    const { logs, addLog, clearLogs } = useDocumentLogs();
    const cleanupStale = useCleanupStaleDocuments();
    const bulkDelete = useBulkDeleteDocuments();

    // Προσθήκη logs για διάφορες ενέργειες
    const handleRefetch = () => {
        addLog('info', 'Ανανέωση λίστας παραστατικών', 'Φόρτωση νέων δεδομένων...');
        refetch();
    };

    const handleCleanupStale = async () => {
        const result = await cleanupStale.mutateAsync(24);
        addLog('success', 'Καθαρισμός παλιών εγγράφων', `Διαγράφηκαν ${result.count} έγγραφα`);
        refetch();
    };

    const handleBulkDelete = async () => {
        if (selectedDocuments.length === 0) return;
        const result = await bulkDelete.mutateAsync(selectedDocuments);
        addLog('success', 'Μαζική διαγραφή', `Διαγράφηκαν ${result.count} έγγραφα`);
        setSelectedDocuments([]);
        setShowBulkActions(false);
        refetch();
    };

    const toggleDocumentSelection = (id: number) => {
        setSelectedDocuments(prev =>
            prev.includes(id)
                ? prev.filter(docId => docId !== id)
                : [...prev, id]
        );
    };

    const selectAll = () => {
        const selectableIds = data?.results
            ?.filter(doc => ['pending', 'processing', 'failed', 'awaiting_confirmation'].includes(doc.status))
            ?.map(doc => doc.id) || [];
        setSelectedDocuments(selectableIds);
    };

    const clearSelection = () => {
        setSelectedDocuments([]);
    };

    const handleViewDocument = (document: any) => {
        addLog('info', 'Προβολή παραστατικού', `Άνοιγμα παραστατικού: ${document.original_filename}`, document.id, document.original_filename);
    };

    // Προσθήκη log όταν φορτώνει η σελίδα
    useEffect(() => {
        if (data) {
            addLog('success', 'Φόρτωση παραστατικών', `Φορτώθηκαν ${data.results.length} παραστατικά`);
        }
    }, [data, addLog]);

    // Προσθήκη log για errors
    useEffect(() => {
        if (isError) {
            addLog('error', 'Σφάλμα φόρτωσης', error?.message || 'Άγνωστο σφάλμα');
        }
    }, [isError, error, addLog]);

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getStatusConfig = (status: string) => {
        return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    };

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex justify-between items-center">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-10 w-40" />
                </div>
                <div className="grid gap-4">
                    {[...Array(5)].map((_, i) => (
                        <Skeleton key={i} className="h-24 w-full" />
                    ))}
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                        Δεν ήταν δυνατή η φόρτωση των εγγράφων. {error?.message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <DocumentLogProvider addLog={addLog}>
            <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold">Παραστατικά</h1>
                    <p className="text-muted-foreground">
                        Διαχείριση και επεξεργασία παραστατικών με AI
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <CeleryStatusIndicator />

                    {selectedDocuments.length > 0 && (
                        <div className="flex items-center space-x-2 border-l pl-2">
                            <span className="text-sm text-muted-foreground">
                                {selectedDocuments.length} επιλεγμένα
                            </span>
                            <Button
                                size="sm"
                                variant="destructive"
                                onClick={handleBulkDelete}
                            >
                                <Trash2 className="mr-1 h-3 w-3" />
                                Διαγραφή
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={clearSelection}
                            >
                                Καθαρισμός
                            </Button>
                        </div>
                    )}

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCleanupStale}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Καθαρισμός Παλιών
                    </Button>

                    <Button
                        variant="outline"
                        onClick={handleRefetch}
                        disabled={isLoading}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        Ανανέωση
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => setIsLogModalOpen(true)}
                        className="relative"
                    >
                        <Activity className="mr-2 h-4 w-4" />
                        Logs
                        {logs.length > 0 && (
                            <Badge
                                variant="destructive"
                                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
                            >
                                {logs.length}
                            </Badge>
                        )}
                    </Button>

                    <DocumentUploadModal>
                        <Button>
                            <Upload className="mr-2 h-4 w-4" />
                            Ανέβασμα Εγγράφου
                        </Button>
                    </DocumentUploadModal>
                </div>
            </div>

            {/* Technical Warning */}
            <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20">
                <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <AlertDescription className="text-orange-800 dark:text-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold">Τεχνική Προειδοποίηση - BETA</span>
                        <Badge variant="outline" className="text-orange-600 border-orange-300 dark:text-orange-400 dark:border-orange-600">
                            BETA
                        </Badge>
                    </div>
                    <p className="text-sm">
                        Αυτή η λειτουργία βρίσκεται σε δοκιμαστική φάση. Η επεξεργασία παραστατικών με AI μπορεί να έχει περιορισμούς 
                        στην ακρίβεια και την ταχύτητα. Παρακαλούμε να ελέγχετε προσεκτικά τα αποτελέσματα πριν την οριστικοποίηση.
                    </p>
                </AlertDescription>
            </Alert>

            {/* Documents List */}
            <div className="space-y-4">
                {data?.results?.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν παραστατικά</h3>
                            <p className="text-muted-foreground text-center mb-4">
                                Ανεβάστε το πρώτο σας παραστατικό για να ξεκινήσει η επεξεργασία με AI.
                            </p>
                            <DocumentUploadModal>
                                <Button>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Ανέβασμα Εγγράφου
                                </Button>
                            </DocumentUploadModal>
                        </CardContent>
                    </Card>
                ) : (
                    data?.results?.map((document) => {
                        const statusInfo = getStatusConfig(document.status);
                        const StatusIcon = statusInfo.icon;

                        const isSelectable = ['pending', 'processing', 'failed', 'awaiting_confirmation'].includes(document.status);
                        const isSelected = selectedDocuments.includes(document.id);

                        return (
                            <Card key={document.id} className={`hover:shadow-md transition-shadow ${isSelected ? 'ring-2 ring-primary' : ''}`}>
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            {isSelectable && (
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => toggleDocumentSelection(document.id)}
                                                />
                                            )}
                                            <div className="flex-shrink-0">
                                                <FileText className="h-8 w-8 text-muted-foreground" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold truncate">
                                                    {document.original_filename}
                                                </h3>
                                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                                    <span>{document.building.name}</span>
                                                    <span>•</span>
                                                    <span>{formatFileSize(document.file_size)}</span>
                                                    <span>•</span>
                                                    <span>
                                                        {format(new Date(document.created_at), 'dd/MM/yyyy HH:mm', { locale: el })}
                                                    </span>
                                                </div>
                                                {document.error_message && (
                                                    <p className="text-sm text-red-600 mt-1">
                                                        {document.error_message}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="flex items-center space-x-3">
                                            <Badge variant={statusInfo.variant} className={statusInfo.color}>
                                                <StatusIcon className="mr-1 h-3 w-3" />
                                                {statusInfo.label}
                                            </Badge>

                                            <DocumentActions
                                                document={document}
                                                onActionComplete={refetch}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>

            {/* Pagination */}
            {data && (data.next || data.previous) && (
                <div className="flex justify-center space-x-2">
                    <Button
                        variant="outline"
                        onClick={() => setPage(page - 1)}
                        disabled={!data.previous}
                    >
                        Προηγούμενη
                    </Button>
                    <span className="flex items-center px-4 text-sm text-muted-foreground">
                        Σελίδα {page}
                    </span>
                    <Button
                        variant="outline"
                        onClick={() => setPage(page + 1)}
                        disabled={!data.next}
                    >
                        Επόμενη
                    </Button>
                </div>
            )}

            {/* Status Log Modal */}
            <DocumentStatusLog
                isOpen={isLogModalOpen}
                onClose={() => setIsLogModalOpen(false)}
                logs={logs}
                onClearLogs={clearLogs}
            />
            </div>
        </DocumentLogProvider>
    );
}
