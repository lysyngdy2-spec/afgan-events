'use client';
import SetBuilder from './SetBuilder';

// The event's set as the crew sees it: the stage with exactly what's coming, and the
// exploded view by layer. Read only.
export default function EventSetupFigure({ items }) {
  if (!items.length) return null;
  const qty = Object.fromEntries(items.map((i) => [i.id, i.quantity]));
  return <SetBuilder inventory={items} qty={qty} setQty={() => {}} readOnly title="מה מביאים" />;
}
