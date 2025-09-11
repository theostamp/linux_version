'use client';

import { createContext, useContext, ReactNode, useCallback } from 'react';

interface LogEntry {
    id: string;
    timestamp: Date;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    details?: string;
    documentId?: number;
    documentName?: string;
}

interface DocumentLogContextType {
    addLog: (type: LogEntry['type'], message: string, details?: string, documentId?: number, documentName?: string) => void;
}

const DocumentLogContext = createContext<DocumentLogContextType | undefined>(undefined);

export function DocumentLogProvider({ children, addLog }: { children: ReactNode; addLog: DocumentLogContextType['addLog'] }) {
    const memoizedAddLog = useCallback(addLog, [addLog]);
    
    return (
        <DocumentLogContext.Provider value={{ addLog: memoizedAddLog }}>
            {children}
        </DocumentLogContext.Provider>
    );
}

export function useDocumentLog() {
    const context = useContext(DocumentLogContext);
    if (context === undefined) {
        throw new Error('useDocumentLog must be used within a DocumentLogProvider');
    }
    return context;
}
