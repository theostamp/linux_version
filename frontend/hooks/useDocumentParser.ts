import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    getDocumentUploads,
    uploadDocument,
    getDocumentUpload,
    confirmDocument,
    deleteDocument,
    bulkDeleteDocuments,
    cleanupStaleDocuments,
    retryDocumentProcessing,
    downloadDocument
} from '@/lib/api/documentParser';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export const useGetDocumentUploads = (page: number) => {
    return useQuery({
        queryKey: ['documentUploads', page],
        queryFn: () => getDocumentUploads(page),
        placeholderData: (previousData) => previousData,
    });
};

export const useGetDocumentUpload = (id: string | number) => {
    return useQuery({
        queryKey: ['documentUpload', id],
        queryFn: () => getDocumentUpload(id),
        enabled: !!id, // Το query θα εκτελεστεί μόνο αν υπάρχει id
    });
};

export const useUploadDocument = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ file, buildingId }: { file: File; buildingId: number }) => uploadDocument(file, buildingId),
        onSuccess: () => {
            toast.success('Το έγγραφο ανέβηκε επιτυχώς και τέθηκε σε επεξεργασία.');
            queryClient.invalidateQueries({ queryKey: ['documentUploads'] });
        },
        onError: (error) => {
            console.error("Upload error:", error);
            toast.error('Σφάλμα κατά το ανέβασμα του εγγράφου.');
        },
    });
};

export const useConfirmDocument = (id: string | number) => {
    const queryClient = useQueryClient();
    const router = useRouter();

    return useMutation({
        mutationFn: (data: Record<string, any>) => confirmDocument(id, data),
        onSuccess: () => {
            toast.success('Το παραστατικό επιβεβαιώθηκε και καταχωρήθηκε επιτυχώς.');
            // Ανανέωση λιστών για να φανούν οι αλλαγές
            queryClient.invalidateQueries({ queryKey: ['documentUploads'] });
            queryClient.invalidateQueries({ queryKey: ['documentUpload', id] });
            router.push('/documents'); // Επιστροφή στη λίστα παραστατικών
        },
        onError: (error: any) => {
            const errorMessage = error?.response?.data?.detail || 'Προέκυψε σφάλμα κατά την επιβεβαίωση.';
            toast.error(errorMessage);
        },
    });
};

export const useDeleteDocument = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string | number) => deleteDocument(id),
        onSuccess: () => {
            toast.success('Το έγγραφο διαγράφηκε επιτυχώς.');
            queryClient.invalidateQueries({ queryKey: ['documentUploads'] });
        },
        onError: (error: any) => {
            console.error("Delete error:", error);
            toast.error('Σφάλμα κατά τη διαγραφή του εγγράφου.');
        },
    });
};

export const useBulkDeleteDocuments = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (ids: number[]) => bulkDeleteDocuments(ids),
        onSuccess: (data) => {
            toast.success(`Διαγράφηκαν ${data.count} έγγραφα επιτυχώς.`);
            queryClient.invalidateQueries({ queryKey: ['documentUploads'] });
        },
        onError: (error: any) => {
            console.error("Bulk delete error:", error);
            toast.error('Σφάλμα κατά τη μαζική διαγραφή.');
        },
    });
};

export const useCleanupStaleDocuments = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (hours: number = 24) => cleanupStaleDocuments(hours),
        onSuccess: (data) => {
            toast.success(`Διαγράφηκαν ${data.count} παλιά έγγραφα.`);
            queryClient.invalidateQueries({ queryKey: ['documentUploads'] });
        },
        onError: (error: any) => {
            console.error("Cleanup error:", error);
            toast.error('Σφάλμα κατά τον καθαρισμό.');
        },
    });
};

export const useRetryDocumentProcessing = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string | number) => retryDocumentProcessing(id),
        onSuccess: () => {
            toast.success('Το έγγραφο τέθηκε ξανά σε επεξεργασία.');
            queryClient.invalidateQueries({ queryKey: ['documentUploads'] });
        },
        onError: (error: any) => {
            console.error("Retry error:", error);
            toast.error('Σφάλμα κατά την επανεκκίνηση της επεξεργασίας.');
        },
    });
};

export const useDownloadDocument = () => {
    return useMutation({
        mutationFn: ({ id, filename }: { id: string | number; filename: string }) =>
            downloadDocument(id, filename),
        onSuccess: () => {
            toast.success('Το έγγραφο κατέβηκε επιτυχώς.');
        },
        onError: (error: any) => {
            console.error("Download error:", error);
            toast.error('Σφάλμα κατά το κατέβασμα του εγγράφου.');
        },
    });
};
