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

  const path = request.nextUrl.pathname;
  const isProtectedRoute = PROTECTED_ROUTES.some((route) => path.startsWith(route));
  const isAuthRoute = AUTH_ROUTES.some((route) => path.startsWith(route));

  // 1. Fast Path: Public routes (landing page, public assets, healthcheck) bypass remote auth overhead
  if (!isProtectedRoute && !isAuthRoute) {
    return response;
  }

  // 2. Fast Path: Unauthenticated access without Supabase auth cookies redirects immediately without network roundtrip
  const allCookies = request.cookies.getAll();
  const hasAuthCookies = allCookies.some(
    (c) => c.name.startsWith('sb-') && (c.name.includes('auth-token') || c.name.includes('-access-token'))
  );
  if (isProtectedRoute && !hasAuthCookies) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Revalidate auth token server-side for protected and auth routes
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Unauthenticated users accessing protected routes -> Redirect to login
  if (!user && isProtectedRoute) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', path);
    return NextResponse.redirect(loginUrl);
  }

  // Helper to resolve user's roles from memberships with fast cookie cache
  const resolveUserRoles = async (): Promise<string[]> => {
    if (!user) return [];

    // Fast path: check if request already carries verified role cookie for this user
    try {
      const cachedCookie = request.cookies.get('sb-verified-roles')?.value;
      if (cachedCookie) {
        const parsed = JSON.parse(cachedCookie);
        if (parsed.uid === user.id && Array.isArray(parsed.roles) && parsed.exp > Date.now()) {
          return parsed.roles as string[];
        }
      }
    } catch {
      // Fall through to database lookup on invalid cookie
    }

    const { data: memberships } = await supabase
      .from('memberships')
      .select('role')
      .eq('user_id', user.id);

    const dbRoles = (memberships || []).map((m: { role: string }) => m.role);
    const resolvedRoles = dbRoles.length > 0 ? dbRoles : ['student'];

    // Cache verified roles in cookie for 5 minutes to avoid redundant DB queries on every navigation/prefetch
    try {
      response.cookies.set('sb-verified-roles', JSON.stringify({
        uid: user.id,
        roles: resolvedRoles,
        exp: Date.now() + 300_000,
      }), {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 300,
      });
    } catch {
      // Ignore cookie set errors if headers are immutable
    }

    return resolvedRoles;
  };

  // 2. Enforce strict role isolation across protected dashboard routes
  if (user && isProtectedRoute) {
    const roles = await resolveUserRoles();
    if (path.startsWith('/admin') && !roles.includes('admin')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if ((path.startsWith('/faculty') || path.startsWith('/instructor')) && !roles.includes('instructor')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if (path.startsWith('/invigilator') && !roles.includes('invigilator')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if (path.startsWith('/student') && !roles.includes('student')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
    if (path.startsWith('/exam') && !roles.includes('student')) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // 3. Authenticated users accessing login or signup -> Redirect to role dashboard
  if (user && isAuthRoute) {
    let targetPath = '/student';
    const roles = await resolveUserRoles();
    if (roles.includes('admin')) {
      targetPath = '/admin';
    } else if (roles.includes('instructor')) {
      targetPath = '/faculty';
    } else if (roles.includes('invigilator')) {
      targetPath = '/invigilator';
    } else if (roles.includes('student')) {
      targetPath = '/student';
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
