import Link from 'next/link';
import { redirect } from 'next/navigation';
import EventForm from '@/components/EventForm';
import NewEventFlow from '@/components/NewEventFlow';
import { getMe } from '@/lib/session';
import { eventFormData } from '@/lib/eventFormData';
import { withGroups } from '@/lib/catalogGroups';

export const dynamic = 'force-dynamic';

export default async function NewEvent({ searchParams }) {
  const me = await getMe();
  if (!me.canEdit) redirect('/');
  const from = (await searchParams).from;
  const data = await eventFormData(me, from, { duplicate: true });
  return (
    <main className="page">
      <div className="row">
        <Link href="/" className="small">ביטול</Link>
        <h1 className="display" style={{ fontSize: 22 }}>{from ? 'שכפול אירוע' : 'אירוע חדש'}</h1>
        <span style={{ width: 34 }} />
      </div>
      {from
        ? <EventForm {...data} isAdmin={me.isAdmin} myEmail={me.profile.email} />
        : <NewEventFlow inventory={withGroups(data.inventory)} members={data.members} presets={data.presets} isAdmin={me.isAdmin} myEmail={me.profile.email} />}
    </main>
  );
}
