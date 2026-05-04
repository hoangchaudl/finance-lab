import { useState } from "react";
import { Info, X } from "lucide-react";

interface Props {
  pageKey: string;
  message: string;
}

export default function HintBanner({ pageKey, message }: Props) {
  const storageKey = `hint_dismissed_${pageKey}`;
  const [visible, setVisible] = useState(() => !localStorage.getItem(storageKey));
  const [fading, setFading] = useState(false);

  if (!visible) return null;

  const dismiss = () => {
    setFading(true);
    setTimeout(() => {
      localStorage.setItem(storageKey, "true");
      setVisible(false);
    }, 300);
  };

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg bg-blue-50 border border-blue-200 transition-opacity duration-300 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" strokeWidth={1.5} />
      <p className="flex-1 text-sm text-blue-800">{message}</p>
      <button
        onClick={dismiss}
        className="text-blue-400 hover:text-blue-700 transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
