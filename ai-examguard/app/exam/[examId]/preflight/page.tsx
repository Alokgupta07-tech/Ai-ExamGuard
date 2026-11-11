import React, { Suspense } from 'react';
import { ExamPreflightView } from '@/components/exam/exam-preflight-view';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

async function PreflightResolver({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  return <ExamPreflightView examId={examId} />;
}

export default function ExamPreflightPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingSkeleton variant="card" count={2} />}>
      <PreflightResolver params={params} />
    </Suspense>
  );
}

