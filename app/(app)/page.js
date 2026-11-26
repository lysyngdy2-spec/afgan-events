import HomeView from '@/components/HomeView';
import { getMe, getClient } from '@/lib/session';
import { upcomingEvents, moneySummary, monthRange } from '@/lib/data';

export const dynamic = 'force-dynamic';

export default async function Home() {
  // None of these queries depend on who you are (RLS decides what comes back; the money
  // tables return nothing to a worker), so all of them run alongside the profile lookup
  // instead of after it. On a cold open that saves a whole round of database waiting.
  const supabase = await getClient();
  const eventsP = upcomingEvents(supabase);
  const moneyP = moneySummary(supabase, ...monthRange());
  eventsP.catch(() => {});
  moneyP.catch(() => {});
  const me = await getMe();
  const [events, money] = await Promise.all([eventsP, me.isAdmin ? moneyP : null]);
  return <HomeView me={me} events={events} money={money} />;
}
