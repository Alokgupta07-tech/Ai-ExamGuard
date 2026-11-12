import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { requireRoleActor } from '@/lib/services/dashboard'
import { ExamPolicyManager } from '@/components/dashboards/faculty/exam-policy-manager'

export default async function ExamPolicyPage(props: {
  params: Promise<{ examId: string }>
}) {
  const { examId } = await props.params
  const actor = await requireRoleActor(['instructor', 'admin'])

  const { data: exam, error } = await supabaseAdmin
    .from('exams')
    .select('id, title, course_id, courses(code, name)')
    .eq('id', examId)
    .eq('tenant_id', actor.tenantId)
    .maybeSingle()

  if (error || !exam) {
    notFound()
  }

  const course = (exam as unknown as { courses?: { code: string; name: string } }).courses

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ExamPolicyManager
        examId={exam.id}
        examTitle={exam.title}
        courseCode={course?.code}
      />
    </div>
  )
}
