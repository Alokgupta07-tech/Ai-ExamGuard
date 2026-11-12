'use client';

import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Clock,
  Download,
  GraduationCap,
  MapPin,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface TimetableSlotItem {
  day: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday';
  period: number;
  periodLabel: string;
  courseCode: string;
  courseName: string;
  facultyName: string;
  facultyStaffId?: string;
  classroom: string;
  startTime: string;
  endTime: string;
  colorTone: 'teal' | 'blue' | 'indigo' | 'amber' | 'emerald' | 'purple' | 'slate';
}

export const PERIOD_HEADERS = [
  { period: 1, label: 'P1 (09:00 - 09:50)' },
  { period: 2, label: 'P2 (10:00 - 10:50)' },
  { period: 3, label: 'P3 (11:00 - 11:50)' },
  { period: 4, label: 'P4 (12:00 - 12:50)' },
  { period: 5, label: 'LUNCH (12:50 - 14:00)' },
  { period: 6, label: 'P5 (14:00 - 14:50)' },
  { period: 7, label: 'P6 (15:00 - 15:50)' },
  { period: 8, label: 'P7 (16:00 - 17:30)' },
];

export const SRM_COURSES = [
  {
    code: 'CSE-202',
    name: 'Object Oriented Programming with C++',
    ltpc: '3-0-1-4',
    instructors: ['Dr. Lipismita Panigrahi (25065)', 'Dr. Tabiya Manzoor (25173)'],
    rooms: ['C305', 'C510'],
    tone: 'teal' as const,
  },
  {
    code: 'CSE-203',
    name: 'Discrete Mathematics',
    ltpc: '3-0-0-3',
    instructors: ['Dr. Saduri Das (26211)'],
    rooms: ['C510'],
    tone: 'indigo' as const,
  },
  {
    code: 'CSE-204',
    name: 'Design and Analysis of Algorithms',
    ltpc: '3-0-1-4',
    instructors: ['Dr. Abhimanyu Bar (26021)', 'Dr. Banovoth Raja Sekhar (25403)'],
    rooms: ['C510', 'C804'],
    tone: 'blue' as const,
  },
  {
    code: 'CSE-207',
    name: 'Digital Electronics',
    ltpc: '3-0-1-4',
    instructors: ['Dr. Manoj Kumar Yadav (25235)', 'Mr. Harsh Ranjan (26382)'],
    rooms: ['C404', 'C510', 'S514'],
    tone: 'purple' as const,
  },
  {
    code: 'CSE-213',
    name: 'Advanced Java Programming',
    ltpc: '3-0-1-4',
    instructors: ['Mr. Balvinder Singh Bondili (24101)', 'Mr. S Gavaskar (24106)'],
    rooms: ['C510', 'C806'],
    tone: 'emerald' as const,
  },
  {
    code: 'ENT-243',
    name: 'Essence of Entrepreneurship',
    ltpc: '3-0-0-3',
    instructors: ['Ms. Divya Veshapogu (22237)'],
    rooms: ['Seminar Hall / Auditorium'],
    tone: 'amber' as const,
  },
  {
    code: 'SEC-203',
    name: 'Aptitude for Engineers - III',
    ltpc: '1-0-1-2',
    instructors: ['Skill Development Lead (TMP054)'],
    rooms: ['C510'],
    tone: 'slate' as const,
  },
];

export const SRM_TIMETABLE_DATA: TimetableSlotItem[] = [
  // Monday
  { day: 'Monday', period: 1, periodLabel: '09:00 - 09:50', courseCode: 'CSE-207', courseName: 'Digital Electronics', facultyName: 'Dr. Manoj Kumar Yadav', classroom: 'C404', startTime: '09:00', endTime: '09:50', colorTone: 'purple' },
  { day: 'Monday', period: 2, periodLabel: '10:00 - 10:50', courseCode: 'CSE-207', courseName: 'Digital Electronics Lab', facultyName: 'Mr. Harsh Ranjan', classroom: 'C404', startTime: '10:00', endTime: '10:50', colorTone: 'purple' },
  { day: 'Monday', period: 3, periodLabel: '11:00 - 11:50', courseCode: 'CSE-203', courseName: 'Discrete Mathematics', facultyName: 'Dr. Saduri Das', classroom: 'C510', startTime: '11:00', endTime: '11:50', colorTone: 'indigo' },
  { day: 'Monday', period: 4, periodLabel: '12:00 - 12:50', courseCode: 'CSE-203', courseName: 'Discrete Mathematics Tutorial', facultyName: 'Dr. Saduri Das', classroom: 'C510', startTime: '12:00', endTime: '12:50', colorTone: 'indigo' },
  { day: 'Monday', period: 7, periodLabel: '15:00 - 15:50', courseCode: 'CSE-207', courseName: 'Digital Electronics (Theory)', facultyName: 'Dr. Manoj Kumar Yadav', classroom: 'C510', startTime: '15:00', endTime: '15:50', colorTone: 'purple' },
  { day: 'Monday', period: 8, periodLabel: '16:00 - 17:30', courseCode: 'ENT-243', courseName: 'Essence of Entrepreneurship', facultyName: 'Ms. Divya Veshapogu', classroom: 'Seminar Hall', startTime: '16:00', endTime: '17:30', colorTone: 'amber' },

  // Tuesday
  { day: 'Tuesday', period: 1, periodLabel: '09:00 - 09:50', courseCode: 'CSE-213', courseName: 'Advanced Java Programming', facultyName: 'Mr. Balvinder Singh Bondili', classroom: 'C806', startTime: '09:00', endTime: '09:50', colorTone: 'emerald' },
  { day: 'Tuesday', period: 2, periodLabel: '10:00 - 10:50', courseCode: 'CSE-213', courseName: 'Advanced Java Lab', facultyName: 'Mr. S Gavaskar', classroom: 'C806', startTime: '10:00', endTime: '10:50', colorTone: 'emerald' },
  { day: 'Tuesday', period: 4, periodLabel: '12:00 - 12:50', courseCode: 'CSE-202', courseName: 'OOP with C++', facultyName: 'Dr. Lipismita Panigrahi', classroom: 'C510', startTime: '12:00', endTime: '12:50', colorTone: 'teal' },
  { day: 'Tuesday', period: 6, periodLabel: '14:00 - 14:50', courseCode: 'CSE-207', courseName: 'Digital Electronics (Practical)', facultyName: 'Mr. Harsh Ranjan', classroom: 'S514', startTime: '14:00', endTime: '14:50', colorTone: 'purple' },
  { day: 'Tuesday', period: 7, periodLabel: '15:00 - 15:50', courseCode: 'CSE-207', courseName: 'Digital Electronics (Tutorial)', facultyName: 'Dr. Manoj Kumar Yadav', classroom: 'S514', startTime: '15:00', endTime: '15:50', colorTone: 'purple' },
  { day: 'Tuesday', period: 8, periodLabel: '16:00 - 17:30', courseCode: 'ENT-243', courseName: 'Entrepreneurship Pitch Prep', facultyName: 'Ms. Divya Veshapogu', classroom: 'Seminar Hall', startTime: '16:00', endTime: '17:30', colorTone: 'amber' },

  // Wednesday
  { day: 'Wednesday', period: 1, periodLabel: '09:00 - 09:50', courseCode: 'CSE-204', courseName: 'Design & Analysis of Algorithms', facultyName: 'Dr. Abhimanyu Bar', classroom: 'C510', startTime: '09:00', endTime: '09:50', colorTone: 'blue' },
  { day: 'Wednesday', period: 3, periodLabel: '11:00 - 11:50', courseCode: 'CSE-202', courseName: 'OOP with C++ (Lab A)', facultyName: 'Dr. Tabiya Manzoor', classroom: 'C305', startTime: '11:00', endTime: '11:50', colorTone: 'teal' },
  { day: 'Wednesday', period: 4, periodLabel: '12:00 - 12:50', courseCode: 'CSE-202', courseName: 'OOP with C++ (Lab B)', facultyName: 'Dr. Lipismita Panigrahi', classroom: 'C305', startTime: '12:00', endTime: '12:50', colorTone: 'teal' },
  { day: 'Wednesday', period: 6, periodLabel: '14:00 - 14:50', courseCode: 'CSE-213', courseName: 'Advanced Java (Theory)', facultyName: 'Mr. Balvinder Singh Bondili', classroom: 'C510', startTime: '14:00', endTime: '14:50', colorTone: 'emerald' },

  // Thursday
  { day: 'Thursday', period: 1, periodLabel: '09:00 - 09:50', courseCode: 'CSE-203', courseName: 'Discrete Mathematics (Advanced)', facultyName: 'Dr. Saduri Das', classroom: 'C510', startTime: '09:00', endTime: '09:50', colorTone: 'indigo' },
  { day: 'Thursday', period: 3, periodLabel: '11:00 - 11:50', courseCode: 'CSE-202', courseName: 'OOP with C++ (Theory)', facultyName: 'Dr. Lipismita Panigrahi', classroom: 'C510', startTime: '11:00', endTime: '11:50', colorTone: 'teal' },
  { day: 'Thursday', period: 4, periodLabel: '12:00 - 12:50', courseCode: 'CSE-202', courseName: 'OOP with C++ (Tutorial)', facultyName: 'Dr. Tabiya Manzoor', classroom: 'C510', startTime: '12:00', endTime: '12:50', colorTone: 'teal' },
  { day: 'Thursday', period: 7, periodLabel: '15:00 - 15:50', courseCode: 'CSE-204', courseName: 'Algorithms Lab (Session 1)', facultyName: 'Dr. Banovoth Raja Sekhar', classroom: 'C804', startTime: '15:00', endTime: '15:50', colorTone: 'blue' },
  { day: 'Thursday', period: 8, periodLabel: '16:00 - 17:30', courseCode: 'CSE-204', courseName: 'Algorithms Lab (Session 2)', facultyName: 'Dr. Abhimanyu Bar', classroom: 'C804', startTime: '16:00', endTime: '17:30', colorTone: 'blue' },

  // Friday
  { day: 'Friday', period: 1, periodLabel: '09:00 - 09:50', courseCode: 'SEC-203', courseName: 'Aptitude for Engineers - III', facultyName: 'Skill Trainer', classroom: 'C510', startTime: '09:00', endTime: '09:50', colorTone: 'slate' },
  { day: 'Friday', period: 2, periodLabel: '10:00 - 10:50', courseCode: 'SEC-203', courseName: 'Employability Skills Lab', facultyName: 'Skill Trainer', classroom: 'C510', startTime: '10:00', endTime: '10:50', colorTone: 'slate' },
  { day: 'Friday', period: 3, periodLabel: '11:00 - 11:50', courseCode: 'CSE-204', courseName: 'Design & Analysis of Algorithms', facultyName: 'Dr. Abhimanyu Bar', classroom: 'C510', startTime: '11:00', endTime: '11:50', colorTone: 'blue' },
  { day: 'Friday', period: 4, periodLabel: '12:00 - 12:50', courseCode: 'CSE-204', courseName: 'Algorithms Complexity Analysis', facultyName: 'Dr. Banovoth Raja Sekhar', classroom: 'C510', startTime: '12:00', endTime: '12:50', colorTone: 'blue' },
  { day: 'Friday', period: 6, periodLabel: '14:00 - 14:50', courseCode: 'SEC-203', courseName: 'Mock Corporate Assessment', facultyName: 'Skill Trainer', classroom: 'C510', startTime: '14:00', endTime: '14:50', colorTone: 'slate' },
  { day: 'Friday', period: 7, periodLabel: '15:00 - 15:50', courseCode: 'CSE-213', courseName: 'Advanced Java (Streams & Concurrency)', facultyName: 'Mr. Balvinder Singh Bondili', classroom: 'C510', startTime: '15:00', endTime: '15:50', colorTone: 'emerald' },
  { day: 'Friday', period: 8, periodLabel: '16:00 - 17:30', courseCode: 'CSE-213', courseName: 'Java Enterprise Workshop', facultyName: 'Mr. S Gavaskar', classroom: 'C510', startTime: '16:00', endTime: '17:30', colorTone: 'emerald' },
];

const DAYS: Array<'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday'> = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
];

export function AcademicTimetableGrid({
  className,
  studentMode = false,
}: {
  className?: string;
  studentMode?: boolean;
}) {
  const [selectedDay, setSelectedDay] = useState<string>('All');
  const [selectedCourse, setSelectedCourse] = useState<string>('All');

  const filteredSlots = useMemo(() => {
    return SRM_TIMETABLE_DATA.filter((slot) => {
      if (selectedDay !== 'All' && slot.day !== selectedDay) return false;
      if (selectedCourse !== 'All' && slot.courseCode !== selectedCourse) return false;
      return true;
    });
  }, [selectedDay, selectedCourse]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Top Filter and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            <h3 className="font-heading text-lg font-semibold text-foreground">
              SRM University–AP Academic Timetable
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            B.Tech Computer Science and Engineering (Year 2, Semester III) · Neerukonda Campus
          </p>
        </div>

        {/* Day Selectors */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {['All', ...DAYS].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(d)}
              className={cn(
                'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer border',
                selectedDay === d
                  ? 'border-primary bg-primary text-primary-foreground font-semibold shadow-xs'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground hover:bg-surface-elevated'
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Courses Summary Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Filter Course:
        </span>
        <button
          type="button"
          onClick={() => setSelectedCourse('All')}
          className={cn(
            'rounded-md px-2 py-0.5 text-xs font-mono transition-colors border',
            selectedCourse === 'All'
              ? 'border-primary bg-primary/15 text-primary font-semibold'
              : 'border-border bg-card text-muted-foreground hover:text-foreground'
          )}
        >
          All (7)
        </button>
        {SRM_COURSES.map((c) => (
          <button
            key={c.code}
            type="button"
            onClick={() => setSelectedCourse(c.code)}
            className={cn(
              'rounded-md px-2 py-0.5 text-xs font-mono transition-colors border',
              selectedCourse === c.code
                ? 'border-primary bg-primary/15 text-primary font-semibold'
                : 'border-border bg-card text-muted-foreground hover:text-foreground'
            )}
          >
            {c.code}
          </button>
        ))}
      </div>

      {/* Desktop Weekly Grid (visible when All is selected on >= md screens) */}
      {selectedDay === 'All' && (
        <div className="hidden lg:block rounded-xl border border-border bg-card shadow-[0_1px_3px_rgba(24,35,33,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-border bg-surface-elevated/80">
                  <th className="p-3 font-semibold text-muted-foreground uppercase tracking-wider w-24">
                    Day
                  </th>
                  {PERIOD_HEADERS.map((h) => (
                    <th
                      key={h.period}
                      className={cn(
                        'p-2.5 font-semibold text-muted-foreground text-center border-l border-border/60',
                        h.period === 5 && 'bg-muted/40 w-16'
                      )}
                    >
                      {h.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {DAYS.map((day) => {
                  const daySlots = SRM_TIMETABLE_DATA.filter((s) => s.day === day);
                  return (
                    <tr key={day} className="hover:bg-surface-elevated/40 transition-colors">
                      <td className="p-3 font-semibold text-foreground font-heading border-r border-border/60 bg-surface-elevated/30">
                        {day}
                      </td>
                      {PERIOD_HEADERS.map((ph) => {
                        if (ph.period === 5) {
                          return (
                            <td
                              key={ph.period}
                              className="p-1 bg-muted/20 text-center text-[10px] text-muted-foreground font-mono border-l border-border/60"
                            >
                              Lunch
                            </td>
                          );
                        }

                        const match = daySlots.find((s) => s.period === ph.period);
                        const isMatchFilter =
                          match && (selectedCourse === 'All' || match.courseCode === selectedCourse);

                        return (
                          <td
                            key={ph.period}
                            className="p-2 border-l border-border/60 align-top min-w-[125px]"
                          >
                            {match && isMatchFilter ? (
                              <div
                                className={cn(
                                  'p-2 rounded-lg border text-left space-y-1 shadow-xs transition-transform hover:-translate-y-0.5',
                                  match.colorTone === 'teal'
                                    ? 'border-teal-500/30 bg-teal-500/10 text-teal-900 dark:text-teal-200'
                                    : match.colorTone === 'blue'
                                    ? 'border-blue-500/30 bg-blue-500/10 text-blue-900 dark:text-blue-200'
                                    : match.colorTone === 'indigo'
                                    ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-900 dark:text-indigo-200'
                                    : match.colorTone === 'purple'
                                    ? 'border-purple-500/30 bg-purple-500/10 text-purple-900 dark:text-purple-200'
                                    : match.colorTone === 'amber'
                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200'
                                    : match.colorTone === 'emerald'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:text-emerald-200'
                                    : 'border-slate-500/30 bg-slate-500/10 text-slate-900 dark:text-slate-200'
                                )}
                              >
                                <div className="flex items-center justify-between font-mono font-bold text-[11px]">
                                  <span>{match.courseCode}</span>
                                  <span className="text-[10px] opacity-80">{match.classroom}</span>
                                </div>
                                <p className="font-medium text-[11px] line-clamp-1 leading-tight">
                                  {match.courseName}
                                </p>
                                <p className="text-[10px] opacity-75 truncate">
                                  {match.facultyName}
                                </p>
                              </div>
                            ) : match ? (
                              <div className="opacity-30 p-1.5 text-center font-mono text-[10px]">
                                {match.courseCode}
                              </div>
                            ) : (
                              <div className="h-full flex items-center justify-center text-muted-foreground/30 text-[10px]">
                                —
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mobile & Filtered Card Schedule View */}
      <div className={cn(selectedDay === 'All' && 'lg:hidden', 'space-y-3')}>
        {filteredSlots.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-border bg-card text-muted-foreground text-sm">
            No academic sessions scheduled for this selection.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredSlots.map((slot, idx) => (
              <div
                key={`${slot.day}-${slot.period}-${idx}`}
                className="rounded-xl border border-border bg-card p-4 space-y-2 shadow-xs transition-all hover:border-primary/40"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-surface-elevated text-primary border border-border">
                      {slot.courseCode}
                    </span>
                    <span className="text-xs font-semibold text-foreground">
                      {slot.day} · Period {slot.period}
                    </span>
                  </div>
                  <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {slot.periodLabel}
                  </span>
                </div>

                <div>
                  <h4 className="font-medium text-sm text-foreground">{slot.courseName}</h4>
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-1.5">
                    <span className="inline-flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-primary" />
                      {slot.facultyName}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      Room {slot.classroom}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Course Catalog & Faculty Directory Box */}
      <div className="rounded-xl border border-border bg-surface-elevated/40 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h4 className="font-heading text-sm font-semibold text-foreground">
              Enrolled Course Directory & Instructors
            </h4>
          </div>
          <span className="text-xs font-mono text-muted-foreground">
            Academic Year 2026–27
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {SRM_COURSES.map((course) => (
            <div
              key={course.code}
              className="p-3 rounded-lg border border-border bg-card space-y-1.5 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-primary">{course.code}</span>
                <span className="font-mono text-[10px] text-muted-foreground bg-surface-elevated px-1.5 py-0.5 rounded">
                  LTPC: {course.ltpc}
                </span>
              </div>
              <p className="font-medium text-foreground line-clamp-1">{course.name}</p>
              <p className="text-[11px] text-muted-foreground truncate">
                Faculty: {course.instructors.join(', ')}
              </p>
              <p className="text-[10px] text-muted-foreground/80">
                Classrooms: {course.rooms.join(', ')}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
