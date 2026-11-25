import { Suspense } from 'react';
import Nav from '@/components/Nav';
import Onboarding from '@/components/OnboardingGate';
import { getMe } from '@/lib/session';

// The layout no longer waits for the database: the page skeleton (loading.js)
// streams at once, and the tab bar fills in as soon as the role is known.
async function NavWithRole() {
  const me = await getMe();
  return (
    <>
      <Nav isAdmin={me.isAdmin} canEdit={me.canEdit} />
      <Onboarding userId={me.user.id} name={me.profile.name} role={me.isAdmin ? 'admin' : me.canEdit ? 'editor' : 'worker'} />
    </>
  );
}

export default function AppLayout({ children }) {
  return (
    <>
      {children}
      <Suspense fallback={<nav className="nav" aria-hidden="true" />}>
        <NavWithRole />
      </Suspense>
    </>
  );
}
