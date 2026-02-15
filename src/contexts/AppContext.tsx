import { createContext, useContext, ReactNode } from "react";
import { useAppData } from "@/hooks/use-app-data";

type AppContextType = ReturnType<typeof useAppData>;

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const appData = useAppData();

  if (appData.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your data...</p>
      </div>
    );
  }

  return <AppContext.Provider value={appData}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
