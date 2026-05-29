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
      <g transform="translate(54 28) scale(2)">
        <path
          fillRule="evenodd"
          d="M0 10h74v24H48v56H24V34H0zM24 10l14 0-14 22z"
          fill="white"
        />
      </g>
    </svg>
  );
}

export function Wordmark({ height = 24, className = "" }: { height?: number; className?: string }) {
  const width = Math.round(height * 4.1);
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 410 100"
      className={className}
      aria-label="Toools"
      role="img"
    >
      <path
        fillRule="evenodd"
        d="M0 10h74v24H48v56H24V34H0zM24 10l14 0-14 22z"
        fill="currentColor"
      />
      <circle cx="118" cy="56" r="22" fill="none" stroke="currentColor" strokeWidth="24" />
      <circle cx="196" cy="56" r="22" fill="none" stroke="currentColor" strokeWidth="24" />
      <circle cx="274" cy="56" r="22" fill="none" stroke="var(--primary)" strokeWidth="24" />
      <rect x="318" y="10" width="24" height="80" fill="currentColor" />
      <path
        d="M384 38c0-4-3-6-9-6-9 0-13 4-13 12s4 9 12 12 15 6 15 13-6 12-13 12c-7 0-13-4-13-10"
        fill="none"
        stroke="currentColor"
        strokeWidth="20"
        strokeLinecap="round"
      />
    </svg>
  );
}
