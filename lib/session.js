import { cache } from 'react';
import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase-server';

// The signed-in member, or a redirect. Role comes from the DB, never from the client.
// cache(): layout and page share one lookup per request.
// One Supabase client per request, shared by everything that renders it.
export const getClient = cache(() => supabaseServer());

export const getMe = cache(async () => {
  const supabase = await getClient();
  // getClaims verifies the JWT signature (locally when possible), so no extra round trip.
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) redirect('/login');
  const { data: profile } = await supabase.from('profiles')
    .select('id, email, name, members(role, can_edit_events, active)').eq('id', id).maybeSingle();
  if (!profile) redirect('/no-access');
  const member = profile.members;
  if (!member?.active) redirect('/no-access');
  const isAdmin = member.role === 'admin';
  return { supabase, user: { id }, profile: { id: profile.id, email: profile.email, name: profile.name }, isAdmin, canEdit: isAdmin || member.can_edit_events };
});

export async function requireAdmin() {
  const me = await getMe();
  if (!me.isAdmin) redirect('/');
  return me;
}
