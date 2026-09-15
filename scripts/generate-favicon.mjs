// Generates public/favicon.svg from the design-token source of truth
// (src/styles/1-primitives.css), so the icon's colors always match the
// current brand config instead of being hardcoded separately.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function readToken(css, name) {
  const match = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})`));
  if (!match) throw new Error(`Token --${name} not found in src/styles/1-primitives.css`);
  return match[1];
}

const primitives = readFileSync(resolve(root, 'src/styles/1-primitives.css'), 'utf8');

const brand = readToken(primitives, 'prim-brand-500');
const brandStrong = readToken(primitives, 'prim-brand-600');
const white = readToken(primitives, 'prim-base-0');

// A rook drawn as a fortress tower (crenellated top + brick coursing),
// compressed to leave room for the "ChessB" wordmark underneath.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="12" fill="${brand}"/>
  <g fill="${white}">
    <rect x="16" y="6" width="7" height="7"/>
    <rect x="28.5" y="6" width="7" height="7"/>
    <rect x="41" y="6" width="7" height="7"/>
    <rect x="16" y="13" width="32" height="3"/>
    <path d="M16 16 L48 16 L44 34 L20 34 Z"/>
    <rect x="15" y="34" width="34" height="5" rx="1"/>
  </g>
  <g stroke="${brandStrong}" stroke-width="1" stroke-linecap="round" opacity="0.55">
    <line x1="17.3" y1="22" x2="46.7" y2="22"/>
    <line x1="32" y1="16" x2="32" y2="22"/>
    <line x1="18.7" y1="28" x2="45.3" y2="28"/>
    <line x1="25" y1="22" x2="25" y2="28"/>
    <line x1="39" y1="22" x2="39" y2="28"/>
    <line x1="32" y1="28" x2="32" y2="39"/>
  </g>
  <text
    x="32"
    y="51.5"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-weight="800"
    font-size="13"
    letter-spacing="0.2"
    fill="${white}"
  >ChessB</text>
</svg>
`;

writeFileSync(resolve(root, 'public/favicon.svg'), svg, 'utf8');
console.log('public/favicon.svg generated from design tokens');
