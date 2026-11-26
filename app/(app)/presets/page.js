import Link from 'next/link';
import { redirect } from 'next/navigation';
import PresetCard from '@/components/PresetCard';
import { getMe } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default async function Presets() {
  const me = await getMe();
  if (!me.canEdit) redirect('/');
  const { data: presets } = await me.supabase.from('spec_presets').select('id, name, icon, items, setup_time, start_time, end_time').order('name');
  return (
    <main className="page">
      <div className="row"><h1 className="display" style={{ fontSize: 30 }}>תבניות</h1></div>
      <p className="muted">תבנית היא אירוע מוכן מראש: הציוד, השעות וההערות. בונים פעם אחת, ובאירוע חדש בוחרים אותה בלחיצה.</p>
      <Link href="/presets/new" className="btn cta-big"><span className="ico"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></span>תבנית חדשה</Link>
      <div className="preset-grid">
        {(presets || []).map((p) => <PresetCard key={p.id} p={p} href={`/presets/${p.id}`} />)}
      </div>
    </main>
  );
}

