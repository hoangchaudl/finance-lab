import { createContext, useContext, ReactNode } from "react";
import { useAppData } from "@/hooks/use-app-data";

type AppContextType = ReturnType<typeof useAppData>;

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const appData = useAppData();
  return <AppContext.Provider value={appData}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
