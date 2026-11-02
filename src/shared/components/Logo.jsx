export default function Logo({ size = 32, color = 'var(--oro)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect x="2" y="6" width="38" height="38" rx="12" fill={color} />
      <text x="20" y="33" textAnchor="middle" fontFamily="Georgia, serif" fontStyle="italic" fontSize="27" letterSpacing="-2" fill="#fff">dt</text>
      <circle cx="39" cy="9" r="8" fill="#e7edcf" stroke="#fff" strokeWidth="2" />
      <path d="M35.5 9h7 M39 5.5v7" fill="none" stroke="#536e46" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
