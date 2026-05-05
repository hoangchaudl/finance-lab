import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppProvider, useApp } from "@/contexts/AppContext";
import ErrorBoundary from "@/components/ErrorBoundary";
import DBErrorBanner from "@/components/DBErrorBanner";
import AppLayout from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import BudgetPlan from "@/pages/BudgetPlan";
import FireGoals from "@/pages/FireGoals";
import CategoriesManager from "@/pages/CategoriesManager";
import Portfolio from "@/pages/Portfolio";
import Profile from "@/pages/Profile";
import NotFound from "./pages/NotFound";
import Report from "@/pages/Report";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Landing from "@/pages/Landing";

const queryClient = new QueryClient();

function AppWithErrorBanner({ children }: { children: React.ReactNode }) {
  const { dbError, resetError, loadFromDB } = useApp();
  return (
    <>
      <DBErrorBanner dbError={dbError} resetError={resetError} loadFromDB={loadFromDB} />
      {children}
    </>
  );
}

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background gap-3 flex-col">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-64" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <AppProvider>
      <AppWithErrorBanner>
      <AppLayout>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/budget" element={<BudgetPlan />} />
          <Route path="/fire" element={<FireGoals />} />
          <Route path="/categories" element={<CategoriesManager />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/report" element={<Report />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
      </AppWithErrorBanner>
    </AppProvider>
  );
}

const App = () => (
  <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/*" element={<ProtectedRoutes />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
