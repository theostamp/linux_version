'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, Edit } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { format } from 'date-fns';
import { el } from 'date-fns/locale';
import { useBuilding } from '@/components/contexts/BuildingContext';

interface ChatMessage {
  id: number;
  sender_id: number;
  sender_name: string;
  sender_role: 'manager' | 'admin' | 'resident' | 'other';
  content: string;
  message_type: 'text' | 'image' | 'file' | 'system';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  is_edited: boolean;
  created_at: string;
}

interface ChatParticipant {
  id: number;
  user_name: string;
  user_email: string;
  is_online: boolean;
  last_seen: string;
}

interface ChatRoom {
  id: number;
  name: string;
  building: {
    id: number;
    name: string;
  };
  participants_count: number;
  unread_count: number;
}

interface ChatInterfaceProps {
  currentUser: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
}

export default function ChatInterface({ currentUser }: ChatInterfaceProps) {
  const { currentBuilding } = useBuilding();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [chatRoom, setChatRoom] = useState<ChatRoom | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [editingMessage, setEditingMessage] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load chat room and messages when building changes
  useEffect(() => {
    const loadChatData = async () => {
      if (!currentBuilding || !currentUser) {
        setChatRoom(null);
        setMessages([]);
        setParticipants([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // For now, create a mock chat room and messages
        const mockChatRoom: ChatRoom = {
          id: currentBuilding.id,
          name: `Chat Room - ${currentBuilding.name}`,
          building: {
            id: currentBuilding.id,
            name: currentBuilding.name
          },
          participants_count: 1,
          unread_count: 0
        };
        
        setChatRoom(mockChatRoom);

        // Mock messages - μόνο το μήνυμα καλωσορίσματος
        const mockMessages: ChatMessage[] = [
          {
            id: 1,
            sender_id: 1,
            sender_name: 'Γραφείο Διαχείρισης',
            sender_role: 'admin',
            content: `Καλώς ήρθατε στο chat room του ${currentBuilding.name}! Είστε συνδεδεμένοι ως ${currentUser.role === 'manager' ? 'Διαχειριστής' : currentUser.role === 'admin' ? 'Admin' : 'Χρήστης'}.`,
            message_type: 'text',
            is_edited: false,
            created_at: new Date(Date.now() - 3600000).toISOString()
          }
        ];
        
        setMessages(mockMessages);

        // Mock participants - μόνο ο τρέχων χρήστης
        const mockParticipants: ChatParticipant[] = [
          {
            id: currentUser.id,
            user_name: currentUser.name || 'Χρήστης',
            user_email: currentUser.email || '',
            is_online: true,
            last_seen: new Date().toISOString()
          }
        ];
        
        setParticipants(mockParticipants);
      } catch (error) {
        console.error('Error loading chat data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadChatData();
  }, [currentBuilding, currentUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;

    const newChatMessage: ChatMessage = {
      id: messages.length + 1,
      sender_id: currentUser.id,
      sender_name: currentUser.name || 'Χρήστης',
      sender_role: currentUser.role as 'manager' | 'admin' | 'resident' | 'other',
      content: newMessage.trim(),
      message_type: 'text',
      is_edited: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newChatMessage]);
    setNewMessage('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !currentUser) return;

    const newChatMessage: ChatMessage = {
      id: messages.length + 1,
      sender_id: currentUser.id,
      sender_name: currentUser.name || 'Χρήστης',
      sender_role: currentUser.role as 'manager' | 'admin' | 'resident' | 'other',
      content: `📎 ${file.name}`,
      message_type: 'file',
      file_name: file.name,
      file_size: file.size,
      is_edited: false,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, newChatMessage]);
  };

  const handleEditMessage = async (messageId: number, newContent: string) => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, content: newContent, is_edited: true }
        : msg
    ));
    setEditingMessage(null);
    setEditContent('');
  };

  // Note: sender_role in chat messages is building-level role (not CustomUser.role)
  // It can be: 'manager' (building manager), 'resident' (building resident), 'admin', 'other'
  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-purple-500'; // Admin/Superuser - μωβ
      case 'manager':
        return 'bg-blue-500';   // Building Manager/Διαχειριστής - μπλε
      case 'resident':
        return 'bg-green-500';  // Building Resident/Κάτοικος - πράσινο
      default:
        return 'bg-gray-500';   // Other/Χρήστης - γκρι
    }
  };

  // Note: For chat messages, sender_role is building-level role, not CustomUser.role
  // CustomUser.role can only be 'admin' or 'manager' (Django Tenant Owner)
  // But in chat context, sender_role is determined by building membership
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'manager':
        return 'Διαχειριστής'; // Building Manager
      case 'resident':
        return 'Κάτοικος'; // Building Resident
      case 'other':
        return 'Χρήστης';
      default:
        return 'Χρήστης';
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full h-full">
        <CardContent className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p>Φόρτωση chat...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex h-full">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <Card className="h-full">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {chatRoom?.name || 'Chat Room'}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="default">
                    Συνδεδεμένος
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {participants.length} συμμετέχοντες
                  </span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 p-0">
            {/* Messages Area */}
            <ScrollArea className="h-96 p-4">
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.sender_id === currentUser.id ? 'flex-row-reverse' : ''
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {message.sender_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className={`flex-1 max-w-[70%] ${
                      message.sender_id === currentUser.id ? 'text-right' : ''
                    }`}>
                      <div className={`inline-block p-3 rounded-lg ${
                        message.sender_id === currentUser.id
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium">
                            {message.sender_name}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getRoleBadgeColor(message.sender_role)}`}
                          >
                            {getRoleLabel(message.sender_role)}
                          </Badge>
                          {message.is_edited && (
                            <span className="text-xs opacity-70">(επεξεργασμένο)</span>
                          )}
                        </div>
                        
                        {editingMessage === message.id ? (
                          <div className="space-y-2">
                            <Input
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  handleEditMessage(message.id, editContent);
                                }
                              }}
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleEditMessage(message.id, editContent)}
                              >
                                Αποθήκευση
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingMessage(null);
                                  setEditContent('');
                                }}
                              >
                                Ακύρωση
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm">{message.content}</p>
                            {message.file_name && (
                              <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                                <p className="text-xs">📎 {message.file_name}</p>
                                {message.file_size && (
                                  <p className="text-xs text-muted-foreground">
                                    {(message.file_size / 1024).toFixed(1)} KB
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <p className="text-xs opacity-70 mt-1">
                          {message.created_at ? format(new Date(message.created_at), 'HH:mm', { locale: el }) : '--:--'}
                        </p>
                      </div>
                      
                      {message.sender_id === currentUser.id && editingMessage !== message.id && (
                        <div className="flex gap-1 mt-1 justify-end">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingMessage(message.id);
                              setEditContent(message.content);
                            }}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <Separator />

            {/* Message Input */}
            <div className="p-4">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Γράψτε το μήνυμά σας..."
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip className="h-4 w-4" />
                </Button>
                <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Participants Sidebar */}
      <div className="w-64 ml-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Συμμετέχοντες</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {participants.map((participant) => (
                <div key={participant.id} className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {participant.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-white ${
                      participant.is_online ? 'bg-green-500' : 'bg-gray-400'
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {participant.user_name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {participant.user_email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 