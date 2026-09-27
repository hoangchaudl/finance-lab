import { cn } from "@/lib/utils";

type BrandProps = {
  /** Size of the logo mark in px */
  size?: number;
  /** Wordmark text size classes */
  textClassName?: string;
  className?: string;
  /** Hide the "Finance Lab" wordmark, show the mark only */
  markOnly?: boolean;
  /** White tile with blue line, for use on blue backgrounds */
  inverted?: boolean;
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
  inverted = false,
}: BrandProps) {
  // Crossover point: rising income line meets the flat expense line.
  // Keep in sync with public/favicon.svg. Old bell mark: src/assets/logo-bell-backup.png
  const tile = inverted ? "#FFFFFF" : "var(--brand-blue)";
  const line = inverted ? "var(--brand-blue)" : "#FFFFFF";
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
        <rect width="44" height="44" rx="12" fill={tile} />
        <path d="M8 22 H36" stroke="var(--brand-salmon)" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="0.5 6.4" />
        <path d="M9 33 L35 11" stroke={line} strokeWidth="4" strokeLinecap="round" />
        <circle cx="22" cy="22" r="5.5" fill="var(--brand-green)" stroke={tile} strokeWidth="2.5" />
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
