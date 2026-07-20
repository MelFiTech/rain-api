import { cn } from "@/lib/utils";
import {
  ArrowRightLeft,
  Building2,
  Landmark,
  LayoutDashboard,
  PanelLeft,
  Webhook,
  X,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { RainMark } from "@/components/ui/primitives";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/institutions", label: "Institutions", icon: Building2 },
  { to: "/transactions", label: "Transactions", icon: ArrowRightLeft },
  { to: "/withdrawals", label: "Withdrawals", icon: Landmark },
  { to: "/webhook-logs", label: "Webhook logs", icon: Webhook },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggle?: () => void;
}

export function Sidebar({
  open,
  onClose,
  collapsed,
  onToggle,
}: SidebarProps) {
  const renderContent = (isCollapsed: boolean) => (
    <div className="flex h-full flex-col">
      <div
        className={cn(
          "py-6",
          isCollapsed
            ? "flex flex-col items-center gap-3 px-0"
            : "flex items-center justify-between px-5",
        )}
      >
        <NavLink
          to="/dashboard"
          className="flex items-center gap-2.5 group"
          title="Rain Admin"
        >
          <RainMark className="h-8 w-8 shrink-0" />
          {!isCollapsed && (
            <div className="leading-tight">
              <div className="text-sm font-semibold text-ink tracking-tight">
                Rain Admin
              </div>
              <div className="text-[11px] text-muted">Platform operations</div>
            </div>
          )}
        </NavLink>
        <div className={cn("flex items-center", isCollapsed && "flex-col")}>
          {onToggle && (
            <button
              type="button"
              onClick={onToggle}
              className="hidden lg:flex p-1.5 rounded-lg text-muted hover:bg-nav-hover hover:text-foreground transition-colors cursor-pointer"
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft className="h-4 w-4" />
            </button>
          )}
          {onClose && !isCollapsed && (
            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 rounded-lg hover:bg-hover cursor-pointer"
              aria-label="Close menu"
            >
              <X className="h-4 w-4 text-muted" />
            </button>
          )}
        </div>
      </div>

      <nav
        className={cn(
          "flex-1 space-y-1.5 overflow-y-auto no-scrollbar",
          isCollapsed ? "px-2.5" : "px-3",
        )}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/dashboard"}
              onClick={onClose}
              title={isCollapsed ? item.label : undefined}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg text-sm transition-colors",
                  isCollapsed ? "justify-center p-2" : "px-3 py-2",
                  isActive
                    ? "bg-card border border-line text-ink font-medium"
                    : "border border-transparent text-muted hover:bg-nav-hover hover:text-foreground",
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0",
                      isActive && "text-primary",
                    )}
                    strokeWidth={isActive ? 2 : 1.75}
                  />
                  {!isCollapsed && item.label}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
      <aside
        className={cn(
          "hidden lg:flex shrink-0 flex-col transition-[width] duration-200 ease-out",
          collapsed ? "lg:w-[64px]" : "lg:w-60 xl:w-64",
        )}
      >
        {renderContent(!!collapsed)}
      </aside>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 h-full w-72 bg-surface shadow-xl animate-fade-in">
            {renderContent(false)}
          </aside>
        </div>
      )}
    </>
  );
}

export { NAV_ITEMS };
