'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-4 text-center">
        <h1 className="text-4xl font-bold text-destructive">
          Something went wrong
        </h1>
        <p className="text-lg text-muted-foreground">
          An unexpected error occurred. Please try again.
        </p>
        {error.message && (
          <p className="text-sm text-muted-foreground font-mono bg-muted p-4 rounded-lg">
            {error.message}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset} variant="default">
            Try again
          </Button>
          <Button onClick={() => router.push('/')} variant="outline">
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}
