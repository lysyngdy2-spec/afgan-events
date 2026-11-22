import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabaseServer } from '@/lib/supabase-server';

// Google Identity Services posts the signed ID token here (redirect mode).
// Supabase verifies the token's signature, audience (our client ID) and nonce.
export async function POST(request) {
  const origin = new URL(request.url).origin;
  const fail = () => NextResponse.redirect(`${origin}/login?e=1`, 303);

  const form = await request.formData();
  const credential = form.get('credential');
  const store = await cookies();
  const nonce = store.get('g_nonce')?.value;
  const csrfCookie = store.get('g_csrf_token')?.value;
  const csrfBody = form.get('g_csrf_token');
  if (typeof credential !== 'string' || !nonce) return fail();
  if (csrfCookie && csrfCookie !== csrfBody) return fail();

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: credential, nonce });
  store.set('g_nonce', '', { path: '/auth', maxAge: 0, secure: true, sameSite: 'none' });
  if (error) return fail();
  return NextResponse.redirect(`${origin}/`, 303);
}
