// Fortress-style rook: mirrors public/favicon.svg's silhouette, but in
// `currentColor` so it follows whatever text color (e.g. `text-accent`)
// the parent sets — no separate config needed to keep it in sync.
const RookIcon = ({ className }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <g fill="currentColor">
      <rect x="16" y="10" width="7" height="10" />
      <rect x="28.5" y="10" width="7" height="10" />
      <rect x="41" y="10" width="7" height="10" />
      <rect x="16" y="20" width="32" height="4" />
      <path d="M16 24 L48 24 L43 44 L21 44 Z" />
      <rect x="14" y="44" width="36" height="6" rx="1" />
    </g>
    <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.35">
      <line x1="17.5" y1="30" x2="46.5" y2="30" />
      <line x1="32" y1="24" x2="32" y2="30" />
      <line x1="19.25" y1="37" x2="44.75" y2="37" />
      <line x1="26" y1="30" x2="26" y2="37" />
      <line x1="38" y1="30" x2="38" y2="37" />
      <line x1="32" y1="37" x2="32" y2="44" />
      <line x1="32" y1="44" x2="32" y2="50" />
    </g>
  </svg>
);

export default RookIcon;
