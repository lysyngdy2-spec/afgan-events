import Link from 'next/link';
import { redirect } from 'next/navigation';
import PresetBuilder from '@/components/PresetBuilder';
import { getMe } from '@/lib/session';
import { withGroups } from '@/lib/catalogGroups';

export const dynamic = 'force-dynamic';

export default async function NewPreset({ searchParams }) {
  const me = await getMe();
  if (!me.canEdit) redirect('/');
  const then = (await searchParams).then === 'event' ? '/events/new' : '/presets';
  const { data: inventory } = await me.supabase.from('equipment').select('id, category, name, quantity, photo_url, tone, catalog_group');
  return (
    <main className="page">
      <div className="row"><Link href={then} className="small">ביטול</Link><h1 className="display" style={{ fontSize: 22 }}>סט חדש</h1><span style={{ width: 34 }} /></div>
      <PresetBuilder inventory={withGroups(inventory || [])} then={then} />
    </main>
  );
}
