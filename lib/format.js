const TZ = 'Asia/Jerusalem';
export const hm = (t) => (t ? t.slice(0, 5) : '');
export const shekel = (n) => '₪' + Math.round(Number(n || 0)).toLocaleString('he-IL');
export const dayName = (d) => new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { weekday: 'long', timeZone: TZ });
export const shortDate = (d) => new Date(d + 'T12:00:00').toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', timeZone: TZ });
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: TZ });
export function daysUntil(d) {
  const ms = new Date(d + 'T00:00:00Z') - new Date(today() + 'T00:00:00Z');
  const n = Math.round(ms / 86400000);
  return n === 0 ? 'היום' : n === 1 ? 'מחר' : n < 0 ? 'עבר' : `עוד ${n} ימים`;
}
export const wazeUrl = (place) => 'https://waze.com/ul?navigate=yes&q=' + encodeURIComponent(place || '');
