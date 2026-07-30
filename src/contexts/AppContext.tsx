import { createContext, useContext, ReactNode } from "react";
import { useAppData } from "@/hooks/use-app-data";
import { Skeleton } from "@/components/ui/skeleton";

type AppContextType = ReturnType<typeof useAppData>;

const AppContext = createContext<AppContextType | null>(null);

function AppLoadingSkeleton() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-muted flex flex-col md:flex-row">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r-2 border-outline p-4 gap-3">
        <Skeleton className="h-9 w-full" />
        <div className="space-y-2 mt-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-lg" />
          ))}
        </div>
      </aside>
      {/* Main content skeleton */}
      <main className="flex-1 p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-3xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </main>
    </div>
  );
}

export function AppProvider({ children }: { children: ReactNode }) {
  const appData = useAppData();

  if (appData.loading) {
    return <AppLoadingSkeleton />;
  }

  return <AppContext.Provider value={appData}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
