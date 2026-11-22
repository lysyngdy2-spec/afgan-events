import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';

export async function middleware(request) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await supabase.auth.getUser();
  const open = ['/login', '/auth', '/privacy'].some((p) => request.nextUrl.pathname.startsWith(p));
  if (!user && !open) return NextResponse.redirect(new URL('/login', request.url));
  return response;
}

export const config = {
  matcher: ['/((?!_next|icons|manifest.webmanifest|sw.js|favicon.ico|api/ics).*)'],
};
