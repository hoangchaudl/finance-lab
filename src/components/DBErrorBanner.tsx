import { AlertTriangle, X, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  dbError: string | null;
  resetError: () => void;
  loadFromDB: () => Promise<void>;
}

export default function DBErrorBanner({ dbError, resetError, loadFromDB }: Props) {
  if (!dbError) return null;

  const handleRetry = () => {
    resetError();
    loadFromDB();
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-50 border-b border-red-200 px-4 py-3 flex items-center gap-3">
      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" strokeWidth={1.5} />
      <p className="flex-1 text-sm text-red-700">{dbError}</p>
      <Button
        size="sm"
        variant="outline"
        className="border-red-300 text-red-700 hover:bg-red-100 gap-1 shrink-0"
        onClick={handleRetry}
      >
        <RefreshCw className="h-3 w-3" strokeWidth={1.5} />
        Retry
      </Button>
      <button
        className="text-red-500 hover:text-red-700 transition-colors"
        onClick={resetError}
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" strokeWidth={1.5} />
      </button>
    </div>
  );
}
