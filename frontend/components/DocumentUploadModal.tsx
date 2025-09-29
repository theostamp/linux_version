'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useUploadDocument } from '@/hooks/useDocumentParser';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, File, X, Loader2, AlertCircle } from 'lucide-react';
import { useBuildings } from '../hooks/useBuildings';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useDocumentLog } from '@/components/contexts/DocumentLogContext';

interface DocumentUploadModalProps {
    children?: React.ReactNode;
}

export function DocumentUploadModal({ children }: DocumentUploadModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
    const [dragActive, setDragActive] = useState(false);

    const { data: buildings } = useBuildings();
    const uploadMutation = useUploadDocument();
    const { addLog } = useDocumentLog();

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            setSelectedFile(file);
            addLog('info', 'Επιλογή αρχείου', `Επιλέχθηκε αρχείο: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        }
    }, [addLog]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'image/jpeg': ['.jpg', '.jpeg'],
            'image/png': ['.png'],
            'image/tiff': ['.tiff', '.tif'],
        },
        maxFiles: 1,
        maxSize: 10 * 1024 * 1024, // 10MB
    });

    const handleUpload = async () => {
        if (!selectedFile || !selectedBuildingId) {
            return;
        }

        try {
            addLog('info', 'Έναρξη ανεβάσματος', `Ανέβασμα αρχείου: ${selectedFile.name}`);
            
            const result = await uploadMutation.mutateAsync({
                file: selectedFile,
                buildingId: parseInt(selectedBuildingId),
            });
            
            addLog('success', 'Επιτυχές ανέβασμα', `Το αρχείο ${selectedFile.name} ανέβηκε επιτυχώς`, result.id, selectedFile.name);
            
            // Reset form and close modal
            setSelectedFile(null);
            setSelectedBuildingId('');
            setIsOpen(false);
        } catch (error) {
            console.error('Upload failed:', error);
            addLog('error', 'Αποτυχία ανεβάσματος', `Σφάλμα κατά το ανέβασμα του ${selectedFile.name}: ${error instanceof Error ? error.message : 'Άγνωστο σφάλμα'}`);
        }
    };

    const handleClose = () => {
        setSelectedFile(null);
        setSelectedBuildingId('');
        setIsOpen(false);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const getFileIcon = (file: File) => {
        if (file.type === 'application/pdf') {
            return <File className="h-8 w-8 text-red-500" />;
        }
        return <File className="h-8 w-8 text-blue-500" />;
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children || (
                    <Button>
                        <Upload className="mr-2 h-4 w-4" />
                        Ανέβασμα Εγγράφου
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Ανέβασμα Παραστατικού</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                    {/* Building Selection */}
                    <div className="space-y-2">
                        <Label htmlFor="building">Κτίριο</Label>
                        <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Επιλέξτε κτίριο" />
                            </SelectTrigger>
                            <SelectContent>
                                {buildings?.map((building: any) => (
                                    <SelectItem key={building.id} value={building.id.toString()}>
                                        {building.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* File Upload Area */}
                    <div className="space-y-2">
                        <Label>Αρχείο</Label>
                        <Card
                            {...getRootProps()}
                            className={`cursor-pointer transition-colors ${
                                isDragActive || dragActive
                                    ? 'border-primary bg-primary/5'
                                    : 'border-dashed hover:border-primary/50'
                            }`}
                        >
                            <CardContent className="p-6">
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center justify-center space-y-2">
                                    <Upload className="h-8 w-8 text-muted-foreground" />
                                    <div className="text-center">
                                        <p className="text-sm font-medium">
                                            {isDragActive
                                                ? 'Αφήστε το αρχείο εδώ'
                                                : 'Κάντε κλικ ή σύρετε αρχείο εδώ'}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            PDF, JPG, PNG, TIFF (μέχρι 10MB)
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Selected File Display */}
                    {selectedFile && (
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                            <div className="flex items-center space-x-3">
                                {getFileIcon(selectedFile)}
                                <div>
                                    <p className="text-sm font-medium">{selectedFile.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(selectedFile.size)}
                                    </p>
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedFile(null)}
                                disabled={uploadMutation.isPending}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Error Display */}
                    {uploadMutation.isError && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                                {uploadMutation.error?.message || 'Προέκυψε σφάλμα κατά το ανέβασμα'}
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={handleClose} disabled={uploadMutation.isPending}>
                            Ακύρωση
                        </Button>
                        <Button
                            onClick={handleUpload}
                            disabled={!selectedFile || !selectedBuildingId || uploadMutation.isPending}
                        >
                            {uploadMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Ανέβασμα...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Ανέβασμα
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
