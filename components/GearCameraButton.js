'use client';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import dynamic from 'next/dynamic';
import GearObject from './GearObject';

const AddGear = dynamic(() => import('./AddGear'), { ssr: false });

// Entry point for anyone on the team: photograph a piece of gear, name it, it's in the warehouse.
export default function GearCameraButton({ label = 'צלם ציוד חדש', sub = 'מצלמים, נותנים שם, והוא נכנס למחסן' }) {
  const [open, setOpen] = useState(false);
  const [last, setLast] = useState(null);
  return (
    <>
      <button type="button" className="glass tap row cam-entry" onClick={() => setOpen(true)}>
        <span style={{ textAlign: 'start' }}><b style={{ fontWeight: 600 }}>{label}</b><br /><span className="small muted">{last ? `נוסף: ${last.name}` : sub}</span></span>
        {last ? <GearObject row={last} size={44} /> : <span className="cam-ico" aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg></span>}
      </button>
      {open && createPortal(<AddGear onClose={() => setOpen(false)} onAdded={(row) => { setLast(row); setOpen(false); }} />, document.body)}
    </>
  );
}
