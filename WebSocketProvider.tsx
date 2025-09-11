'use client';

import React, { createContext, useContext, useEffect, useRef } from 'react';
import { useAuth } from '@/components/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const WebSocketContext = createContext<WebSocket | null>(null);

export const useWebSocket = () => {
    return useContext(WebSocketContext);
};

export const WebSocketProvider = ({ children }: { children: React.ReactNode }) => {
    const { isAuthenticated, tokens } = useAuth();
    const socketRef = useRef<WebSocket | null>(null);
    const queryClient = useQueryClient();

    useEffect(() => {
        if (isAuthenticated && tokens?.access && !socketRef.current) {
            const wsProtocol = window.location.protocol === 'https' ? 'wss' : 'ws';
            // Περνάμε το token ως query parameter για authentication
            const wsUrl = `${wsProtocol}://${window.location.host}/ws/notifications/?token=${tokens.access}`;
            
            console.log('🔌 Connecting to WebSocket...');
            const socket = new WebSocket(wsUrl);
            socketRef.current = socket;

            socket.onopen = () => console.log('✅ WebSocket connection established.');

            socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('📬 WebSocket message received:', data);

                if (data.type === 'notification' && data.message.type === 'document.processed') {
                    const doc = data.message;
                    
                    // Ανανέωση της λίστας των παραστατικών
                    queryClient.invalidateQueries({ queryKey: ['documentUploads'] });

                    // Εμφάνιση ειδοποίησης toast
                    toast.info(`Το παραστατικό "${doc.file_name}" είναι έτοιμο.`, {
                        description: `Το έγγραφο για το κτίριο "${doc.building_name}" έχει επεξεργαστεί.`,
                        action: (
                            <Link href={`/documents/${doc.document_id}/review`}>
                                <Button variant="outline" size="sm">Έλεγχos</Button>
                            </Link>
                        ),
                        duration: 10000, // 10 δευτερόλεπτα
                    });
                }
            };

            socket.onclose = () => { socketRef.current = null; };
            socket.onerror = (error) => console.error('❌ WebSocket error:', error);
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.close();
                socketRef.current = null;
            }
        };
    }, [isAuthenticated, tokens, queryClient]);

    return (
        <WebSocketContext.Provider value={socketRef.current}>{children}</WebSocketContext.Provider>
    );
};
