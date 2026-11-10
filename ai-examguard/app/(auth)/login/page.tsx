'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthService } from '@/lib/services/auth';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await AuthService.signIn({ email, password });
      const target = redirectTo || result.redirectUrl;
      router.push(target);
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message || 'Invalid email or password.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoPreset = (presetEmail: string) => {
    setEmail(presetEmail);
    setPassword('TestPassword123!');
    setError(null);
  };

  return (
    <Card className="border-border/80 bg-card/90 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Institutional Sign In</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Enter your university credentials to access your exam workspace
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Institutional Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="student@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-primary transition-colors hover:text-primary/80 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary font-medium text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        {/* Quick Demo Access Presets */}
        <div className="mt-6 border-t border-border/60 pt-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Quick Role Presets (Testing)
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleDemoPreset('agupta88094@gmail.com')}
              className="flex items-center justify-between rounded border border-border/80 bg-surface-elevated/40 px-2.5 py-1.5 text-left text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors cursor-pointer"
            >
              <span>Admin</span>
              <Shield className="h-3.5 w-3.5 text-primary" />
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('faculty@test.edu')}
              className="flex items-center justify-between rounded border border-border/80 bg-surface-elevated/40 px-2.5 py-1.5 text-left text-muted-foreground hover:border-secondary/50 hover:text-foreground transition-colors cursor-pointer"
            >
              <span>Faculty</span>
              <span className="text-[10px] text-secondary font-mono">INS</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('invigilator@test.edu')}
              className="flex items-center justify-between rounded border border-border/80 bg-surface-elevated/40 px-2.5 py-1.5 text-left text-muted-foreground hover:border-purple/50 hover:text-foreground transition-colors cursor-pointer"
            >
              <span>Invigilator</span>
              <span className="text-[10px] text-purple font-mono">PROCTOR</span>
            </button>
            <button
              type="button"
              onClick={() => handleDemoPreset('student@test.edu')}
              className="flex items-center justify-between rounded border border-border/80 bg-surface-elevated/40 px-2.5 py-1.5 text-left text-muted-foreground hover:border-success/50 hover:text-foreground transition-colors cursor-pointer"
            >
              <span>Student</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            </button>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/60 p-4">
        <p className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Register here
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="border-border/80 bg-card/90 p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="mt-2 text-xs text-muted-foreground">Loading authentication interface...</span>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
