import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

function loadEnvLocal(): Record<string, string> {
  const envPath = path.resolve(process.cwd(), '.env.local');
  const out: Record<string, string> = {};
  if (fs.existsSync(envPath)) {
    const raw = fs.readFileSync(envPath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx <= 0) continue;
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      out[key] = val;
    }
  }
  return out;
}

export interface DemoAccount {
  email: string;
  fullName: string;
  role: 'admin' | 'instructor' | 'invigilator' | 'student';
  staffOrStudentId?: string;
  assignedCourseCode?: string;
  label: string;
}

const DEMO_PASSWORD = process.env.EXAMGUARD_DEMO_PASSWORD || 'ExamGuardDemo!2026#';

const CORE_DEMO_ACCOUNTS: DemoAccount[] = [
  {
    email: 'admin@examguard-demo.example.com',
    fullName: 'SRM AP University Administrator',
    role: 'admin',
    staffOrStudentId: 'ADMIN-SRMAP-01',
    label: 'University Administrator',
  },
  {
    email: 'faculty@examguard-demo.example.com',
    fullName: 'Prof. Marcus Sterling (ECE & CSE Faculty)',
    role: 'instructor',
    staffOrStudentId: 'FACULTY-001',
    label: 'Faculty Lead',
  },
  {
    email: 'invigilator@examguard-demo.example.com',
    fullName: 'Amina Patel (Chief Invigilator)',
    role: 'invigilator',
    staffOrStudentId: 'INVIG-001',
    label: 'Chief Invigilator',
  },
  {
    email: 'student1@examguard-demo.example.com',
    fullName: 'Demo Student One',
    role: 'student',
    staffOrStudentId: 'DEMO-S001',
    label: 'Student One',
  },
  {
    email: 'student2@examguard-demo.example.com',
    fullName: 'Demo Student Two',
    role: 'student',
    staffOrStudentId: 'DEMO-S002',
    label: 'Student Two',
  },
];

const INDIVIDUAL_FACULTY_ACCOUNTS: DemoAccount[] = [
  {
    email: 'faculty.cse202.1@example.com',
    fullName: 'Dr. Lipismita Panigrahi',
    role: 'instructor',
    staffOrStudentId: '25065',
    assignedCourseCode: 'CSE202',
    label: 'Faculty CSE202 (Primary)',
  },
  {
    email: 'faculty.cse202.2@example.com',
    fullName: 'Dr. Tabiya Manzoor',
    role: 'instructor',
    staffOrStudentId: '25173',
    assignedCourseCode: 'CSE202',
    label: 'Faculty CSE202 (Co-Instructor)',
  },
  {
    email: 'faculty.cse203.1@example.com',
    fullName: 'Dr. Saduri Das',
    role: 'instructor',
    staffOrStudentId: '26211',
    assignedCourseCode: 'CSE203',
    label: 'Faculty CSE203',
  },
  {
    email: 'faculty.cse204.1@example.com',
    fullName: 'Dr. Abhimanyu Bar',
    role: 'instructor',
    staffOrStudentId: '26021',
    assignedCourseCode: 'CSE204',
    label: 'Faculty CSE204 (Primary)',
  },
  {
    email: 'faculty.cse204.2@example.com',
    fullName: 'Dr. Banovoth Raja Sekhar',
    role: 'instructor',
    staffOrStudentId: '25403',
    assignedCourseCode: 'CSE204',
    label: 'Faculty CSE204 (Co-Instructor)',
  },
  {
    email: 'faculty.cse207.1@example.com',
    fullName: 'Dr. Manoj Kumar Yadav',
    role: 'instructor',
    staffOrStudentId: '25235',
    assignedCourseCode: 'CSE207',
    label: 'Faculty CSE207 (Primary)',
  },
  {
    email: 'faculty.cse207.2@example.com',
    fullName: 'Mr. Harsh Ranjan',
    role: 'instructor',
    staffOrStudentId: '26382',
    assignedCourseCode: 'CSE207',
    label: 'Faculty CSE207 (Co-Instructor)',
  },
  {
    email: 'faculty.cse213.1@example.com',
    fullName: 'Mr. Balvinder Singh Bondili',
    role: 'instructor',
    staffOrStudentId: '24101',
    assignedCourseCode: 'CSE213',
    label: 'Faculty CSE213 (Primary)',
  },
  {
    email: 'faculty.cse213.2@example.com',
    fullName: 'Mr. S Gavaskar',
    role: 'instructor',
    staffOrStudentId: '24106',
    assignedCourseCode: 'CSE213',
    label: 'Faculty CSE213 (Co-Instructor)',
  },
  {
    email: 'faculty.ent243.1@example.com',
    fullName: 'Ms. Divya Veshapogu',
    role: 'instructor',
    staffOrStudentId: '22237',
    assignedCourseCode: 'ENT243',
    label: 'Faculty ENT243',
  },
  {
    email: 'faculty.sec203.1@example.com',
    fullName: 'Mr. Skilling Course Five Four',
    role: 'instructor',
    staffOrStudentId: 'TMP054',
    assignedCourseCode: 'SEC203',
    label: 'Faculty SEC203 (Skill Trainer)',
  },
];

interface CourseSpec {
  code: string;
  name: string;
  display: string;
  ltpc: string;
  primaryFacultyEmail: string;
  allFaculty: { name: string; staffId: string; email: string }[];
  rooms: string[];
}

const COURSES_SPEC: CourseSpec[] = [
  {
    code: 'CSE-202',
    name: 'Object Oriented Programming with C++',
    display: 'CSE 202',
    ltpc: '3-0-1-4',
    primaryFacultyEmail: 'faculty.cse202.1@example.com',
    allFaculty: [
      { name: 'Dr. Lipismita Panigrahi', staffId: '25065', email: 'faculty.cse202.1@example.com' },
      { name: 'Dr. Tabiya Manzoor', staffId: '25173', email: 'faculty.cse202.2@example.com' },
    ],
    rooms: ['C305', 'C510'],
  },
  {
    code: 'CSE-203',
    name: 'Discrete Mathematics',
    display: 'CSE 203',
    ltpc: '3-0-0-3',
    primaryFacultyEmail: 'faculty.cse203.1@example.com',
    allFaculty: [
      { name: 'Dr. Saduri Das', staffId: '26211', email: 'faculty.cse203.1@example.com' },
    ],
    rooms: ['C510'],
  },
  {
    code: 'CSE-204',
    name: 'Design and Analysis of Algorithms',
    display: 'CSE 204',
    ltpc: '3-0-1-4',
    primaryFacultyEmail: 'faculty.cse204.1@example.com',
    allFaculty: [
      { name: 'Dr. Abhimanyu Bar', staffId: '26021', email: 'faculty.cse204.1@example.com' },
      { name: 'Dr. Banovoth Raja Sekhar', staffId: '25403', email: 'faculty.cse204.2@example.com' },
    ],
    rooms: ['C510', 'C804'],
  },
  {
    code: 'CSE-207',
    name: 'Digital Electronics',
    display: 'CSE 207',
    ltpc: '3-0-1-4',
    primaryFacultyEmail: 'faculty.cse207.1@example.com',
    allFaculty: [
      { name: 'Dr. Manoj Kumar Yadav', staffId: '25235', email: 'faculty.cse207.1@example.com' },
      { name: 'Mr. Harsh Ranjan', staffId: '26382', email: 'faculty.cse207.2@example.com' },
    ],
    rooms: ['C404', 'C510', 'S514'],
  },
  {
    code: 'CSE-213',
    name: 'Advanced Java Programming',
    display: 'CSE 213',
    ltpc: '3-0-1-4',
    primaryFacultyEmail: 'faculty.cse213.1@example.com',
    allFaculty: [
      { name: 'Mr. Balvinder Singh Bondili', staffId: '24101', email: 'faculty.cse213.1@example.com' },
      { name: 'Mr. S Gavaskar', staffId: '24106', email: 'faculty.cse213.2@example.com' },
    ],
    rooms: ['C510', 'C806'],
  },
  {
    code: 'ENT-243',
    name: 'Essence of Entrepreneurship',
    display: 'ENT 243',
    ltpc: '3-0-0-3',
    primaryFacultyEmail: 'faculty.ent243.1@example.com',
    allFaculty: [
      { name: 'Ms. Divya Veshapogu', staffId: '22237', email: 'faculty.ent243.1@example.com' },
    ],
    rooms: ['Auditorium / Seminar Hall'],
  },
  {
    code: 'SEC-203',
    name: 'Aptitude for Engineers - III',
    display: 'SEC 203',
    ltpc: '1-0-1-2',
    primaryFacultyEmail: 'faculty.sec203.1@example.com',
    allFaculty: [
      { name: 'Mr. Skilling Course Five Four', staffId: 'TMP054', email: 'faculty.sec203.1@example.com' },
    ],
    rooms: ['C510'],
  },
];

interface TimetableSlot {
  day: string;
  period: number;
  courseCode: string;
  classroom: string;
  startTime: string;
  endTime: string;
}

const TIMETABLE_SLOTS: TimetableSlot[] = [
  // Monday
  { day: 'Monday', period: 1, courseCode: 'CSE207', classroom: 'C404', startTime: '09:00', endTime: '09:50' },
  { day: 'Monday', period: 2, courseCode: 'CSE207', classroom: 'C404', startTime: '10:00', endTime: '10:50' },
  { day: 'Monday', period: 3, courseCode: 'CSE203', classroom: 'C510', startTime: '11:00', endTime: '11:50' },
  { day: 'Monday', period: 4, courseCode: 'CSE203', classroom: 'C510', startTime: '12:00', endTime: '12:50' },
  { day: 'Monday', period: 7, courseCode: 'CSE207', classroom: 'C510', startTime: '15:00', endTime: '15:50' },
  { day: 'Monday', period: 8, courseCode: 'ENT243', classroom: 'Seminar Hall', startTime: '16:00', endTime: '17:30' },

  // Tuesday
  { day: 'Tuesday', period: 1, courseCode: 'CSE213', classroom: 'C806', startTime: '09:00', endTime: '09:50' },
  { day: 'Tuesday', period: 2, courseCode: 'CSE213', classroom: 'C806', startTime: '10:00', endTime: '10:50' },
  { day: 'Tuesday', period: 4, courseCode: 'CSE202', classroom: 'C510', startTime: '12:00', endTime: '12:50' },
  { day: 'Tuesday', period: 6, courseCode: 'CSE207', classroom: 'S514', startTime: '14:00', endTime: '14:50' },
  { day: 'Tuesday', period: 7, courseCode: 'CSE207', classroom: 'S514', startTime: '15:00', endTime: '15:50' },
  { day: 'Tuesday', period: 8, courseCode: 'ENT243', classroom: 'Seminar Hall', startTime: '16:00', endTime: '17:30' },

  // Wednesday
  { day: 'Wednesday', period: 1, courseCode: 'CSE204', classroom: 'C510', startTime: '09:00', endTime: '09:50' },
  { day: 'Wednesday', period: 3, courseCode: 'CSE202', classroom: 'C305', startTime: '11:00', endTime: '11:50' },
  { day: 'Wednesday', period: 4, courseCode: 'CSE202', classroom: 'C305', startTime: '12:00', endTime: '12:50' },
  { day: 'Wednesday', period: 6, courseCode: 'CSE213', classroom: 'C510', startTime: '14:00', endTime: '14:50' },

  // Thursday
  { day: 'Thursday', period: 1, courseCode: 'CSE203', classroom: 'C510', startTime: '09:00', endTime: '09:50' },
  { day: 'Thursday', period: 3, courseCode: 'CSE202', classroom: 'C510', startTime: '11:00', endTime: '11:50' },
  { day: 'Thursday', period: 4, courseCode: 'CSE202', classroom: 'C510', startTime: '12:00', endTime: '12:50' },
  { day: 'Thursday', period: 7, courseCode: 'CSE204', classroom: 'C804', startTime: '15:00', endTime: '15:50' },
  { day: 'Thursday', period: 8, courseCode: 'CSE204', classroom: 'C804', startTime: '16:00', endTime: '17:30' },

  // Friday
  { day: 'Friday', period: 1, courseCode: 'SEC203', classroom: 'C510', startTime: '09:00', endTime: '09:50' },
  { day: 'Friday', period: 2, courseCode: 'SEC203', classroom: 'C510', startTime: '10:00', endTime: '10:50' },
  { day: 'Friday', period: 3, courseCode: 'CSE204', classroom: 'C510', startTime: '11:00', endTime: '11:50' },
  { day: 'Friday', period: 4, courseCode: 'CSE204', classroom: 'C510', startTime: '12:00', endTime: '12:50' },
  { day: 'Friday', period: 6, courseCode: 'SEC203', classroom: 'C510', startTime: '14:00', endTime: '14:50' },
  { day: 'Friday', period: 7, courseCode: 'CSE213', classroom: 'C510', startTime: '15:00', endTime: '15:50' },
  { day: 'Friday', period: 8, courseCode: 'CSE213', classroom: 'C510', startTime: '16:00', endTime: '17:30' },
];

export {
  CORE_DEMO_ACCOUNTS,
  INDIVIDUAL_FACULTY_ACCOUNTS,
  COURSES_SPEC,
  TIMETABLE_SLOTS,
  DEMO_PASSWORD,
  loadEnvLocal,
};
