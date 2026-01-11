'use client';

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { MessageCircle, Loader2 } from 'lucide-react';

// Dynamic import with no SSR for chat interface
const ChatInterface = dynamic(
  () => import('@/components/chat/ChatInterface'),
  {
    ssr: false,
    loading: () => <ChatLoadingState />
  }
);

function ChatLoadingState() {
  return (
    <div className="flex items-center justify-center h-[calc(100vh-120px)] bg-card rounded-2xl border border-border">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <MessageCircle className="w-8 h-8 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Φόρτωση chat...</span>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shadow-sm border border-blue-500/20">
            <MessageCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="page-title-sm">
              Επικοινωνία Κτιρίου
            </h1>
            <p className="text-sm text-muted-foreground">
              Συνομιλήστε με διαχειριστές και κατοίκους σε πραγματικό χρόνο
            </p>
          </div>
        </div>
      </div>

      {/* Chat Interface */}
      <Suspense fallback={<ChatLoadingState />}>
        <ChatInterface />
      </Suspense>
    </div>
  );
}
