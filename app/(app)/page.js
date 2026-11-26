import HomeView from '@/components/HomeView';
import { getMe, getClient } from '@/lib/session';
import { upcomingEvents, moneySummary, monthRange } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // The events query does not depend on who you are (RLS decides), so it runs
  // alongside the profile lookup instead of after it.
  const supabase = await getClient();
  const eventsP = upcomingEvents(supabase);
  eventsP.catch(() => {});
  const me = await getMe();
  const moneyP = me.isAdmin ? moneySummary(supabase, ...monthRange()) : null;
  const [events, money] = await Promise.all([eventsP, moneyP]);
  return <HomeView me={me} events={events} money={money} />;
}
