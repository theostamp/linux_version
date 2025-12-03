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
    <div className="flex items-center justify-center h-[calc(100vh-120px)] bg-slate-50 rounded-2xl">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 animate-pulse">
          <MessageCircle className="w-8 h-8 text-primary" />
        </div>
        <div className="flex items-center gap-2 text-slate-500">
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
            <MessageCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Επικοινωνία Κτιρίου
            </h1>
            <p className="text-sm text-slate-500">
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

