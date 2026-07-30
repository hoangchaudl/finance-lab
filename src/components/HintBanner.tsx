import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

interface Props {
  pageKey: string;
  message: string;
}

export default function HintBanner({ pageKey, message }: Props) {
  const storageKey = `hint_collapsed_${pageKey}`;
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(storageKey) === "true",
  );

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(storageKey, String(next));
  };

  if (collapsed) {
    return (
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border-2 border-outline bg-primary/10 text-primary text-xs font-bold hover:bg-primary/15 transition-colors"
        aria-label="Show page hint"
      >
        <Info className="h-3 w-3" strokeWidth={1.5} />
        Hint
        <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-xl border-2 border-outline bg-primary/5">
      <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="flex-1 text-sm text-foreground">{message}</p>
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-primary/70 hover:text-primary transition-colors shrink-0 text-xs"
        aria-label="Collapse hint"
      >
        <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
