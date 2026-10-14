/* Self-contained cricket SVG art — no external images, scales crisply,
   themed to the Autonex navy/blue palette. */

export function CricketBall({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title ?? "cricket ball"}>
      <defs>
        <radialGradient id="ballG" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#3a4aa0" />
          <stop offset="100%" stopColor="#16205a" />
        </radialGradient>
      </defs>
      <circle cx="32" cy="32" r="28" fill="url(#ballG)" />
      <circle cx="32" cy="32" r="28" fill="none" stroke="#0e1540" strokeOpacity="0.4" strokeWidth="1" />
      <path d="M20 10 Q10 32 20 54" fill="none" stroke="#e9f0ff" strokeWidth="2.5" strokeLinecap="round" />
      <g stroke="#e9f0ff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9">
        <path d="M17 16 l6 1.5M15.5 22 l6.5 1M15 28 l7 .6M15 34 l7 -.2M15.5 40 l6.8 -.9M17 46 l6.3 -1.4" />
      </g>
      <ellipse cx="24" cy="22" rx="7" ry="4" fill="#fff" opacity="0.12" />
    </svg>
  );
}

export function CricketBat({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title ?? "cricket bat"}>
      <g transform="rotate(38 32 32)">
        {/* handle */}
        <rect x="29.5" y="6" width="5" height="20" rx="2.5" fill="#1d2b73" />
        <rect x="29.5" y="6" width="5" height="20" rx="2.5" fill="none" stroke="#0e1540" strokeOpacity="0.3" />
        {/* splice + blade */}
        <path d="M27 24 h10 v22 a5 5 0 0 1 -5 5 h0 a5 5 0 0 1 -5 -5 z" fill="#2f6bff" />
        <path d="M27 24 h10 v22 a5 5 0 0 1 -5 5 h0 a5 5 0 0 1 -5 -5 z" fill="none" stroke="#16205a" strokeOpacity="0.35" strokeWidth="1.3" />
        <line x1="32" y1="26" x2="32" y2="48" stroke="#16205a" strokeOpacity="0.25" strokeWidth="1" />
      </g>
    </svg>
  );
}

export function Stumps({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title ?? "stumps"}>
      <g fill="#16205a">
        <rect x="16" y="14" width="5" height="40" rx="2.5" />
        <rect x="29.5" y="14" width="5" height="40" rx="2.5" />
        <rect x="43" y="14" width="5" height="40" rx="2.5" />
      </g>
      <g fill="#2f6bff">
        <rect x="17" y="10" width="14" height="3.5" rx="1.75" />
        <rect x="33" y="10" width="14" height="3.5" rx="1.75" />
      </g>
    </svg>
  );
}

export function Trophy({ className = "", title }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={title ?? "trophy"}>
      <defs>
        <linearGradient id="cupG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3a4aa0" />
          <stop offset="100%" stopColor="#16205a" />
        </linearGradient>
      </defs>
      <path d="M20 10 h24 v10 a12 12 0 0 1 -24 0 z" fill="url(#cupG)" />
      <path d="M20 12 h-7 a7 7 0 0 0 7 10 M44 12 h7 a7 7 0 0 1 -7 10" fill="none" stroke="#2f6bff" strokeWidth="3" strokeLinecap="round" />
      <rect x="29" y="30" width="6" height="10" fill="#16205a" />
      <rect x="22" y="40" width="20" height="5" rx="2.5" fill="#1d2b73" />
      <rect x="18" y="45" width="28" height="5" rx="2.5" fill="#16205a" />
      <path d="M28 14 l2 4 4 .5 -3 3 .8 4 -3.6 -2 -3.6 2 .8 -4 -3 -3 4 -.5z" fill="#eaf1ff" opacity="0.85" />
    </svg>
  );
}

/* Rounded "sticker" chip wrapping an icon — soft shadow, white face. */
export function Sticker({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={
        "rounded-2xl bg-white shadow-[0_8px_30px_rgba(16,24,64,0.18)] ring-1 ring-black/5 grid place-items-center " +
        className
      }
    >
      {children}
    </div>
  );
}

/* Subtle dotted "field" texture for section backgrounds. */
export function FieldPattern({ className = "" }: { className?: string }) {
  return (
    <svg className={className} aria-hidden="true" width="100%" height="100%">
      <defs>
        <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.4" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#dots)" />
    </svg>
  );
}
