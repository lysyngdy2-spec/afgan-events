import Nav from '@/components/Nav';
import { getMe } from '@/lib/session';

export default async function AppLayout({ children }) {
  const me = await getMe();
  return (
    <>
      {children}
      <Nav isAdmin={me.isAdmin} canEdit={me.canEdit} />
    </>
  );
}
