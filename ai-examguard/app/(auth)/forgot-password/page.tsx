'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AuthService } from '@/lib/services/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertCircle, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your registered institutional email.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await AuthService.requestPasswordReset(email);
      setSuccess(true);
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to send password reset link.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-border/80 bg-card/90 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Reset Your Password</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your university email address and we will send you a recovery link
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4 text-center py-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/20 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-sm text-foreground">
              A recovery link has been dispatched to <strong className="text-primary">{email}</strong>. Please follow the instructions in the email.
            </p>
            <Button asChild className="w-full bg-primary text-primary-foreground">
              <Link href="/login">Return to Sign In</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email">Registered Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-primary font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending Recovery Link...
                </>
              ) : (
                'Send Recovery Link'
              )}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/60 p-4">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Sign In</span>
        </Link>
      </CardFooter>
    </Card>
  );
}
