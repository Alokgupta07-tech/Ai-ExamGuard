'use client';

import React from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, Clock, CheckCircle2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function StudentDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
          Student Examination Portal
        </h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.full_name || 'Candidate'}. Review your scheduled exams and start pre-flight checks.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Upcoming Exams</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">1</div>
            <p className="text-[11px] text-muted-foreground mt-1">CS-201 Midterm scheduled</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Average Trust Score</CardTitle>
            <ShieldCheck className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-success">100%</div>
            <p className="text-[11px] text-muted-foreground mt-1">Exemplary academic integrity</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Completed Exams</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">0</div>
            <p className="text-[11px] text-muted-foreground mt-1">No completed sessions yet</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Scheduled Examinations</CardTitle>
          <CardDescription>Available examinations for your enrolled courses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground">CS-201: Data Structures Midterm</span>
                <Badge variant="cyan" className="text-xs">Ready to Take</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Allocated Time: 60 minutes • 10 Questions • Local Face & Audio Proctoring
              </p>
            </div>

            <Button asChild className="bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 text-sm gap-2">
              <Link href="/exam/demo/preflight">
                Launch Pre-Flight Check
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
