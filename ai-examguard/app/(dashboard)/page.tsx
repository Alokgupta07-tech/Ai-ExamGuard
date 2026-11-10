'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/providers/auth-provider';
import { Loader2 } from 'lucide-react';

export default function DashboardIndexPage() {
  const { role, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push('/login');
        return;
      }
      switch (role) {
        case 'admin':
          router.replace('/admin');
          break;
        case 'instructor':
          router.replace('/faculty');
          break;
        case 'invigilator':
          router.replace('/invigilator');
          break;
        case 'student':
        default:
          router.replace('/student');
          break;
      }
    }
  }, [role, isLoading, isAuthenticated, router]);

  return (
    <div className="h-64 flex flex-col items-center justify-center gap-2 text-muted-foreground">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <span className="text-sm">Routing to your workspace...</span>
    </div>
  );
}

