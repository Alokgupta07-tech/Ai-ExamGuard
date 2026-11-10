'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, Activity, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

export default function InvigilatorDashboardPage() {

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            Live Invigilator Command Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Real-time candidate telemetry, instant anomaly feeds, and intervention controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple" className="text-xs py-1 px-3 gap-1.5">
            <span className="h-2 w-2 rounded-full bg-purple animate-ping" />
            Live WebSocket Realtime Active
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Active Candidates</CardTitle>
            <Eye className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">1</div>
            <p className="text-[11px] text-muted-foreground mt-1">CS-201 Midterm Room #1</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Flagged Anomalies</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-warning">0</div>
            <p className="text-[11px] text-muted-foreground mt-1">Zero unreviewed flags</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase">Room Health</CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-success">100%</div>
            <p className="text-[11px] text-muted-foreground mt-1">Telemetry streams stable</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <CardTitle className="text-lg">Monitored Exam Rooms</CardTitle>
          <CardDescription>Select an active room to monitor candidates in real time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-[#243249] bg-surface-elevated/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-base text-foreground">Room 1: CS-201 Midterm Exam</span>
                <Badge variant="cyan" className="text-xs">Live</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Assigned Candidates: 1 • Monitoring: Face Count, Audio Decibels, Tab Blur
              </p>
            </div>

            <Button asChild className="bg-primary text-primary-foreground text-xs gap-1.5">
              <Link href="/invigilator?room=cs201">
                <Eye className="h-4 w-4" />
                Launch Live Monitor Grid
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
