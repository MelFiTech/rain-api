import { Outlet } from "react-router-dom";
import { useAuth } from "@/auth/AuthContext";
import { Header } from "@/layout/Header";
import { Sidebar } from "@/layout/Sidebar";
import { useEffect, useState } from "react";

const COLLAPSE_KEY = "rain_admin:sidebar-collapsed";

export function AdminLayout() {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((v) => {
      localStorage.setItem(COLLAPSE_KEY, v ? "0" : "1");
      return !v;
    });
  };

  if (!user) return null;

  return (
    <div className="h-screen flex p-1 sm:p-1.5 lg:pl-0 overflow-hidden">
      <Sidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        collapsed={collapsed}
        onToggle={toggleCollapsed}
      />
      <div className="flex-1 flex flex-col min-w-0 bg-surface rounded-2xl border border-line shadow-[0_1px_2px_rgba(20,10,15,0.03),0_12px_32px_-12px_rgba(20,10,15,0.08)] overflow-hidden">
        <Header onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 min-h-0 overflow-y-auto no-scrollbar px-2 sm:px-3 lg:px-4 py-6">
          <div className="animate-fade-in min-h-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
