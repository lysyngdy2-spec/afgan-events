import Link from 'next/link';
import { requireAdmin } from '@/lib/session';

const tiles = [
  ['/inventory', 'ציוד', 'מה יש במחסן וכמה'],
  ['/money', 'כספים', 'הכנסות, שכר, הוצאות ורווח'],
  ['/team', 'צוות', 'עובדים, תעריפים והרשאות'],
];

export default async function Manage() {
  await requireAdmin();
  return (
    <main className="page">
      <h1 className="display" style={{ fontSize: 30 }}>ניהול</h1>
      {tiles.map(([href, title, sub]) => (
        <Link key={href} href={href} className="glass card tap" style={{ padding: 20, color: 'var(--text)', gap: 4 }}>
          <span style={{ fontSize: 19, fontWeight: 700 }}>{title}</span>
          <span className="small muted">{sub}</span>
        </Link>
      ))}
    </main>
  );
}
