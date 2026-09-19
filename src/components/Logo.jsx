export default function Logo({ size = 24, color = 'var(--oro)' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" style={{ color }} aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="6" />
      <text x="50" y="63" textAnchor="middle" fontFamily="Playfair Display" fontSize="40" fill="currentColor" fontWeight="600">DT</text>
    </svg>
  )
}
