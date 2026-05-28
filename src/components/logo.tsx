export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="80" height="80" rx="16" fill="#18181F" />
      <polygon
        points="40,14 62,27 62,53 40,66 18,53 18,27"
        stroke="#C4A862"
        strokeWidth="2.5"
        fill="none"
        strokeLinejoin="round"
      />
      <circle cx="28" cy="40" r="5.5" fill="#C4A862" />
      <circle cx="40" cy="40" r="5.5" fill="#C4A862" />
      <circle cx="52" cy="40" r="5.5" fill="#C4A862" />
    </svg>
  );
}
