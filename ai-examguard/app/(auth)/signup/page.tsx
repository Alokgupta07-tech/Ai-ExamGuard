'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AuthService } from '@/lib/services/auth';
import type { UserRole } from '@/types/database';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Eye, EyeOff, Loader2, AlertCircle, ArrowRight, CheckCircle2, GraduationCap, BookOpen, Eye as EyeIcon } from 'lucide-react';

export default function SignUpPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [tenantSlug, setTenantSlug] = useState('test-uni');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccessNotice(null);

    try {
      const result = await AuthService.signUp({
        fullName,
        email,
        password,
        role,
        tenantSlug,
      });

      if (result.requiresEmailConfirmation) {
        setSuccessNotice('Registration successful! Please check your email to confirm your account.');
      } else {
        router.push(result.redirectUrl);
        router.refresh();
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const roleOptions: Array<{ id: UserRole; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
    { id: 'student', label: 'Student', icon: GraduationCap, desc: 'Take exams with AI integrity verification' },
    { id: 'instructor', label: 'Faculty', icon: BookOpen, desc: 'Author exams, question banks & review submissions' },
    { id: 'invigilator', label: 'Invigilator', icon: EyeIcon, desc: 'Live proctoring & realtime anomaly triage' },
    { id: 'admin', label: 'Admin', icon: Shield, desc: 'Organization setup & user role management' },
  ];

  return (
    <Card className="border-border/80 bg-card/90 shadow-2xl backdrop-blur-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold tracking-tight">Create Institutional Account</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Join your university&apos;s AI ExamGuard proctoring network
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successNotice && (
          <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              placeholder="Dr. Alan Turing"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="alan@university.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password (min 8 chars)</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

          {/* Role Selection */}
          <div className="space-y-1.5">
            <Label>Select Your Institutional Role</Label>
            <div className="grid grid-cols-2 gap-2">
              {roleOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = role === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRole(opt.id)}
                    className={`flex flex-col text-left p-2.5 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-primary bg-primary/10 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                        : 'border-border/70 bg-surface-elevated/40 hover:border-border'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span className={`text-xs font-semibold ${isSelected ? 'text-primary' : 'text-foreground'}`}>
                        {opt.label}
                      </span>
                    </div>
                    <span className="mt-1 text-[11px] leading-tight text-muted-foreground line-clamp-1">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tenant Code */}
          <div className="space-y-1.5">
            <Label htmlFor="tenantSlug">Institution Identifier</Label>
            <Input
              id="tenantSlug"
              value={tenantSlug}
              onChange={(e) => setTenantSlug(e.target.value)}
              placeholder="e.g. test-uni"
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
                Creating Account...
              </>
            ) : (
              <>
                Complete Registration
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/60 p-4">
        <p className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
