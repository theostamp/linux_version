'use client';

import { useState, useEffect } from 'react';
import { useGetDocumentUploads } from '@/hooks/useDocumentParser';
import { DocumentUploadModal } from '@/components/DocumentUploadModal';
import { DocumentStatusLog, useDocumentLogs } from '@/components/DocumentStatusLog';
import { DocumentLogProvider } from '@/components/contexts/DocumentLogContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
    FileText, 
    Upload, 
    Clock, 
    CheckCircle, 
    XCircle, 
    AlertTriangle,
    Eye,
    RefreshCw,
    Activity
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
    const { data, isLoading, isError, error, refetch } = useGetDocumentUploads(page);
    const { logs, addLog, clearLogs } = useDocumentLogs();

    // Προσθήκη logs για διάφορες ενέργειες
    const handleRefetch = () => {
        addLog('info', 'Ανανέωση λίστας παραστατικών', 'Φόρτωση νέων δεδομένων...');
        refetch();
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

                        return (
                            <Card key={document.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
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
                                            
                                            {document.status === 'awaiting_confirmation' && (
                                                <Link href={`/documents/${document.id}/review`}>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => handleViewDocument(document)}
                                                    >
                                                        <Eye className="mr-1 h-4 w-4" />
                                                        Έλεγχος
                                                    </Button>
                                                </Link>
                                            )}
                                            
                                            {document.status === 'completed' && (
                                                <Link href={`/documents/${document.id}/review`}>
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline"
                                                        onClick={() => handleViewDocument(document)}
                                                    >
                                                        <Eye className="mr-1 h-4 w-4" />
                                                        Προβολή
                                                    </Button>
                                                </Link>
                                            )}
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
