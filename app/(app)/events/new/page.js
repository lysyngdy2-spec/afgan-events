import Link from 'next/link';
import { redirect } from 'next/navigation';
import EventForm from '@/components/EventForm';
import { getMe } from '@/lib/session';
import { eventFormData } from '@/lib/eventFormData';

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
        <Link href="/events?past=1" className="small">שכפל אירוע</Link>
      </div>
      <EventForm {...data} isAdmin={me.isAdmin} myEmail={me.profile.email} />
    </main>
  );
}
