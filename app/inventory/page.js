import Nav from '@/components/Nav';
import InventoryPicker from '@/components/InventoryPicker';
import { requireAdmin } from '@/lib/session';
import catalog from '@/lib/catalog.json';

export const dynamic = 'force-dynamic';

export default async function Inventory() {
  const me = await requireAdmin();
  const { data: owned } = await me.supabase.from('equipment').select('category, name, quantity');
  return (
    <>
      <main className="page">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 className="display" style={{ fontSize: 28 }}>מה יש לך במחסן?</h1>
          <p className="muted">לוחצים על קטגוריה, מסמנים מה יש וכמה. הדגמים כבר כאן, אין צורך להקליד.</p>
        </div>
        <InventoryPicker catalog={catalog} owned={owned || []} />
      </main>
      <Nav active="inventory" isAdmin canEdit />
    </>
  );
}
