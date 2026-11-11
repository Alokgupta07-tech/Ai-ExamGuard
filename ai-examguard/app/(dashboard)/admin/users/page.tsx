'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { AdminWorkspace } from '@/components/dashboards/admin/admin-workspace';
import { LoadingSkeleton } from '@/components/shared/loading-skeleton';
import type { UserRole } from '@/types/database';

function AdminUsersContent() {
  const searchParams = useSearchParams();
  const roleParam = searchParams.get('role') as UserRole | null;
  return <AdminWorkspace section="users" initialRoleFilter={roleParam} />;
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={<LoadingSkeleton variant="table" count={5} />}>
      <AdminUsersContent />
    </Suspense>
  );
}

