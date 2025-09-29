'use client';

import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    MoreVertical,
    Trash2,
    Download,
    RefreshCw,
    Eye,
    CheckCircle
} from 'lucide-react';
import {
    useDeleteDocument,
    useRetryDocumentProcessing,
    useDownloadDocument
} from '@/hooks/useDocumentParser';
import Link from 'next/link';

interface DocumentActionsProps {
    document: {
        id: number;
        status: string;
        original_filename: string;
    };
    onActionComplete?: () => void;
}

export function DocumentActions({ document, onActionComplete }: DocumentActionsProps) {
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const deleteDocument = useDeleteDocument();
    const retryProcessing = useRetryDocumentProcessing();
    const downloadDocument = useDownloadDocument();

    const handleDelete = async () => {
        await deleteDocument.mutateAsync(document.id);
        setShowDeleteDialog(false);
        onActionComplete?.();
    };

    const handleRetry = async () => {
        await retryProcessing.mutateAsync(document.id);
        onActionComplete?.();
    };

    const handleDownload = async () => {
        await downloadDocument.mutateAsync({
            id: document.id,
            filename: document.original_filename
        });
    };

    const canDelete = ['pending', 'processing', 'failed', 'awaiting_confirmation'].includes(document.status);
    const canRetry = ['failed', 'pending'].includes(document.status);
    const canView = ['awaiting_confirmation', 'completed'].includes(document.status);

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ενέργειες</DropdownMenuLabel>
                    <DropdownMenuSeparator />

                    {canView && (
                        <Link href={`/documents/${document.id}/review`}>
                            <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                {document.status === 'awaiting_confirmation' ? 'Έλεγχος' : 'Προβολή'}
                            </DropdownMenuItem>
                        </Link>
                    )}

                    <DropdownMenuItem onClick={handleDownload}>
                        <Download className="mr-2 h-4 w-4" />
                        Κατέβασμα
                    </DropdownMenuItem>

                    {canRetry && (
                        <DropdownMenuItem onClick={handleRetry}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Επανεκκίνηση Επεξεργασίας
                        </DropdownMenuItem>
                    )}

                    {canDelete && (
                        <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={() => setShowDeleteDialog(true)}
                                className="text-red-600"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Διαγραφή
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Είστε σίγουροι;</AlertDialogTitle>
                        <AlertDialogDescription>
                            Θέλετε να διαγράψετε το έγγραφο &quot;{document.original_filename}&quot;;
                            Αυτή η ενέργεια δεν μπορεί να αναιρεθεί.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Ακύρωση</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Διαγραφή
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}