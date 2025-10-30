'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, getDoc, setDoc, getDocs, limit } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send, Bot, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { advisorReply } from './actions';
import { useToast } from '@/hooks/use-toast';

type Msg = { id: string; role: 'user'|'model'; content: string; createdAt: any };

export default function Chat() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [input, setInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);

  const chatId = 'default';

  const messagesQuery = useMemoFirebase(() => {
    if (!user) return null;
    const ref = collection(firestore, 'users', user.uid, 'chats', chatId, 'messages');
    return query(ref, orderBy('createdAt', 'asc'));
  }, [firestore, user]);

  const { data: messages, isLoading } = useCollection<Msg>(messagesQuery);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    const ensure = async () => {
      if (!user) return;
      const ref = doc(firestore, 'users', user.uid, 'chats', chatId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, { userId: user.uid, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        const mref = collection(firestore, 'users', user.uid, 'chats', chatId, 'messages');
        await addDoc(mref, { role: 'model', content: 'Hello! How can I help with your loans today?', createdAt: serverTimestamp() });
      }
    };
    ensure();
  }, [firestore, user]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !input.trim() || isPending) return;

    const content = input.trim();
    setInput('');

    startTransition(async () => {
      try {
        const msgsRef = collection(firestore, 'users', user.uid, 'chats', chatId, 'messages');
        await addDoc(msgsRef, { role: 'user', content, createdAt: serverTimestamp() });

        // Build context
        const sanitize = (value: any): any => {
          if (value == null) return value;
          if (Array.isArray(value)) return value.map(sanitize);
          if (typeof value === 'object') {
            if ('seconds' in value && 'nanoseconds' in value && typeof value.seconds === 'number') {
              const ms = value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
              return new Date(ms).toISOString();
            }
            const out: any = {};
            for (const k of Object.keys(value)) {
              out[k] = sanitize((value as any)[k]);
            }
            return out;
          }
          return value;
        };

        const userDoc = await getDoc(doc(firestore, 'users', user.uid));
        const profile = sanitize(userDoc.exists() ? userDoc.data() : {});
        const loansSnap = await getDocs(collection(firestore, 'users', user.uid, 'loans'));
        const loansRaw = await Promise.all(loansSnap.docs.map(async ld => {
          const l = ld.data();
          try {
            const pQ = query(collection(firestore, 'users', user.uid, 'loans', ld.id, 'payments'), orderBy('paymentDate', 'desc'), limit(12));
            const pS = await getDocs(pQ);
            const payments = pS.docs.map(p => ({ id: p.id, ...p.data() }));
            return { id: ld.id, ...l, payments };
          } catch {
            return { id: ld.id, ...l, payments: [] };
          }
        }));
        const loans = sanitize(loansRaw);
        const recentHistory = (messages || []).slice(-30).map(m => ({ role: m.role, content: m.content }));

        const res = await advisorReply({ userProfile: profile, loans, history: recentHistory, message: content });
        if (!res.ok) {
          toast({ variant: 'destructive', title: 'AI error', description: res.error });
          return;
        }
        await addDoc(msgsRef, { role: 'model', content: res.content, createdAt: serverTimestamp() });
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Send failed', description: e?.message || 'Unknown error' });
      }
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-muted/20">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-6 space-y-6">
          {isLoading && (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary"/></div>
          )}
          {(messages || []).map(m => (
            <div key={m.id} className={`flex items-start gap-3 ${m.role==='user' ? 'justify-end' : 'justify-start'}`}>
              {m.role !== 'user' && (
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback><Bot className="h-4 w-4"/></AvatarFallback>
                </Avatar>
              )}
              <div className={`${m.role==='user' ? 'bg-primary text-primary-foreground' : 'bg-background border'} px-4 py-3 rounded-2xl max-w-[85%] shadow-sm whitespace-pre-wrap`}>{m.content}</div>
              {m.role === 'user' && (
                <Avatar className="h-8 w-8 border">
                  <AvatarFallback><UserIcon className="h-4 w-4"/></AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          <div ref={endRef}/>
        </div>
      </div>
      <div className="border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <form onSubmit={handleSend} className="max-w-3xl mx-auto px-4 md:px-6 py-4 flex gap-2">
          <Input value={input} onChange={e=>setInput(e.target.value)} placeholder="Message LoanZen Advisor" disabled={isPending} className="h-11"/>
          <Button type="submit" disabled={isPending || !input.trim()} className="h-11 px-4">
            {isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}
          </Button>
        </form>
      </div>
    </div>
  );
}


