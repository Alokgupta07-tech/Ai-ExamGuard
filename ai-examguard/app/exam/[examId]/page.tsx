import React, { Suspense } from 'react';
import { ExamTakingWorkspace } from '@/components/exam/exam-taking-workspace';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

async function ExamSessionResolver({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  return <ExamTakingWorkspace examId={examId} />;
}

export default function StudentExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingSkeleton variant="card" count={2} />}>
      <ExamSessionResolver params={params} />
    </Suspense>
  );
}

