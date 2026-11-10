import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED_ROUTES = ['/admin', '/faculty', '/instructor', '/invigilator', '/student', '/exam', '/dashboard'];
const AUTH_ROUTES = ['/login', '/signup', '/forgot-password', '/auth/login', '/auth/signup'];

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Revalidate auth token server-side
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => path.startsWith(route));

  // 1. Unauthenticated users accessing protected routes -> Redirect to login
  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Authenticated users accessing login or signup -> Redirect to role dashboard
  if (user && isAuthRoute) {
    let targetPath = '/student';

    // Query user membership to determine role
    const { data: memberships } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id);

    const roles = (memberships || []).map((m: { role: string }) => m.role);
    if (roles.includes('admin')) {
      targetPath = '/admin';
    } else if (roles.includes('instructor')) {
      targetPath = '/faculty';
    } else if (roles.includes('invigilator')) {
      targetPath = '/invigilator';
    } else if (roles.includes('student')) {
      targetPath = '/student';
    } else {
      // Fallback to metadata
      const metaRole = user.user_metadata?.role;
      if (metaRole === 'admin') targetPath = '/admin';
      else if (metaRole === 'instructor' || metaRole === 'faculty') targetPath = '/faculty';
      else if (metaRole === 'invigilator') targetPath = '/invigilator';
    }

    return NextResponse.redirect(new URL(targetPath, request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public asset extensions
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
