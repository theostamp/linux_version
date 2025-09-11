'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
    Clock, 
    CheckCircle, 
    XCircle, 
    AlertTriangle, 
    RefreshCw,
    FileText,
    Upload,
    Eye,
    Trash2,
    X
} from 'lucide-react';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';

interface LogEntry {
    id: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: string;
    documentId?: number;
    documentName?: string;
}

interface DocumentStatusLogProps {
    isOpen: boolean;
    onClose: () => void;
    logs: LogEntry[];
    onClearLogs: () => void;
}

const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
        case 'success':
            return <CheckCircle className="h-4 w-4 text-green-600" />;
        case 'warning':
            return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
        case 'error':
            return <XCircle className="h-4 w-4 text-red-600" />;
        default:
            return <Clock className="h-4 w-4 text-blue-600" />;
    }
};

const getLogBadgeVariant = (type: LogEntry['type']) => {
    switch (type) {
        case 'success':
            return 'default' as const;
        case 'warning':
            return 'secondary' as const;
        case 'error':
            return 'destructive' as const;
        default:
            return 'outline' as const;
    }
};

export function DocumentStatusLog({ isOpen, onClose, logs, onClearLogs }: DocumentStatusLogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <Card className="w-full max-w-4xl max-h-[80vh] mx-4">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                    <CardTitle className="text-xl font-semibold">
                        📋 Logs Κατάστασης & Προόδου
                    </CardTitle>
                    <div className="flex items-center space-x-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClearLogs}
                            className="text-xs"
                        >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Καθαρισμός
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onClose}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[60vh]">
                        {logs.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                <p>Δεν υπάρχουν logs ακόμα</p>
                                <p className="text-sm">Οι ενέργειες θα εμφανίζονται εδώ</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {logs.map((log) => (
                                    <div
                                        key={log.id}
                                        className="flex items-start space-x-3 p-3 rounded-lg border bg-card"
                                    >
                                        <div className="flex-shrink-0 mt-0.5">
                                            {getLogIcon(log.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <Badge 
                                                    variant={getLogBadgeVariant(log.type)}
                                                    className="text-xs"
                                                >
                                                    {log.type.toUpperCase()}
                                                </Badge>
                                                <span className="text-xs text-muted-foreground">
                                                    {format(log.timestamp, 'HH:mm:ss', { locale: el })}
                                                </span>
                                            </div>
                                            <p className="text-sm font-medium">{log.message}</p>
                                            {log.details && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {log.details}
                                                </p>
                                            )}
                                            {log.documentName && (
                                                <p className="text-xs text-blue-600 mt-1">
                                                    📄 {log.documentName}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>
    );
}

// Hook για διαχείριση logs
export function useDocumentLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);

    const addLog = useCallback((type: LogEntry['type'], message: string, details?: string, documentId?: number, documentName?: string) => {
        const newLog: LogEntry = {
            id: Date.now().toString(),
            timestamp: new Date(),
            type,
            message,
            details,
            documentId,
            documentName,
        };
        
        setLogs(prev => [newLog, ...prev].slice(0, 100)); // Κρατάμε τα τελευταία 100 logs
    }, []);

    const clearLogs = useCallback(() => {
        setLogs([]);
    }, []);

    return {
        logs,
        addLog,
        clearLogs,
    };
}
