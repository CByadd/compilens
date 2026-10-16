// Same artwork as public/logo.svg (the favicon), inlined so it renders without an extra request.
export default function Logo({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo">
      <defs>
        <linearGradient id="cl-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4F46E5" />
          <stop offset="1" stopColor="#9333EA" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#cl-bg)" />
      <g transform="translate(1.5 2)">
      <path d="M39.5 18.4A15 15 0 1 0 39.5 37.6" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <path d="M39.5 37.6L50 48" stroke="#fff" strokeWidth="6" strokeLinecap="round" />
      <path d="M20.5 22.5h11" stroke="#A5F3FC" strokeWidth="3" strokeLinecap="round" />
      <path d="M20.5 28h7" stroke="#FDE68A" strokeWidth="3" strokeLinecap="round" />
      <path d="M20.5 33.5h12" stroke="#A7F3D0" strokeWidth="3" strokeLinecap="round" />
      </g>
    </svg>
  )
}
