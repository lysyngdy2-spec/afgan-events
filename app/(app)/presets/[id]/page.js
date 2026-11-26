import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import PresetBuilder from '@/components/PresetBuilder';
import { getMe } from '@/lib/session';
import { withGroups } from '@/lib/catalogGroups';

export const dynamic = 'force-dynamic';

export default async function EditPreset({ params }) {
  const me = await getMe();
  if (!me.canEdit) redirect('/');
  const { id } = await params;
  const [{ data: preset }, { data: inventory }] = await Promise.all([
    me.supabase.from('spec_presets').select('id, name, icon, items, setup_time, start_time, end_time, notes').eq('id', id).maybeSingle(),
    me.supabase.from('equipment').select('id, category, name, quantity, photo_url, tone, catalog_group'),
  ]);
  if (!preset) notFound();
  return (
    <main className="page">
      <div className="row"><Link href="/presets" className="small">חזרה</Link><h1 className="display" style={{ fontSize: 22 }}>עריכת סט</h1><span style={{ width: 34 }} /></div>
      <PresetBuilder inventory={withGroups(inventory || [])} preset={preset} />
    </main>
  );
}
