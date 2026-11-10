'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/providers/auth-provider';
import { UserService } from '@/lib/services/users';
import type { UserRole } from '@/types/database';
import type { BulkImportResult } from '@/types/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  UserPlus,
  UploadCloud,
  Shield,
  GraduationCap,
  BookOpen,
  Eye,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Trash2,
  RefreshCw,
} from 'lucide-react';

interface TenantUserView {
  userId: string;
  tenantId: string;
  role: UserRole;
  createdAt: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
}

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const tenantId = user?.activeTenant?.id || '55d810b1-0555-43d2-97e2-d4a420b6173e';

  const [usersList, setUsersList] = useState<TenantUserView[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Invite User Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteFullName, setInviteFullName] = useState('');
  const [inviteRole, setInviteRole] = useState<UserRole>('student');
  const [isInviting, setIsInviting] = useState(false);

  // Bulk Import Modal State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [csvContent, setCsvContent] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkImportResult | null>(null);

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setActionError(null);
    try {
      const data = await UserService.getTenantUsers(tenantId);
      setUsersList(data);
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to fetch users');
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    let mounted = true;
    UserService.getTenantUsers(tenantId)
      .then((data) => {
        if (mounted) setUsersList(data);
      })
      .catch((err: unknown) => {
        if (mounted) setActionError((err as Error).message || 'Failed to fetch users');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [tenantId]);

  // Handle single user invitation
  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail || !inviteFullName) return;

    setIsInviting(true);
    setActionError(null);
    try {
      await UserService.inviteUser({
        tenantId,
        email: inviteEmail,
        fullName: inviteFullName,
        role: inviteRole,
      });
      setActionSuccess(`Successfully invited ${inviteEmail} as ${inviteRole}.`);
      setShowInviteModal(false);
      setInviteEmail('');
      setInviteFullName('');
      await loadUsers();
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to invite user');
    } finally {
      setIsInviting(false);
    }
  };

  // Handle bulk CSV student import
  const handleBulkImport = async () => {
    if (!csvContent.trim()) return;

    setIsImporting(true);
    setBulkResult(null);
    try {
      const parsedRows = UserService.parseStudentCsv(csvContent);
      if (parsedRows.length === 0) {
        throw new Error('CSV is empty or could not be parsed.');
      }
      const result = await UserService.bulkImportStudents(tenantId, parsedRows);
      setBulkResult(result);
      if (result.successCount > 0) {
        setActionSuccess(`Bulk import complete: ${result.successCount} students added.`);
        await loadUsers();
      }
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Bulk import failed');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle role modification
  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    try {
      await UserService.updateUserRole(tenantId, targetUserId, newRole);
      setActionSuccess('User role updated successfully.');
      await loadUsers();
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to update user role');
    }
  };

  // Handle user removal
  const handleRemoveUser = async (targetUserId: string) => {
    if (!confirm('Are you sure you want to remove this user from the institution?')) return;
    try {
      await UserService.removeUserFromTenant(tenantId, targetUserId);
      setActionSuccess('User removed successfully.');
      await loadUsers();
    } catch (err: unknown) {
      setActionError((err as Error).message || 'Failed to remove user');
    }
  };

  // Metric counts
  const studentCount = usersList.filter((u) => u.role === 'student').length;
  const facultyCount = usersList.filter((u) => u.role === 'instructor').length;
  const invigilatorCount = usersList.filter((u) => u.role === 'invigilator').length;
  const adminCount = usersList.filter((u) => u.role === 'admin').length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">
            University Administration & Roles
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage institutional users, assign proctoring authorities, and import student rosters
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            onClick={loadUsers}
            disabled={isLoading}
            className="border-border text-xs gap-1.5"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            variant="outline"
            onClick={() => setShowBulkModal(true)}
            className="border-primary/40 text-primary hover:bg-primary/10 text-xs gap-1.5"
          >
            <UploadCloud className="h-4 w-4" />
            Bulk CSV Import
          </Button>

          <Button
            onClick={() => setShowInviteModal(true)}
            className="bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90 text-xs gap-1.5"
          >
            <UserPlus className="h-4 w-4" />
            Invite Member
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {actionError && (
        <div className="flex items-center justify-between rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-xs hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Enrolled Students
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{studentCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Verified exam candidates</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Faculty / Instructors
            </CardTitle>
            <BookOpen className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{facultyCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Exam authors & graders</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Invigilators / Proctors
            </CardTitle>
            <Eye className="h-4 w-4 text-purple" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{invigilatorCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Live monitoring staff</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Administrators
            </CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-foreground">{adminCount}</div>
            <p className="text-[11px] text-muted-foreground mt-1">Full system privilege</p>
          </CardContent>
        </Card>
      </div>

      {/* User Directory Table */}
      <Card className="border-border/80 bg-card/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Institutional Directory</CardTitle>
              <CardDescription>
                All registered members and assigned authorities in this tenant
              </CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {usersList.length} Total Users
            </Badge>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm">Loading member directory...</span>
            </div>
          ) : usersList.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No members found in this institution. Invite your first colleague or import students!
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border/80 text-xs uppercase text-muted-foreground bg-surface-elevated/40">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned On</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {usersList.map((m) => (
                    <tr key={`${m.tenantId}-${m.userId}-${m.role}`} className="hover:bg-surface-elevated/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{m.fullName}</span>
                          <span className="text-xs text-muted-foreground font-mono">{m.email}</span>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.userId, e.target.value as UserRole)}
                          className="rounded border border-border bg-surface-elevated px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          <option value="student">Student</option>
                          <option value="instructor">Instructor / Faculty</option>
                          <option value="invigilator">Invigilator</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>

                      <td className="py-3 px-4 text-xs text-muted-foreground font-mono">
                        {new Date(m.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveUser(m.userId)}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md border-border bg-card shadow-2xl">
            <CardHeader>
              <CardTitle>Invite New Institutional Member</CardTitle>
              <CardDescription>
                Assign role and provide login access to university staff or candidates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleInviteSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="invFullName">Full Name</Label>
                  <Input
                    id="invFullName"
                    placeholder="Prof. Marie Curie"
                    value={inviteFullName}
                    onChange={(e) => setInviteFullName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="invEmail">Email Address</Label>
                  <Input
                    id="invEmail"
                    type="email"
                    placeholder="curie@university.edu"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>Assigned Role</Label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                    className="w-full rounded-lg border border-border bg-surface-elevated px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="student">Student (Examinee)</option>
                    <option value="instructor">Faculty / Instructor</option>
                    <option value="invigilator">Invigilator (Proctor)</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowInviteModal(false)}
                    disabled={isInviting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isInviting} className="bg-primary text-primary-foreground">
                    {isInviting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                    Send Invitation
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg border-border bg-card shadow-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UploadCloud className="h-5 w-5 text-primary" />
                Bulk Student CSV Import
              </CardTitle>
              <CardDescription>
                Quickly onboard entire course cohorts by pasting CSV roster data
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Format: email, full_name, student_id (optional)</Label>
                <textarea
                  rows={6}
                  placeholder={`alex@university.edu, Alex Smith, STU101\nsam@university.edu, Sam Wilson, STU102\njordan@university.edu, Jordan Lee, STU103`}
                  value={csvContent}
                  onChange={(e) => setCsvContent(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface-elevated p-3 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {bulkResult && (
                <div className="rounded-lg border border-border bg-surface-elevated/40 p-3 text-xs space-y-1.5">
                  <div className="flex items-center gap-2 text-success font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Imported {bulkResult.successCount} candidates successfully</span>
                  </div>
                  {bulkResult.errorCount > 0 && (
                    <div className="text-destructive">
                      <span>Failed ({bulkResult.errorCount}): </span>
                      {bulkResult.errors.map((err, i) => (
                        <div key={i} className="pl-2">
                          • {err.email}: {err.reason}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowBulkModal(false);
                    setBulkResult(null);
                    setCsvContent('');
                  }}
                  disabled={isImporting}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={isImporting || !csvContent.trim()}
                  className="bg-primary text-primary-foreground"
                >
                  {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : null}
                  Import Candidates
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
