import React, { Suspense } from 'react';
import { ExamWizardShell } from '@/components/dashboards/faculty/exam-wizard/exam-wizard-shell';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';

async function EditExamResolver({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;
  return <ExamWizardShell initialExamId={examId} />;
}

export default function FacultyEditExamPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  return (
    <Suspense fallback={<LoadingSkeleton variant="card" count={2} />}>
      <EditExamResolver params={params} />
    </Suspense>
  );
}
