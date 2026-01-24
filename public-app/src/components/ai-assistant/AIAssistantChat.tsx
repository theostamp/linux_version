'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, X, Wrench, ListTodo } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { api } from '@/lib/api';
import { useBuilding } from '@/components/contexts/BuildingContext';
import { useAuth } from '@/components/contexts/AuthContext';
import { hasOfficeAdminAccess } from '@/lib/roleUtils';
import { toast } from 'sonner';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  type?: 'text' | 'maintenance_proposal';
  proposal?: {
    title: string;
    description: string;
    category: string;
    severity: string;
  };
}

export const AIAssistantChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { selectedBuilding } = useBuilding();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Γεια σας! Είμαι ο Ψηφιακός Διαχειριστής σας. Πώς μπορώ να βοηθήσω σήμερα; (π.χ. "Στάζει η βρύση", "Πότε είναι η συνέλευση;")'
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const canUseAssistant = hasOfficeAdminAccess(user);
  const quickPrompts = [
    'Ποιες εκκρεμότητες έχουμε σήμερα;',
    'Δείξε μου τις ληξιπρόθεσμες εργασίες.',
    'Έχουμε εκκρεμότητες χωρίς προθεσμία;',
    'Θέλω να δηλώσω μια βλάβη.',
  ];

  if (!canUseAssistant) {
    return null;
  }

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isTyping]);

  const handleSend = async (overrideMessage?: string) => {
    const messageToSend = (overrideMessage ?? input).trim();
    if (!messageToSend) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageToSend
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    try {
      const response = await api.post('/ai/chat/', {
        message: userMsg.content,
        building_id: selectedBuilding?.id ?? null,
      });

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.message,
        type: response.data.type,
        proposal: response.data.proposal
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error('AI Chat Error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Συγγνώμη, αντιμετωπίζω κάποιο πρόβλημα αυτή τη στιγμή. Παρακαλώ δοκιμάστε αργότερα.'
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleQuickPrompt = (prompt: string) => {
    if (isTyping) return;
    handleSend(prompt);
  };

  const handleCreateTicket = async (proposal: any) => {
      if (!selectedBuilding) {
          toast.error("Παρακαλώ επιλέξτε κτίριο για να δημιουργήσετε αίτημα");
          return;
      }

      try {
          // Optimistic update
          setMessages(prev => [...prev, {
              id: Date.now().toString(),
              role: 'assistant',
              content: '⏳ Δημιουργία αιτήματος...'
          }]);

          const response = await api.post('/maintenance/tickets/', {
              building: selectedBuilding.id,
              title: proposal.title,
              description: proposal.description,
              category: proposal.category,
              priority: proposal.severity,
              status: 'open',
              // Note: apartment is optional, linking to building level by default
          });

          console.log("Ticket created:", response.data);

          setMessages(prev => {
              const newMessages = [...prev];
              newMessages.pop(); // Remove "Creating..." message
              return [...newMessages, {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: `✅ Το αίτημα δημιουργήθηκε με επιτυχία (ID: #${response.data.id})! Έχει σταλεί ειδοποίηση στον διαχειριστή.`
              }];
          });
          toast.success("Το αίτημα καταχωρήθηκε!");

      } catch (error) {
          console.error("Failed to create ticket:", error);
          setMessages(prev => {
              const newMessages = [...prev];
              newMessages.pop();
              return [...newMessages, {
                  id: Date.now().toString(),
                  role: 'assistant',
                  content: '❌ Υπήρξε ένα πρόβλημα κατά τη δημιουργία του αιτήματος. Παρακαλώ δοκιμάστε ξανά.'
              }];
          });
          toast.error("Αποτυχία δημιουργίας αιτήματος");
      }
  };

  return (
    <>
      {/* Floating Action Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        {!isOpen && (
          <div className="rounded-full bg-white/95 text-slate-700 text-xs px-3 py-1 shadow-sm border border-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:border-slate-700">
            Θέλεις βοήθεια;
          </div>
        )}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsOpen(!isOpen)}
          className="p-4 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-full shadow-lg text-white hover:shadow-xl transition-all"
          aria-label={isOpen ? 'Κλείσιμο βοηθού' : 'Άνοιγμα βοηθού'}
        >
          {isOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </motion.button>
      </div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.9 }}
            className="fixed bottom-24 right-6 z-50 w-96 max-w-[calc(100vw-3rem)] h-[600px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-full">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Βοηθός</h3>
                  <p className="text-xs text-white/80">Άμεση υποστήριξη & εκκρεμότητες</p>
                </div>
              </div>
              <Link
                href="/calendar?view=kanban"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white/90 hover:bg-white/25 transition"
              >
                <ListTodo className="h-3.5 w-3.5" />
                Εκκρεμότητες
              </Link>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-4 bg-slate-50 dark:bg-slate-950">
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleQuickPrompt(prompt)}
                      className="rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition dark:border-slate-700 dark:bg-slate-900/90 dark:text-slate-100 dark:hover:bg-slate-800"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>

                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <Avatar className="w-8 h-8">
                      {msg.role === 'user' ? (
                        <AvatarFallback>ME</AvatarFallback>
                      ) : (
                        <>
                          {/* Use an existing public asset to avoid 404s in production deployments */}
                          <AvatarImage src="/icon-192x192.png" />
                          <AvatarFallback className="bg-violet-100 text-violet-600"><Bot className="w-4 h-4" /></AvatarFallback>
                        </>
                      )}
                    </Avatar>

                    <div className={`flex flex-col gap-2 max-w-[80%]`}>
                        <div
                        className={`p-3 rounded-2xl text-sm ${
                            msg.role === 'user'
                            ? 'bg-violet-600 text-white rounded-tr-none'
                            : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-tl-none shadow-sm'
                        }`}
                        >
                        {msg.content}
                        </div>

                        {/* Maintenance Proposal Card */}
                        {msg.type === 'maintenance_proposal' && msg.proposal && (
                            <Card className="border-l-4 border-l-amber-500 overflow-hidden">
                                <CardHeader className="p-3 pb-0">
                                    <div className="flex items-center gap-2 text-amber-600 font-medium text-xs uppercase tracking-wider">
                                        <Wrench className="w-3 h-3" />
                                        Πρόταση Βλάβης
                                    </div>
                                    <CardTitle className="text-base pt-1">{msg.proposal.title}</CardTitle>
                                </CardHeader>
                                <CardContent className="p-3 text-sm text-muted-foreground">
                                    {msg.proposal.description}
                                    <div className="mt-2 flex gap-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-800">
                                            {msg.proposal.category}
                                        </span>
                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
                                            ${msg.proposal.severity === 'high' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                                            {msg.proposal.severity}
                                        </span>
                                    </div>
                                </CardContent>
                                <CardFooter className="p-3 pt-0 flex gap-2">
                                    <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => {}}>Ακύρωση</Button>
                                    <Button size="sm" className="w-full text-xs bg-amber-600 hover:bg-amber-700" onClick={() => handleCreateTicket(msg.proposal)}>
                                        Δημιουργία
                                    </Button>
                                </CardFooter>
                            </Card>
                        )}
                    </div>
                  </motion.div>
                ))}

                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex gap-3"
                  >
                    <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-violet-100 text-violet-600"><Bot className="w-4 h-4" /></AvatarFallback>
                    </Avatar>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1">
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </motion.div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Γράψτε ένα μήνυμα..."
                  className="flex-1 rounded-full bg-slate-100 dark:bg-slate-800 border-0 focus-visible:ring-violet-500"
                />
                <Button
                  type="submit"
                  size="icon"
                  className="rounded-full bg-violet-600 hover:bg-violet-700 w-10 h-10 shrink-0"
                  disabled={!input.trim() || isTyping}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
