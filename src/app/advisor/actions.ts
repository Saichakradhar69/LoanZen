
'use server';

import { getPrepaymentAdvice } from '@/ai/flows/prepayment-advisor';
import { initializeFirebase } from '@/firebase/server';
import { collection, getDocs, doc, addDoc, serverTimestamp, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Define the shape of a message for the AI flow and Firestore
interface Message {
  role: 'user' | 'model';
  content: string;
}

// Ensure the server-side Firebase app is initialized
const { firestore, auth: serverAuth } = initializeFirebase();

// This is the main action that will be called from the chat interface.
export async function askAdvisorAction(
  userId: string,
  chatId: string,
  messageContent: string,
) {

  if (!userId || !chatId) {
    return { type: 'error', error: 'User or Chat ID is missing.' };
  }

  // 1. Save the user's message to Firestore
  const messagesRef = collection(firestore, 'users', userId, 'chats', chatId, 'messages');
  await addDoc(messagesRef, {
    role: 'user',
    content: messageContent,
    createdAt: serverTimestamp(),
  });
  
  // 2. Fetch all loans for the user
  const loansRef = collection(firestore, 'users', userId, 'loans');
  const loansSnapshot = await getDocs(loansRef);
  const loans = loansSnapshot.docs.map(doc => ({
    loanName: doc.data().loanName,
    currentBalance: doc.data().currentBalance,
    interestRate: doc.data().interestRate,
    monthlyPayment: doc.data().monthlyPayment,
  }));

  // 3. Fetch the recent chat history
  const historySnapshot = await getDocs(messagesRef);
  const history: Message[] = historySnapshot.docs.map(doc => ({
    role: doc.data().role,
    content: doc.data().content,
  }));

  // 4. Call the AI Flow with the loans and history
  try {
    const aiResult = await getPrepaymentAdvice({ loans, history });
    
    // 5. Save the AI's response to Firestore
    await addDoc(messagesRef, {
      role: 'model',
      content: aiResult.content,
      createdAt: serverTimestamp(),
    });
    
    // Update the parent chat document's `updatedAt` field
    const chatDocRef = doc(firestore, 'users', userId, 'chats', chatId);
    await updateDoc(chatDocRef, {
        updatedAt: serverTimestamp(),
    });


    return { type: 'success', data: aiResult };
  } catch (error) {
    console.error("AI Advisor Action Error:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected AI error occurred.';
    // Optionally save an error message to the chat
     await addDoc(messagesRef, {
      role: 'model',
      content: "I'm sorry, I encountered an error and couldn't process your request. Please try again later.",
      createdAt: serverTimestamp(),
    });
    return { type: 'error', error: errorMessage };
  }
}

// Action to get or create a chat session for the user
export async function getOrCreateChatAction(userId: string): Promise<{ chatId: string | null; error?: string }> {
    if (!userId) return { chatId: null, error: 'User not authenticated.' };

    const chatCollectionRef = collection(firestore, 'users', userId, 'chats');
    const defaultChatDocRef = doc(chatCollectionRef, 'default');

    try {
        const chatDoc = await getDoc(defaultChatDocRef);
        if (chatDoc.exists()) {
            return { chatId: chatDoc.id };
        } else {
            await setDoc(defaultChatDocRef, {
                userId: userId,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            });

             // Add an initial greeting message from the AI
            const messagesRef = collection(defaultChatDocRef, 'messages');
            await addDoc(messagesRef, {
                role: 'model',
                content: 'Hello! I am your personal financial advisor. How can I help you with your loans today?',
                createdAt: serverTimestamp(),
            });

            return { chatId: defaultChatDocRef.id };
        }
    } catch (error) {
         console.error("Get/Create Chat Error:", error);
         const errorMessage = error instanceof Error ? error.message : 'Could not start a chat session.';
         return { chatId: null, error: errorMessage };
    }
}
