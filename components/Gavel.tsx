export default function Gavel({
  className = "",
  color = "currentColor",
}: {
  className?: string;
  color?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="gavel" fill="none">
      {/* handle */}
      <rect x="30" y="26" width="7" height="30" rx="3.5" transform="rotate(-38 33 41)" fill={color} />
      {/* head */}
      <rect x="10" y="12" width="26" height="14" rx="4" transform="rotate(-38 23 19)" fill={color} />
      {/* end caps */}
      <rect x="7" y="14" width="4" height="18" rx="2" transform="rotate(-38 9 23)" fill={color} opacity="0.75" />
      <rect x="31" y="2" width="4" height="18" rx="2" transform="rotate(-38 33 11)" fill={color} opacity="0.75" />
    </svg>
  );
}
