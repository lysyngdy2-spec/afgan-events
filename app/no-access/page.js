export default function NoAccess() {
  return (
    <main className="page" style={{ minHeight: '100dvh', justifyContent: 'center', textAlign: 'center' }}>
      <img src="/icons/logo-white.png" alt="" width="110" height="110" style={{ margin: '0 auto' }} />
      <h1 className="display" style={{ fontSize: 26 }}>עוד לא הוספו אותך לצוות</h1>
      <p className="muted">תבקש מניר להוסיף את כתובת הג׳ימייל שלך, ואז תתחבר שוב.</p>
      <form action="/auth/signout" method="post"><button className="btn ghost">התחבר עם חשבון אחר</button></form>
    </main>
  );
}
