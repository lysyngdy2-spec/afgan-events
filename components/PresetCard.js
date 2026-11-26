import Link from 'next/link';
import PresetIcon from './PresetIcon';
import { hm } from '@/lib/format';

export default function PresetCard({ p, href, onClick }) {
  const units = p.items.reduce((t, x) => t + x.quantity, 0);
  const body = (
    <>
      <span className="p-ico"><PresetIcon name={p.icon} size={26} /></span>
      <b>{p.name}</b>
      <span className="small muted">{p.items.length} פריטים · {units} יח׳{p.start_time ? <> · <bdi>{hm(p.start_time)}</bdi></> : null}</span>
    </>
  );
  return onClick ? <button type="button" className="preset-card" onClick={onClick}>{body}</button> : <Link href={href} className="preset-card">{body}</Link>;
}
