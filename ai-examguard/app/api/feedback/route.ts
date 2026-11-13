import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  role: z.string().min(1).max(50),
  category: z.string().min(1).max(100),
  comments: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = feedbackSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid feedback submission.', details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { rating, role, category, comments } = parsed.data;

    // Retrieve authenticated user if present
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Default canonical SRM AP tenant ID
    const DEFAULT_TENANT_ID = '55d810b1-0555-43d2-97e2-d4a420b6173e';

    let tenantId = DEFAULT_TENANT_ID;
    const userId = user?.id || null;

    if (userId) {
      const { data: member } = await supabaseAdmin
        .from('tenant_memberships')
        .select('tenant_id')
        .eq('user_id', userId)
        .maybeSingle();
      if (member?.tenant_id) {
        tenantId = member.tenant_id;
      }
    }

    // Try inserting into demo_feedback
    const { error: insertErr } = await supabaseAdmin.from('demo_feedback').insert({
      tenant_id: tenantId,
      user_id: userId,
      rating,
      role,
      category,
      comments,
    });

    if (insertErr) {
      // If table demo_feedback is not created in DB yet, fallback gracefully to audit_logs
      await supabaseAdmin.from('audit_logs').insert({
        tenant_id: tenantId,
        user_id: userId || '00000000-0000-0000-0000-000000000000',
        action: 'DEMO_FEEDBACK_SUBMITTED',
        details: {
          rating,
          role,
          category,
          comments,
          submittedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: 'Feedback received successfully. Thank you for evaluating AI ExamGuard at SRM AP!',
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to record feedback.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { data: feedbacks, error: fbErr } = await supabaseAdmin
      .from('demo_feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (fbErr || !feedbacks || feedbacks.length === 0) {
      // Fallback query from audit_logs
      const { data: auditLogs } = await supabaseAdmin
        .from('audit_logs')
        .select('*')
        .eq('action', 'DEMO_FEEDBACK_SUBMITTED')
        .order('created_at', { ascending: false });

      const mapped = (auditLogs || []).map((a) => {
        const details = (a.details || {}) as Record<string, unknown>;
        return {
          id: a.id,
          rating: (details.rating as number) || 5,
          role: (details.role as string) || 'Faculty',
          category: (details.category as string) || 'General',
          comments: (details.comments as string) || 'No comments provided',
          created_at: a.created_at,
        };
      });

      return NextResponse.json({ feedback: mapped });
    }

    return NextResponse.json({ feedback: feedbacks });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to list feedback.' },
      { status: 500 }
    );
  }
}

