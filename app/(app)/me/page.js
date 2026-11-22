import { getMe } from '@/lib/session';
import { revalidatePath } from 'next/cache';
import CalendarLinks from '@/components/CalendarLinks';

export const dynamic = 'force-dynamic';

async function savePhone(form) {
  'use server';
  const { supabase, user } = await getMe();
  await supabase.from('profiles').update({ phone: String(form.get('phone') || '').trim() || null }).eq('id', user.id);
  revalidatePath('/me');
}

async function rotateToken() {
  'use server';
  const { supabase } = await getMe();
  await supabase.rpc('rotate_calendar_token');
  revalidatePath('/me');
}

export default async function Me() {
  const me = await getMe();
  const [{ data: p }, { data: token }] = await Promise.all([
    me.supabase.from('profiles').select('name, email, phone').eq('id', me.user.id).single(),
    me.supabase.rpc('my_calendar_token'),
  ]);
  return (
    <>
      <main className="page">
        <h1 className="display" style={{ fontSize: 30 }}>{p.name}</h1>
        <p className="muted" dir="ltr" style={{ textAlign: 'end' }}>{p.email}</p>
        <form action={savePhone} className="glass card">
          <label>טלפון (כדי שהצוות יוכל להתקשר אליך)<input name="phone" type="tel" dir="ltr" defaultValue={p.phone || ''} /></label>
          <button className="btn">שמור</button>
        </form>
        <section className="glass card">
          <h2 style={{ fontSize: 18 }}>חיבור ליומן של הטלפון</h2>
          <p className="small muted">עושים את זה פעם אחת. מאז כל אירוע שמשבצים אותך אליו נכנס ליומן לבד, עם תזכורת שבוע לפני, יום לפני ו־3 שעות לפני. שינוי או ביטול מתעדכנים לבד.</p>
          <p className="small muted"><b style={{ color: 'var(--text)' }}>אייפון:</b> לוחצים על הכפתור הראשון ואז "הרשמה". <b style={{ color: 'var(--text)' }}>אנדרואיד:</b> לוחצים על השני, מאשרים בגוגל קלנדר. אם זה לא נפתח, מעתיקים את הקישור ומדביקים בגוגל קלנדר במחשב תחת "יומנים אחרים", "מכתובת אתר".</p>
          {token ? <CalendarLinks token={token} /> : null}
          <form action={rotateToken}>
            <button className="btn ghost" style={{ width: '100%', fontSize: 13 }}>הקישור דלף? צור קישור חדש</button>
          </form>
        </section>
        <form action="/auth/signout" method="post"><button className="btn ghost" style={{ width: '100%' }}>התנתקות</button></form>
      </main>
    </>
  );
}
