import { redirect } from 'next/navigation';
import { supabaseServer } from './supabase-server';

// The signed-in member, or a redirect. Role comes from the DB, never from the client.
export async function getMe() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('id, email, name, calendar_token').eq('id', user.id).maybeSingle();
  if (!profile) redirect('/no-access');
  const { data: member } = await supabase.from('members').select('role, can_edit_events, active').eq('email', profile.email).single();
  if (!member?.active) redirect('/no-access');
  const isAdmin = member.role === 'admin';
  return { supabase, user, profile, isAdmin, canEdit: isAdmin || member.can_edit_events };
}

export async function requireAdmin() {
  const me = await getMe();
  if (!me.isAdmin) redirect('/');
  return me;
}
