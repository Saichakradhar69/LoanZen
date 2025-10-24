// src/app/advisor/ChatInterface.tsx
'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Bot, Loader2, Send, User as UserIcon } from 'lucide-react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { askAdvisorAction } from './actions';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  createdAt: { seconds: number; nanoseconds: number; } | Date;
}

interface ChatInterfaceProps {
  userId: string;
  chatId: string;
}

export default function ChatInterface({ userId, chatId }: ChatInterfaceProps) {
  const firestore = useFirestore();
  const [inputValue, setInputValue] = useState('');
  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const messagesQuery = useMemoFirebase(() => {
    if (!userId || !chatId) return null;
    const messagesRef = collection(firestore, 'users', userId, 'chats', chatId, 'messages');
    return query(messagesRef, orderBy('createdAt', 'asc'));
  }, [firestore, userId, chatId]);
  
  const { data: messages, isLoading } = useCollection<Message>(messagesQuery);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isPending) return;

    const messageContent = inputValue.trim();
    setInputValue('');

    startTransition(async () => {
      const result = await askAdvisorAction(userId, chatId, messageContent);
      if (result?.type === 'error') {
        toast({
            variant: "destructive",
            title: "Error",
            description: result.error,
        });
      }
    });
  };

  return (
    <div className="flex-grow flex flex-col bg-muted/20">
      <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-6">
        {isLoading && !messages && (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
        )}
        {messages?.map((msg) => (
            <div key={msg.id} className={cn("flex items-start gap-4", msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                {msg.role === 'model' && (
                    <Avatar className="h-8 w-8 border">
                        <AvatarFallback><Bot /></AvatarFallback>
                    </Avatar>
                )}
                <div className={cn("max-w-md md:max-w-lg lg:max-w-2xl px-4 py-3 rounded-lg shadow-sm", msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-background')}>
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
                {msg.role === 'user' && (
                    <Avatar className="h-8 w-8 border">
                        <AvatarFallback><UserIcon /></AvatarFallback>
                    </Avatar>
                )}
            </div>
        ))}
         <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-background border-t">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 max-w-4xl mx-auto">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask about your loans..."
            className="flex-grow"
            disabled={isPending}
          />
          <Button type="submit" size="icon" disabled={isPending || !inputValue.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            <span className="sr-only">Send message</span>
          </Button>
        </form>
      </div>
    </div>
  );
}
