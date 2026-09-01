import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Landmark,
  UserRound,
  ShieldCheck,
  LogOut,
  PiggyBank,
} from "lucide-react";
import { useAuthStore } from "@/stores/auth-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const isStaff = user?.role === "TELLER" || user?.role === "ADMIN";

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const links: { to: string; label: string; icon: React.ReactNode }[] = [
    {
      to: "/dashboard",
      label: "My Accounts",
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
  ];
  if (isStaff) {
    links.push({
      to: "/teller",
      label: "Teller Workstation",
      icon: <Landmark className="h-4 w-4" />,
    });
  }

  return (
    <div className="flex min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-card/50 backdrop-blur-xl md:flex">
        <div className="flex h-16 items-center gap-2 border-b px-5">
          <PiggyBank className="h-6 w-6 text-primary" />
          <span className="text-lg font-bold tracking-tight">SecureBank</span>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )
              }
            >
              {link.icon}
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t p-3">
          <div className="mb-3 flex items-center gap-3 rounded-md px-2 py-1">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
              <UserRound className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user?.fullName}</p>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3" />
                {user?.role}
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      <main className="flex-1 px-4 py-6 md:ml-60 md:px-8">
        <Outlet />
      </main>
    </div>
  );
}
