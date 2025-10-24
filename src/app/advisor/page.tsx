// src/app/advisor/page.tsx
'use client';

import { useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import ChatInterface from './ChatInterface';
import { getOrCreateChatAction } from './actions';

export default function PrepaymentAdvisorPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [chatId, setChatId] = useState<string | null>(null);
  const [isLoadingChat, setIsLoadingChat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login?redirect=/advisor');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    if (user) {
      setIsLoadingChat(true);
      setError(null);
      getOrCreateChatAction(user.uid)
        .then(({ chatId, error }) => {
          if (error) {
            setError(error);
          } else {
            setChatId(chatId);
          }
        })
        .finally(() => {
          setIsLoadingChat(false);
        });
    }
  }, [user]);

  const isLoading = isUserLoading || isLoadingChat;

  if (isLoading) {
    return (
      <div className="container mx-auto max-w-4xl py-12 px-4 flex-grow flex flex-col items-center justify-center">
        <Loader2 className="h-16 w-16 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground">Starting your advisor session...</p>
      </div>
    );
  }

  if (error) {
     return (
      <div className="container mx-auto max-w-4xl py-12 px-4 flex-grow flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold text-destructive">Error</h2>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <p className="mt-2 text-sm text-muted-foreground">Please try refreshing the page.</p>
      </div>
    );
  }
  
  if (!user || !chatId) {
    return null; // or some other placeholder
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">
       <div className="text-center py-6 border-b">
         <h1 className="font-headline text-3xl font-bold tracking-tight text-primary sm:text-4xl">
           AI Prepayment Advisor
         </h1>
         <p className="mt-2 text-md leading-8 text-muted-foreground max-w-2xl mx-auto">
           Chat with your personal AI to analyze your loans and find the best repayment strategy.
         </p>
       </div>
       <ChatInterface userId={user.uid} chatId={chatId} />
    </div>
  );
}
