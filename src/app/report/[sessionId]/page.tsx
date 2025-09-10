// src/app/report/[sessionId]/page.tsx
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import ReportContent from './ReportContent';

// This is a SERVER COMPONENT. It can be async.
export default async function ReportPage({ params }: { params: Promise<{ sessionId: string }> }) {
  // Unwrap the params promise using 'await'
  const unwrappedParams = await params;
  const { sessionId } = unwrappedParams;

  if (!sessionId) {
    notFound(); // This will show a 404 page
  }

  return (
    <Suspense fallback={
      <div className="container mx-auto max-w-4xl py-12 px-4 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    }>
      {/* Pass the unwrapped sessionId as a prop */}
      <ReportContent sessionId={sessionId} />
    </Suspense>
  );
}
