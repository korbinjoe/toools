export function Logo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 256 256"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <rect width="256" height="256" rx="51" fill="#18181F" />
      <circle cx="128" cy="128" r="56" stroke="#C4A862" strokeWidth="5" />
      <circle cx="128" cy="128" r="30" stroke="#C4A862" strokeWidth="3.5" />
      <line x1="62" y1="128" x2="194" y2="128" stroke="#C4A862" strokeWidth="4" />
      <line x1="128" y1="62" x2="128" y2="194" stroke="#C4A862" strokeWidth="4" />
      <circle cx="128" cy="128" r="8" fill="#C4A862" />
    </svg>
  );
}

export function Wordmark({ height = 24, className = "" }: { height?: number; className?: string }) {
  const width = Math.round(height * 4.5);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 450 100"
      className={className}
      aria-label="Toools"
      role="img"
    >
      <path
        fillRule="evenodd"
        d="M0 10h74v24H48v56H24V34H0zM24 10l14 0-14 22z"
        fill="currentColor"
      />
      <circle cx="124" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="24" />
      <circle cx="214" cy="50" r="28" fill="none" stroke="currentColor" strokeWidth="24" />
      <circle cx="304" cy="50" r="28" fill="none" stroke="var(--primary)" strokeWidth="24" />
      <rect x="354" y="10" width="24" height="80" fill="currentColor" />
      <path
        d="M428 26c0-6-4-8-12-8-12 0-18 6-18 16s6 12 16 16 20 8 20 18-8 16-18 16c-10 0-18-6-18-14"
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
      />
    </svg>
  );
}
