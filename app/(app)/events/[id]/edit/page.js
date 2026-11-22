import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import EventForm from '@/components/EventForm';
import { getMe } from '@/lib/session';
import { eventFormData } from '@/lib/eventFormData';
import { deleteEvent } from '@/app/actions';

export const dynamic = 'force-dynamic';

export default async function EditEvent({ params }) {
  const { id } = await params;
  const me = await getMe();
  if (!me.canEdit) redirect(`/events/${id}`);
  const data = await eventFormData(me, id);
  if (!data.initial) notFound();
  return (
    <main className="page">
      <div className="row">
        <Link href={`/events/${id}`} className="small">ביטול</Link>
        <h1 className="display" style={{ fontSize: 22 }}>עריכת אירוע</h1>
        <Link href={`/events/new?from=${id}`} className="small">שכפל</Link>
      </div>
      <EventForm {...data} isAdmin={me.isAdmin} />
      <form action={deleteEvent.bind(null, id)}><button className="btn ghost" style={{ width: '100%', color: 'var(--red-text)' }}>בטל את האירוע</button></form>
    </main>
  );
}
