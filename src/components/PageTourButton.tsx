import { HelpCircle } from "lucide-react";
import { Button } from "./ui/button";

interface Props {
  onClick: () => void;
  label?: string;
}

export default function PageTourButton({ onClick, label = "Replay tour" }: Props) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 w-8 text-slate-400 hover:text-primary hover:bg-blue-50"
    >
      <HelpCircle className="h-5 w-5" strokeWidth={1.5} />
    </Button>
  );
}
