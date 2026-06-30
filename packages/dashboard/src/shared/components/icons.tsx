interface IconProps {
  className?: string;
}

export function ChevronIcon({ className = "h-3 w-3" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function DashboardMark({ className = "h-5 w-5" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 15.5h3.6l2.2-5.2 3.2 8.4 2.3-6.2H20"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M5 6.5h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

export function PlayIcon({ className = "h-3 w-3" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 3.8v8.4L11.5 8 5 3.8z" />
    </svg>
  );
}

export function PauseIcon({ className = "h-3 w-3" }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4.5 3.5h2.2v9H4.5v-9zm4.8 0h2.2v9H9.3v-9z" />
    </svg>
  );
}
