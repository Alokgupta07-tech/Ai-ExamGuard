'use client';

import React, { useEffect } from 'react';
import { RefreshCw, ShieldAlert } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('AI ExamGuard critical layout exception:', {
      message: error.message,
      digest: error.digest,
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F8F6] text-[#182321] flex items-center justify-center p-4 font-sans antialiased">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-6 sm:p-8 text-center space-y-6 shadow-lg">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600">
            <ShieldAlert className="h-8 w-8" />
          </div>

          <div className="space-y-2">
            <span className="font-mono text-xs uppercase tracking-wider text-red-600 font-semibold">
              Critical System Notice
            </span>
            <h1 className="text-2xl font-bold text-[#182321]">
              System Encountered an Error
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
              A critical layout fault occurred. Click below to reload the platform securely.
            </p>
          </div>

          {error.digest && (
            <div className="rounded-lg bg-gray-50 p-2.5 font-mono text-[11px] text-gray-500 border border-gray-200">
              Diagnostic Code: {error.digest}
            </div>
          )}

          <button
            onClick={() => reset()}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#176B5B] px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#13594B] transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            Reload AI ExamGuard
          </button>
        </div>
      </body>
    </html>
  );
}

