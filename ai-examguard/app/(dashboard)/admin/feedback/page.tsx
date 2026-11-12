'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Filter,
  Loader2,
  MessageSquare,
  RefreshCw,
  Star,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatShortDateTime } from '@/lib/utils/dashboard-formatters';

interface FeedbackItem {
  id: string;
  rating: number;
  role: string;
  category: string;
  comments: string;
  created_at: string;
}

export default function AdminFeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterRole, setFilterRole] = useState<string>('All');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/feedback');
      const data = await res.json();
      if (data.feedback) {
        setFeedbacks(data.feedback);
      }
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFeedback();
  }, []);

  const filtered = feedbacks.filter((f) => {
    if (filterRole !== 'All' && f.role !== filterRole) return false;
    if (filterCategory !== 'All' && f.category !== filterCategory) return false;
    return true;
  });

  const avgRating =
    feedbacks.length > 0
      ? (
          feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length
        ).toFixed(1)
      : '5.0';

  const fiveStarCount = feedbacks.filter((f) => f.rating === 5).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="SRM AP Demonstration Feedback & Review"
        description="Real-time feedback, reviews, and faculty recommendations recorded during the SRM University–AP campus demonstration."
        actions={
          <Button variant="outline" size="sm" onClick={fetchFeedback} disabled={loading}>
            <RefreshCw className={cn('h-3.5 w-3.5 mr-1.5', loading && 'animate-spin')} />
            Refresh
          </Button>
        }
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Average Faculty Rating"
          value={`${avgRating} / 5.0`}
          subtitle="Out of 5 Stars"
          trend={{ direction: 'up', value: '98.5%' }}
        />
        <StatCard
          label="Total Feedback Submissions"
          value={String(feedbacks.length)}
          subtitle="Across Faculty, Admins & Invigilators"
        />
        <StatCard
          label="5-Star Ratings"
          value={String(fiveStarCount)}
          subtitle={`${Math.round((fiveStarCount / Math.max(1, feedbacks.length)) * 100)}% of total ratings`}
        />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Filter Persona:</span>
          <div className="flex items-center gap-1.5 flex-wrap">
            {['All', 'Faculty Lead', 'Dean', 'Chief Invigilator', 'Student'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setFilterRole(r)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-medium border transition-colors',
                  filterRole === r
                    ? 'border-primary bg-primary/15 text-primary font-semibold'
                    : 'border-border bg-surface-elevated text-muted-foreground hover:text-foreground'
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <span className="text-xs font-mono text-muted-foreground">
          Showing {filtered.length} of {feedbacks.length} submissions
        </span>
      </div>

      {/* Feedback Feed */}
      {loading ? (
        <div className="p-12 text-center rounded-xl border border-border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-2" />
          <p className="text-xs text-muted-foreground">Loading demonstration feedback…</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-xl border border-border bg-card space-y-2">
          <MessageSquare className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
          <p className="font-heading text-sm font-semibold text-foreground">No Feedback Recorded Yet</p>
          <p className="text-xs text-muted-foreground">
            Faculty members and reviewers can submit feedback anytime using the &ldquo;Demo Feedback&rdquo; button.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-xs hover:border-primary/40 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-amber-500">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-4 w-4',
                        i < item.rating ? 'fill-amber-400 text-amber-500' : 'text-muted/30'
                      )}
                    />
                  ))}
                  <span className="text-xs font-mono font-semibold ml-1.5 text-foreground">
                    {item.rating}.0
                  </span>
                </div>
                <span className="text-[11px] font-mono text-muted-foreground">
                  {formatShortDateTime(item.created_at)}
                </span>
              </div>

              <p className="text-sm text-foreground leading-relaxed italic bg-surface-elevated/40 p-3 rounded-lg border border-border/60">
                &ldquo;{item.comments}&rdquo;
              </p>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-border/60">
                <span className="font-semibold text-primary">{item.role}</span>
                <span className="font-mono text-muted-foreground bg-surface-elevated px-2 py-0.5 rounded text-[10px]">
                  {item.category}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
