'use client';

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Modal } from '@/components/shared/modal';
import { AlertPanel } from '@/components/shared/alert-panel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  bulkImportStudentsAction,
  inviteUserAction,
} from '@/lib/actions/user-actions';
import {
  createCourseAction,
  createExamAction,
} from '@/lib/actions/dashboard-actions';
import type { BulkImportResult, BulkStudentRow } from '@/types/auth';
import type { UserRole } from '@/types/database';
import type { CourseView } from '@/types/dashboard';

export function InviteMemberModal({
  open,
  onClose,
  tenantId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess: (msg: string) => Promise<void> | void;
}) {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await inviteUserAction({ tenantId, email, fullName, role });
    setSaving(false);
    if (!res.success) {
      setError(res.error || 'Failed to invite user.');
      return;
    }
    setEmail('');
    setFullName('');
    onClose();
    await onSuccess(`Invited ${email} (${role}) to institution.`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Invite Institutional Member"
      description="Create an account and assign a verified role within your university tenant."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertPanel tone="critical" title="Invite Failed" description={error} />}
        <div className="space-y-1.5">
          <Label htmlFor="invite-name">Full Name</Label>
          <Input
            id="invite-name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Dr. Priya Nair"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-email">Institutional Email</Label>
          <Input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="priya.nair@university.edu"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="h-9 w-full rounded-lg border border-[#243249] bg-[#0B1220] px-3 text-sm text-[#F8FAFC]"
          >
            <option value="student">Student</option>
            <option value="instructor">Faculty / Instructor</option>
            <option value="invigilator">Invigilator / Proctor</option>
            <option value="admin">University Admin</option>
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Member
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function parseCsvRows(csvText: string): BulkStudentRow[] {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const rows: BulkStudentRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    if (i === 0 && line.toLowerCase().includes('email')) continue;
    const parts = line.split(',').map((p) => p.trim());
    const email = parts[0] || '';
    const fullName = parts[1] || '';
    if (email && email.includes('@')) {
      rows.push({ email, fullName: fullName || email.split('@')[0] || 'Student' });
    }
  }
  return rows;
}

export function BulkCsvModal({
  open,
  onClose,
  tenantId,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  onSuccess: (msg: string) => Promise<void> | void;
}) {
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    const parsed = parseCsvRows(csvText);
    if (parsed.length === 0) {
      setError('No valid email,full_name rows found in CSV.');
      return;
    }
    setImporting(true);
    setError(null);
    const res = await bulkImportStudentsAction(tenantId, parsed);
    setImporting(false);
    if (!res.success || !res.result) {
      setError(res.error || 'Bulk import failed.');
      return;
    }
    setResult(res.result);
    if (res.result.successCount > 0) {
      await onSuccess(`Imported ${res.result.successCount} students cleanly.`);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Bulk CSV Student Import"
      description="Paste comma-separated lines with email, full_name."
      size="md"
    >
      <div className="space-y-4">
        {error && <AlertPanel tone="critical" title="Import Error" description={error} />}
        {result && (
          <AlertPanel
            tone={result.errorCount > 0 ? 'warning' : 'success'}
            title={`Processed ${result.successCount + result.errorCount} rows`}
            description={`Added: ${result.successCount} • Failed: ${result.errorCount}`}
          />
        )}
        <div className="space-y-1.5">
          <Label htmlFor="bulk-csv">Student CSV Rows</Label>
          <textarea
            id="bulk-csv"
            rows={6}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder={'email,full_name\nstudent1@university.edu,Aarav Sharma\nstudent2@university.edu,Maya Patel'}
            className="w-full rounded-lg border border-[#243249] bg-[#0B1220] p-3 font-mono text-xs text-[#F8FAFC]"
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button type="button" onClick={handleImport} disabled={importing}>
            {importing && <Loader2 className="h-4 w-4 animate-spin" />}
            Run Import
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function CreateCourseModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: (msg: string) => Promise<void> | void;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [semester, setSemester] = useState('Fall 2026');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await createCourseAction({ name, code, semester, description });
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setName('');
    setCode('');
    setDescription('');
    onClose();
    await onSuccess(`Created course ${code.toUpperCase()} (${name}).`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Academic Course"
      description="Course codes must match catalog format (e.g., CS-201, MATH-304)."
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertPanel tone="critical" title="Creation Failed" description={error} />}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="course-code">Course Code</Label>
            <Input
              id="course-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="CS-201"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="course-semester">Semester</Label>
            <Input
              id="course-semester"
              required
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              placeholder="Fall 2026"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course-name">Course Title</Label>
          <Input
            id="course-name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Data Structures & Algorithms"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="course-desc">Description</Label>
          <Input
            id="course-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional syllabus summary"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save Course
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export function CreateExamModal({
  open,
  onClose,
  courses,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  courses: CourseView[];
  onSuccess: (msg: string) => Promise<void> | void;
}) {
  const [courseId, setCourseId] = useState(courses[0]?.id || '');
  const [title, setTitle] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [totalPoints, setTotalPoints] = useState(100);
  const [requireCamera, setRequireCamera] = useState(true);
  const [requireAudio, setRequireAudio] = useState(true);
  const [requireFullscreen, setRequireFullscreen] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedCourseId = courseId || courses[0]?.id || '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setError('Create a course first before scheduling an examination.');
      return;
    }
    setSaving(true);
    setError(null);

    const start = new Date(Date.now() + 60 * 60 * 1000);
    const end = new Date(start.getTime() + Math.max(durationMinutes, 60) * 60 * 1000 * 2);

    const res = await createExamAction({
      courseId: selectedCourseId,
      title,
      durationMinutes,
      totalPoints,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      requireCamera,
      requireAudio,
      requireFullscreen,
    });
    setSaving(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    setTitle('');
    onClose();
    await onSuccess(`Created draft examination "${title}".`);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule New Examination"
      description="Configure assessment window and local AI telemetry requirements."
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <AlertPanel tone="critical" title="Creation Failed" description={error} />}
        <div className="space-y-1.5">
          <Label htmlFor="exam-course">Course</Label>
          <select
            id="exam-course"
            value={selectedCourseId}
            onChange={(e) => setCourseId(e.target.value)}
            className="h-9 w-full rounded-lg border border-[#243249] bg-[#0B1220] px-3 text-sm text-[#F8FAFC]"
          >
            {courses.length === 0 ? (
              <option value="">No courses available</option>
            ) : (
              courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </option>
              ))
            )}
          </select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exam-title">Examination Title</Label>
          <Input
            id="exam-title"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Midterm Assessment"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="exam-duration">Duration (Minutes)</Label>
            <Input
              id="exam-duration"
              type="number"
              min={5}
              max={300}
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="exam-points">Total Points</Label>
            <Input
              id="exam-points"
              type="number"
              min={1}
              max={1000}
              value={totalPoints}
              onChange={(e) => setTotalPoints(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="rounded-xl border border-[#243249] bg-[#0B1220] p-3.5 space-y-2.5 text-xs">
          <p className="font-mono uppercase tracking-wider text-[#94A3B8]">
            Proctoring Guardrails
          </p>
          <label className="flex items-center justify-between cursor-pointer">
            <span>Local MediaPipe Face Monitoring</span>
            <input
              type="checkbox"
              checked={requireCamera}
              onChange={(e) => setRequireCamera(e.target.checked)}
              className="accent-[#38BDF8]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span>Web Audio Acoustic RMS Monitoring</span>
            <input
              type="checkbox"
              checked={requireAudio}
              onChange={(e) => setRequireAudio(e.target.checked)}
              className="accent-[#38BDF8]"
            />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span>Enforce Fullscreen & Visibility Guard</span>
            <input
              type="checkbox"
              checked={requireFullscreen}
              onChange={(e) => setRequireFullscreen(e.target.checked)}
              className="accent-[#38BDF8]"
            />
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || courses.length === 0}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Create Draft Exam
          </Button>
        </div>
      </form>
    </Modal>
  );
}
