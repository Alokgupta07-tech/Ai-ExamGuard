import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-destructive/40 bg-destructive/10 text-destructive mb-4">
        <ShieldAlert className="h-8 w-8" />
      </div>
      <h1 className="text-2xl font-bold font-heading text-foreground">Access Restricted</h1>
      <p className="mt-2 text-sm text-muted-foreground max-w-md">
        You do not possess the required institutional authority to access this secure examination zone.
      </p>
      <div className="mt-6 flex gap-3">
        <Button asChild variant="outline" className="border-border">
          <Link href="/login" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Switch Account
          </Link>
        </Button>
        <Button asChild className="bg-primary text-primary-foreground">
          <Link href="/">Return to Home</Link>
        </Button>
      </div>
    </div>
  );
}

