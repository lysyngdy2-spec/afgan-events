// Line icons for templates. One stroke weight, 24px grid, currentColor.
const P = {
  sound: <><rect x="6" y="3" width="12" height="18" rx="3" /><circle cx="12" cy="14.5" r="3.2" /><circle cx="12" cy="7.5" r="1.4" /></>,
  lights: <><path d="M8 3h8l-1.5 6h-5z" /><path d="M9.5 9 6 21M14.5 9 18 21M12 9v12" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></>,
  stage: <><path d="M3 16h18v4H3zM5 16V5h14v11" /><path d="M8 5v4M12 5v4M16 5v4" /></>,
  party: <><circle cx="12" cy="13" r="7" /><path d="M5 13h14M12 6v14M7.5 8.5l9 9M16.5 8.5l-9 9M12 2v4" /></>,
  wedding: <><circle cx="9" cy="14" r="5" /><circle cx="15" cy="14" r="5" /><path d="m10 6 2-3 2 3" /></>,
  talk: <><path d="M4 5h16v11H9l-5 4z" /><path d="M8 9h8M8 12h5" /></>,
  dj: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3" /><path d="M18 4 14 10" /></>,
};
export const PRESET_ICONS = Object.keys(P);
export default function PresetIcon({ name = 'sound', size = 24, stroke = 1.8 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {P[name] || P.sound}
    </svg>
  );
}
