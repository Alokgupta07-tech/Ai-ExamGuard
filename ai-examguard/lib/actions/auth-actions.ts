'use server';

import { AuthService } from '@/lib/services/auth';
import type { SignInCredentials, SignUpCredentials } from '@/types/auth';
import { revalidatePath } from 'next/cache';

export async function signInAction(credentials: SignInCredentials) {
  try {
    const result = await AuthService.signIn(credentials);
    return { success: true, redirectUrl: result.redirectUrl };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message || 'Failed to sign in.' };
  }
}

export async function signUpAction(credentials: SignUpCredentials) {
  try {
    const result = await AuthService.signUp(credentials);
    return {
      success: true,
      redirectUrl: result.redirectUrl,
      requiresEmailConfirmation: result.requiresEmailConfirmation,
    };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message || 'Failed to sign up.' };
  }
}

export async function signOutAction() {
  try {
    await AuthService.signOut();
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message || 'Failed to sign out.' };
  }
}

export async function requestPasswordResetAction(email: string) {
  try {
    await AuthService.requestPasswordReset(email);
    return { success: true };
  } catch (error: unknown) {
    return { success: false, error: (error as Error).message || 'Failed to send reset link.' };
  }
}
