// Same artwork as public/logo.svg (the favicon), inlined so it renders without an extra request.
export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo">
      <rect width="64" height="64" rx="14" fill="#2563EB" />
      <g transform="translate(1.5 2)" stroke="#fff" strokeLinecap="round" fill="none">
        <path d="M39.5 18.4A15 15 0 1 0 39.5 37.6" strokeWidth="5" />
        <path d="M39.5 37.6L50 48" strokeWidth="6" />
        <path d="M20.5 22.5h11M20.5 28h7M20.5 33.5h12" strokeWidth="3" opacity=".8" />
      </g>
    </svg>
  )
}
