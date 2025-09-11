'use client';

import { useParams, useRouter } from 'next/navigation';
import { useGetDocumentUpload, useConfirmDocument } from '@/hooks/useDocumentParser';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, FileWarning, Loader2, ArrowLeft } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useForm, Controller } from 'react-hook-form';
import { useEffect } from 'react';
import Link from 'next/link';

// Helper για πιο ευανάγνωστα labels
const formatLabel = (key: string) => {
    const labelMap: Record<string, string> = {
        text: 'Κείμενο',
        amount: 'Ποσό',
        date: 'Ημερομηνία',
        supplier: 'Προμηθευτής',
        description: 'Περιγραφή',
        invoice_number: 'Αριθμός Τιμολογίου',
        vat_number: 'ΑΦΜ',
        total_amount: 'Συνολικό Ποσό',
        vat_amount: 'Ποσό ΦΠΑ',
        net_amount: 'Καθαρό Ποσό',
    };

    if (labelMap[key]) {
        return labelMap[key];
    }

    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, char => char.toUpperCase());
};

export default function DocumentReviewPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const { data: document, isLoading, isError, error } = useGetDocumentUpload(id);
    const confirmMutation = useConfirmDocument(id);

    const { control, handleSubmit, reset, watch } = useForm({
        defaultValues: document?.extracted_data || {},
    });

    // Ενημέρωση της φόρμας όταν τα δεδομένα είναι διαθέσιμα
    useEffect(() => {
        if (document?.extracted_data) {
            reset(document.extracted_data);
        }
    }, [document, reset]);

    const onSubmit = (data: any) => {
        confirmMutation.mutate(data);
    };

    if (isLoading) {
        return (
            <div className="container mx-auto p-4">
                <Skeleton className="h-8 w-1/2 mb-6" />
                <div className="grid md:grid-cols-2 gap-6">
                    <Skeleton className="h-[80vh]" />
                    <Skeleton className="h-[80vh]" />
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="container mx-auto p-4">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Σφάλμα</AlertTitle>
                    <AlertDescription>
                        Δεν ήταν δυνατή η φόρτωση του παραστατικού. {(error as Error)?.message}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!document) {
        return null;
    }

    if (document.status === 'pending' || document.status === 'processing') {
        return (
            <div className="container mx-auto p-4">
                <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Επεξεργασία σε εξέλιξη</AlertTitle>
                    <AlertDescription>
                        Το παραστατικό βρίσκεται σε επεξεργασία. Παρακαλώ περιμένετε...
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (document.status === 'failed') {
        return (
            <div className="container mx-auto p-4">
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Επεξεργασία απέτυχε</AlertTitle>
                    <AlertDescription>
                        {document.error_message || 'Η επεξεργασία του παραστατικού απέτυχε.'}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    if (document.status === 'completed' && !document.extracted_data) {
        return (
            <div className="container mx-auto p-4">
                <Alert>
                    <FileWarning className="h-4 w-4" />
                    <AlertTitle>Δεδομένα δεν διαθέσιμα</AlertTitle>
                    <AlertDescription>
                        Το παραστατικό επεξεργάστηκε επιτυχώς, αλλά δεν εξήχθησαν δεδομένα.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    const extractedData = document.extracted_data || {};
    const hasFormFields = Object.keys(extractedData).length > 0;

    return (
        <div className="container mx-auto p-4">
            {/* Header */}
            <div className="flex items-center space-x-4 mb-6">
                <Link href="/documents">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Επιστροφή
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold">
                        Έλεγχος & Επιβεβαίωση Παραστατικού
                    </h1>
                    <p className="text-muted-foreground">
                        {document.original_filename}
                    </p>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Document Preview */}
                <Card className="h-[80vh] overflow-hidden">
                    <CardHeader>
                        <CardTitle>Προεπισκόπηση Εγγράφου</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 h-full">
                        {document.original_file_url ? (
                            <iframe 
                                src={document.original_file_url} 
                                className="w-full h-full border-0" 
                                title={`Προεπισκόπηση παραστατικού ${id}`}
                            />
                        ) : (
                            <div className="flex items-center justify-center h-full text-muted-foreground">
                                <FileWarning className="h-12 w-12" />
                                <p className="ml-2">Προεπισκόπηση δεν διαθέσιμη</p>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Extracted Data Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Εξαγόμενα Δεδομένα</CardTitle>
                        {document.confidence_score && (
                            <p className="text-sm text-muted-foreground">
                                Αξιοπιστία: {(document.confidence_score * 100).toFixed(1)}%
                            </p>
                        )}
                    </CardHeader>
                    <CardContent>
                        {hasFormFields ? (
                            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                                {Object.keys(extractedData).map((key) => {
                                    const value = extractedData[key];
                                    
                                    // Skip complex objects and arrays
                                    if (typeof value === 'object' && value !== null) {
                                        return null;
                                    }

                                    return (
                                        <div key={key}>
                                            <Label htmlFor={key}>{formatLabel(key)}</Label>
                                            <Controller
                                                name={key}
                                                control={control}
                                                render={({ field }) => (
                                                    <Input 
                                                        id={key} 
                                                        {...field} 
                                                        disabled={confirmMutation.isPending}
                                                        placeholder={String(value || '')}
                                                    />
                                                )}
                                            />
                                        </div>
                                    );
                                })}
                                
                                <Button 
                                    type="submit" 
                                    className="w-full" 
                                    disabled={confirmMutation.isPending}
                                >
                                    {confirmMutation.isPending ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Επεξεργασία...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="mr-2 h-4 w-4" />
                                            Επιβεβαίωση & Καταχώρηση
                                        </>
                                    )}
                                </Button>
                            </form>
                        ) : (
                            <div className="text-center py-8">
                                <FileWarning className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                    Δεν εξήχθησαν δομημένα δεδομένα από το έγγραφο.
                                </p>
                                <p className="text-sm text-muted-foreground mt-2">
                                    Μπορείτε να δείτε το κείμενο που εξήχθη παρακάτω.
                                </p>
                            </div>
                        )}

                        {/* Raw Text Display */}
                        {extractedData.text && (
                            <div className="mt-6">
                                <Label>Εξαγόμενο Κείμενο</Label>
                                <div className="mt-2 p-4 bg-muted rounded-lg max-h-40 overflow-y-auto">
                                    <pre className="text-sm whitespace-pre-wrap">
                                        {extractedData.text}
                                    </pre>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
