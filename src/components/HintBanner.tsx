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
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-600 text-xs font-medium hover:bg-blue-100 transition-colors"
        aria-label="Show page hint"
      >
        <Info className="h-3 w-3" strokeWidth={1.5} />
        Hint
        <ChevronDown className="h-3 w-3" strokeWidth={1.5} />
      </button>
    );
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200">
      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="flex-1 text-sm text-blue-800">{message}</p>
      <button
        onClick={toggle}
        className="flex items-center gap-1 text-blue-400 hover:text-blue-700 transition-colors shrink-0 text-xs"
        aria-label="Collapse hint"
      >
        <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
