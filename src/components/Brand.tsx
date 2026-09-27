import { cn } from "@/lib/utils";

type BrandProps = {
  /** Size of the logo mark in px */
  size?: number;
  /** Wordmark text size classes */
  textClassName?: string;
  className?: string;
  /** Hide the "Finance Lab" wordmark, show the mark only */
  markOnly?: boolean;
};

/**
 * Single source of truth for the Finance Lab lockup (mark + wordmark) so every
 * surface — sidebar, mobile header, landing nav, footer, auth cards — stays in
 * sync.
 */
export default function Brand({
  size = 36,
  textClassName = "text-2xl",
  className,
  markOnly = false,
}: BrandProps) {
  // Crossover point mark. Keep in sync with public/favicon.svg.
  // Old bell mark: src/assets/logo-bell-backup.png
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 44 44"
        width={size}
        height={size}
        role="img"
        aria-label="Finance Lab logo"
        className="shrink-0"
      >
        <rect x="0.5" y="0.5" width="43" height="43" rx="11.5" fill="#FFFFFF" stroke="#E5E7EB" />
        <path d="M11 32 L33 12" stroke="var(--brand-blue)" strokeWidth="4.5" strokeLinecap="round" />
        <circle cx="22" cy="22" r="5.5" fill="var(--brand-green)" stroke="#FFFFFF" strokeWidth="2.5" />
      </svg>
      {!markOnly && (
        <span
          className={cn("font-brand font-extrabold tracking-tight whitespace-nowrap", textClassName)}
        >
          Finance Lab
        </span>
      )}
    </span>
  );
}
