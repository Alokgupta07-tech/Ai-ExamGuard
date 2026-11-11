import React, { Suspense } from 'react';

export default function ExamPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <Suspense fallback={<div className="min-h-screen bg-background" />}>{children}</Suspense>
    </div>
  );
}

