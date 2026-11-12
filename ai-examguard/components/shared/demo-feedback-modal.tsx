'use client';

import React, { useState } from 'react';
import { CheckCircle2, Loader2, MessageSquarePlus, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function DemoFeedbackModal({
  isOpen,
  onClose,
  defaultRole = 'Faculty Lead',
}: {
  isOpen: boolean;
  onClose: () => void;
  defaultRole?: string;
}) {
  const [rating, setRating] = useState<number>(5);
  const [role, setRole] = useState<string>(defaultRole);
  const [category, setCategory] = useState<string>('Examination Integrity');
  const [comments, setComments] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comments.trim()) {
      setErrorMsg('Please write a brief feedback comment or suggestion.');
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, role, category, comments }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit feedback.');
      }
      setSubmitted(true);
      setTimeout(() => {
        setSubmitted(false);
        setComments('');
        onClose();
      }, 2000);
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-muted-foreground hover:bg-surface-elevated hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto animate-in zoom-in-75 duration-200" />
            <h3 className="font-heading text-lg font-semibold text-foreground">
              Thank You for Your Feedback!
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Your evaluation and comments have been recorded in the SRM University–AP demonstration audit log.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MessageSquarePlus className="h-5 w-5 text-primary" />
                <h3 className="font-heading text-lg font-semibold text-foreground">
                  SRM University–AP Demo Feedback
                </h3>
              </div>
              <p className="text-xs text-muted-foreground">
                Share your experience, feature requests, or notes for the faculty demonstration panel.
              </p>
            </div>

            {/* Star Rating */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
                Overall Experience Rating
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 text-amber-500 hover:scale-110 transition-transform cursor-pointer"
                  >
                    <Star
                      className={cn(
                        'h-6 w-6',
                        star <= rating ? 'fill-amber-400 text-amber-500' : 'text-muted/40'
                      )}
                    />
                  </button>
                ))}
                <span className="text-xs font-mono font-semibold ml-2 text-muted-foreground">
                  {rating} of 5 Stars
                </span>
              </div>
            </div>

            {/* Role and Category Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Evaluating Persona</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Faculty Lead">Faculty Lead / Instructor</option>
                  <option value="Department Dean">Dean / HOD</option>
                  <option value="Chief Invigilator">Chief Invigilator</option>
                  <option value="University Administrator">University Administrator</option>
                  <option value="Student Representative">Student Representative</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Feedback Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="Examination Integrity">Examination Integrity & 5-of-7</option>
                  <option value="AI Proctoring Accuracy">AI Proctoring (MediaPipe/Audio)</option>
                  <option value="Speed & Performance">Navigation Speed & Performance</option>
                  <option value="SRM AP Timetable">Timetable & Schedule Accuracy</option>
                  <option value="UI & Aesthetics">UI, Visual Polish & Design</option>
                </select>
              </div>
            </div>

            {/* Comments Field */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                Comments, Suggestions, or Observed Notes
              </label>
              <textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Share your thoughts on the examination patterns, camera tracking, mobile responsiveness, or suggestions for the faculty committee…"
                rows={4}
                className="w-full rounded-xl border border-border bg-surface-elevated p-3 text-xs text-foreground placeholder:text-muted-foreground/60 focus:bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {errorMsg && (
              <p className="text-xs font-medium text-critical bg-critical/10 p-2.5 rounded-lg">
                {errorMsg}
              </p>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                    Submitting…
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
