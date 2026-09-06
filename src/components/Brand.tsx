import logo from "@/assets/finance-lab-logo.png";
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
 * sync with the manga/Doraemon look.
 */
export default function Brand({
  size = 36,
  textClassName = "text-2xl",
  className,
  markOnly = false,
}: BrandProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src={logo}
        alt="Finance Lab logo"
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="shrink-0 rounded-xl border-2 border-outline card-shadow-sm bg-white object-contain"
      />
      {!markOnly && (
        <span
          className={cn(
            "font-display italic uppercase tracking-wide whitespace-nowrap",
            textClassName,
          )}
        >
          Finance Lab
        </span>
      )}
    </span>
  );
}
