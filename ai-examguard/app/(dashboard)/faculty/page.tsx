'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Layers, PlusCircle, FileText } from 'lucide-react';
import Link from 'next/link';

export default function FacultyDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            Faculty Examination Command
          </h1>
          <p className="text-sm text-muted-foreground">
            Author coursework exams, curate question banks, and review candidate integrity scores
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button asChild className="bg-primary text-primary-foreground text-xs gap-1.5 shadow-md shadow-primary/20">
            <Link href="/faculty?action=new-exam">
              <PlusCircle className="h-4 w-4" />
              Create Examination
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">My Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">1</div>
            <p className="text-[11px] text-muted-foreground mt-1">CS-201: Data Structures</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Scheduled Exams</CardTitle>
            <Layers className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">1</div>
            <p className="text-[11px] text-muted-foreground mt-1">Midterm Exam (AI Monitored)</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Pending Review</CardTitle>
            <FileText className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">0</div>
            <p className="text-[11px] text-muted-foreground mt-1">All submissions evaluated</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Active Examinations</CardTitle>
          <CardDescription>Examinations scheduled with local AI proctoring</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/60 p-4 flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">CS-201 Midterm Examination</span>
                <Badge variant="cyan" className="text-[10px]">Published</Badge>
              </div>
              <p className="text-xs text-muted-foreground">Duration: 60 mins • Multi-face & Audio Guard enabled</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs border-border">
              Manage Questions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
