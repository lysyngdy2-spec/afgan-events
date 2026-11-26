import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import PresetBuilder from '@/components/PresetBuilder';
import { getMe } from '@/lib/session';
import catalog from '@/lib/catalog.json';

export const dynamic = 'force-dynamic';

export default async function EditPreset({ params }) {
  const me = await getMe();
  if (!me.canEdit) redirect('/');
  const { id } = await params;
  const [{ data: preset }, { data: inventory }] = await Promise.all([
    me.supabase.from('spec_presets').select('id, name, icon, items, setup_time, start_time, end_time, notes').eq('id', id).maybeSingle(),
    me.supabase.from('equipment').select('category, name, quantity'),
  ]);
  if (!preset) notFound();
  return (
    <main className="page">
      <div className="row"><Link href="/presets" className="small">חזרה</Link><h1 className="display" style={{ fontSize: 22 }}>עריכת תבנית</h1><span style={{ width: 34 }} /></div>
      <PresetBuilder catalog={catalog} inventory={inventory || []} preset={preset} />
    </main>
  );
}
