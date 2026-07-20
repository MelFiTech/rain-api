import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { SkeletonCards, SkeletonPanelCards } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/api";
import { formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import {
  Building2,
  ClipboardList,
  Landmark,
  ShieldCheck,
  Wallet,
} from "lucide-react";

type DashboardData = {
  totalInstitutions: number;
  pendingAccessRequests: number;
  totalVerifications: number;
  totalReports: number;
  pendingWithdrawals: number;
  totalWalletBalance: number;
};

let dashboardCache: DashboardData | null = null;

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(() => dashboardCache);
  const [loading, setLoading] = useState(() => dashboardCache === null);

  useEffect(() => {
    if (dashboardCache) return;
    let cancelled = false;
    setLoading(true);
    void apiGet<DashboardData>("/platform/admin/dashboard")
      .then((result) => {
        if (cancelled) return;
        dashboardCache = result;
        setData(result);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = data
    ? [
        {
          label: "Institutions",
          value: data.totalInstitutions.toLocaleString(),
          href: "/institutions",
          icon: Building2,
          tone: "info" as const,
        },
        {
          label: "Pending access requests",
          value: data.pendingAccessRequests.toLocaleString(),
          href: "/institutions?tab=requests",
          icon: ShieldCheck,
          tone: data.pendingAccessRequests > 0 ? ("warning" as const) : ("soft" as const),
        },
        {
          label: "Platform verifications",
          value: data.totalVerifications.toLocaleString(),
          href: "/institutions",
          icon: ShieldCheck,
          tone: "violet" as const,
        },
        {
          label: "Reports submitted",
          value: data.totalReports.toLocaleString(),
          href: "/institutions",
          icon: ClipboardList,
          tone: "default" as const,
        },
        {
          label: "Pending withdrawals",
          value: data.pendingWithdrawals.toLocaleString(),
          href: "/withdrawals",
          icon: Landmark,
          tone: data.pendingWithdrawals > 0 ? ("danger" as const) : ("success" as const),
        },
        {
          label: "Total wallet balance",
          value: formatNaira(data.totalWalletBalance),
          href: "/institutions",
          icon: Wallet,
          tone: "success" as const,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {loading && !dashboardCache ? (
        <>
          <SkeletonCards count={6} />
          <SkeletonPanelCards count={2} />
        </>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const inner = (
              <Card className="h-full transition-colors hover:bg-hover/40">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium uppercase tracking-wider text-muted">
                    {stat.label}
                  </p>
                  <Badge tone="muted">Live</Badge>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3">
                  <p className="text-2xl font-semibold tracking-tight text-ink tabular-nums">
                    {stat.value}
                  </p>
                  <Icon className="h-5 w-5 text-muted shrink-0 pb-0.5" />
                </div>
              </Card>
            );
            return (
              <Link key={stat.label} to={stat.href} className="block">
                {inner}
              </Link>
            );
          })}
        </div>
      )}

      {data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <h3 className="text-base font-semibold text-ink">Needs attention</h3>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center justify-between gap-2">
                <span className="text-muted">Access requests awaiting review</span>
                <Link
                  to="/institutions?tab=requests"
                  className={cn(
                    "font-medium tabular-nums",
                    data.pendingAccessRequests > 0
                      ? "text-primary"
                      : "text-ink",
                  )}
                >
                  {data.pendingAccessRequests}
                </Link>
              </li>
              <li className="flex items-center justify-between gap-2">
                <span className="text-muted">Withdrawals awaiting approval</span>
                <Link
                  to="/withdrawals"
                  className={cn(
                    "font-medium tabular-nums",
                    data.pendingWithdrawals > 0 ? "text-primary" : "text-ink",
                  )}
                >
                  {data.pendingWithdrawals}
                </Link>
              </li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-base font-semibold text-ink">Quick links</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                to="/institutions"
                className="text-sm px-3 py-1.5 rounded-xl bg-hover text-foreground hover:bg-active transition-colors"
              >
                All institutions
              </Link>
              <Link
                to="/institutions?tab=requests"
                className="text-sm px-3 py-1.5 rounded-xl bg-hover text-foreground hover:bg-active transition-colors"
              >
                Review requests
              </Link>
              <Link
                to="/withdrawals"
                className="text-sm px-3 py-1.5 rounded-xl bg-hover text-foreground hover:bg-active transition-colors"
              >
                Manage withdrawals
              </Link>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
