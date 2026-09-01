import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth-store";
import { Toaster } from "@/components/ui/toaster";
import { AppShell } from "@/components/layout/app-shell";
import { LoginPage } from "@/features/auth/login-page";
import { RegisterPage } from "@/features/auth/register-page";
import { CustomerDashboard } from "@/features/customer/customer-dashboard";
import { TellerDashboard } from "@/features/teller/teller-dashboard";
import { ProtectedRoute } from "@/components/layout/protected-route";

function RedirectByRole() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === "ADMIN" || user?.role === "TELLER") {
    return <Navigate to="/teller" replace />;
  }
  return <Navigate to="/dashboard" replace />;
}

export default function App() {
  const { fetchMe, loading, user } = useAuthStore();

  useEffect(() => {
    fetchMe();
  }, [fetchMe]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <>
      <Routes>
        <Route
          path="/login"
          element={user ? <RedirectByRole /> : <LoginPage />}
        />
        <Route
          path="/register"
          element={user ? <RedirectByRole /> : <RegisterPage />}
        />

        <Route
          element={
            <ProtectedRoute>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<CustomerDashboard />} />
          <Route path="/teller" element={<TellerDashboard />} />
        </Route>

        <Route path="*" element={<Navigate to={user ? "/" : "/login"} replace />} />
        <Route path="/" element={<RedirectByRole />} />
      </Routes>
      <Toaster />
    </>
  );
}
