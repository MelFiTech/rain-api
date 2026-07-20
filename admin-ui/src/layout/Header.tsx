import { useAuth } from "@/auth/AuthContext";
import { NAV_ITEMS } from "@/layout/Sidebar";
import { LogOut, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

function getPageTitle(pathname: string): string {
  if (pathname.startsWith("/institutions/") && pathname !== "/institutions") {
    return "Institution";
  }
  if (pathname.startsWith("/webhook-logs/") && pathname !== "/webhook-logs") {
    return "Webhook log";
  }
  const match = NAV_ITEMS.find(
    (item) =>
      pathname === item.to || pathname.startsWith(`${item.to}/`),
  );
  return match?.label ?? "Rain Admin";
}

export function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const title = getPageTitle(pathname);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "RA";

  return (
    <header className="shrink-0 z-30 bg-surface border-b border-line">
      <div className="flex items-center justify-between gap-4 px-2 sm:px-3 lg:px-4 h-16">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl hover:bg-hover cursor-pointer"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-base sm:text-lg font-semibold text-ink tracking-tight truncate">
            {title}
          </h1>
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen((v) => !v)}
            className="ml-1 flex h-8 w-8 items-center justify-center rounded-full bg-hover text-xs font-semibold text-ink ring-1 ring-line cursor-pointer transition-transform hover:scale-105"
            aria-label="Open profile menu"
          >
            {initials}
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-glass backdrop-blur-[48px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_16px_48px_-12px_rgba(10,5,8,0.5)] animate-fade-in overflow-hidden">
              <div className="px-4 py-4">
                <p className="text-sm font-medium text-ink truncate">
                  {user?.name}
                </p>
                <p className="text-xs text-muted truncate mt-0.5">
                  {user?.email}
                </p>
              </div>
              <div className="h-px bg-line" />
              <div className="p-1.5">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex w-full items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-hover transition-colors cursor-pointer"
                >
                  <LogOut className="h-4 w-4 text-muted" />
                  Log out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
