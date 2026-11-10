'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md space-y-4 text-center p-4">
          <h1 className="text-4xl font-bold text-destructive">
            Critical Error
          </h1>
          <p className="text-lg text-muted-foreground">
            A critical error occurred. Please refresh the page.
          </p>
          {error.message && (
            <p className="text-sm text-muted-foreground font-mono bg-muted p-4 rounded-lg">
              {error.message}
            </p>
          )}
          <button
            onClick={reset}
            className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
