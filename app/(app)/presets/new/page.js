import Link from 'next/link';
import { redirect } from 'next/navigation';
import PresetBuilder from '@/components/PresetBuilder';
import { getMe } from '@/lib/session';
import catalog from '@/lib/catalog.json';

export const dynamic = 'force-dynamic';

export default async function NewPreset({ searchParams }) {
  const me = await getMe();
  if (!me.canEdit) redirect('/');
  const then = (await searchParams).then === 'event' ? '/events/new' : '/presets';
  const { data: inventory } = await me.supabase.from('equipment').select('category, name, quantity');
  return (
    <main className="page">
      <div className="row"><Link href={then} className="small">ביטול</Link><h1 className="display" style={{ fontSize: 22 }}>תבנית חדשה</h1><span style={{ width: 34 }} /></div>
      <PresetBuilder catalog={catalog} inventory={inventory || []} then={then} />
    </main>
  );
}
