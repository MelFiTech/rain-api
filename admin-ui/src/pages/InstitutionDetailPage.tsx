import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton, SkeletonInstitutionDetail } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/api";
import { formatDateTime, formatNaira, maskAccountNumber } from "@/lib/format";
import { ArrowLeft, History, Users } from "lucide-react";

const ACTIVITY_PAGE_SIZE = 10;

type InstitutionDetail = {
  institution: {
    id: string;
    name: string;
    email: string;
    walletBalance: number;
    lowBalanceThreshold: number;
    apiKeyPrefix: string;
    apiKeyLastUsedAt?: string;
    apiKeyCreatedAt: string;
    contactName?: string;
    phone?: string;
    address?: string;
    settlementBank: {
      accountName: string;
      bankName: string;
      accountNumber: string;
    } | null;
  };
  stats: {
    teamMembers: number;
    verifications: number;
    reports: number;
    walletTransactions: number;
    pendingWithdrawals: number;
    totalEarnings: number;
  };
  team: {
    id: string;
    name: string;
    email: string;
    role: string;
    isPlatformAdmin: boolean;
  }[];
};

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  detail: string;
  createdAt: string;
};

type ActivityResponse = {
  items: ActivityItem[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

export function InstitutionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<InstitutionDetail | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotal, setActivityTotal] = useState(0);
  const [activityTotalPages, setActivityTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    setActivityPage(1);
    apiGet<InstitutionDetail>(
      `/platform/admin/institutions/${encodeURIComponent(id)}`,
    )
      .then(setDetail)
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to load institution.");
      })
      .finally(() => setLoading(false));
  }, [id]);

  const loadActivity = useCallback(
    async (page: number) => {
      if (!id) return;
      setActivityLoading(true);
      try {
        const a = await apiGet<ActivityResponse>(
          `/platform/admin/institutions/${encodeURIComponent(id)}/activity?page=${page}&limit=${ACTIVITY_PAGE_SIZE}`,
        );
        setActivity(a.items);
        setActivityTotal(a.total);
        setActivityTotalPages(a.totalPages);
        setActivityPage(a.page);
      } finally {
        setActivityLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (!id || loading || error) return;
    void loadActivity(activityPage);
  }, [id, activityPage, loadActivity, loading, error]);

  if (loading) {
    return <SkeletonInstitutionDetail />;
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link
          to="/institutions"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to institutions
        </Link>
        <Card className="text-sm text-bad-fg">{error || "Not found."}</Card>
      </div>
    );
  }

  const { institution, stats, team } = detail;
  const statCards = [
    { label: "Team members", value: stats.teamMembers },
    { label: "Verifications", value: stats.verifications },
    { label: "Reports", value: stats.reports },
    { label: "Wallet txns", value: stats.walletTransactions },
    { label: "Pending withdrawals", value: stats.pendingWithdrawals },
    { label: "Total earnings", value: formatNaira(stats.totalEarnings) },
  ];

  return (
    <div className="space-y-6">
      <Link
        to="/institutions"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Institutions
      </Link>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink tracking-tight">
            {institution.name}
          </h2>
          <p className="text-sm text-muted mt-1">{institution.email}</p>
        </div>
        <Badge tone="info">API {institution.apiKeyPrefix}…</Badge>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {statCards.map((s) => (
          <Card key={s.label} padding="sm" className="text-center sm:text-left">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              {s.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-ink tabular-nums">
              {s.value}
            </p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Profile" />
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted text-xs">Wallet balance</dt>
              <dd className="font-medium text-ink tabular-nums">
                {formatNaira(institution.walletBalance)}
              </dd>
            </div>
            {institution.contactName && (
              <div>
                <dt className="text-muted text-xs">Contact</dt>
                <dd className="text-ink">{institution.contactName}</dd>
              </div>
            )}
            <div>
              <dt className="text-muted text-xs">API key last used</dt>
              <dd className="text-ink">
                {institution.apiKeyLastUsedAt
                  ? formatDateTime(institution.apiKeyLastUsedAt)
                  : "Never"}
              </dd>
            </div>
            {institution.settlementBank && (
              <div>
                <dt className="text-muted text-xs">Settlement bank</dt>
                <dd className="text-ink">
                  {institution.settlementBank.bankName} ·{" "}
                  {maskAccountNumber(institution.settlementBank.accountNumber)}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        <Card>
          <CardHeader title="Team" />
          {team.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No team members"
              description="This institution has not added any dashboard users yet."
              className="py-8"
            />
          ) : (
            <ul className="space-y-2">
              {team.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-2 text-sm py-2 border-b border-line last:border-0"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-ink truncate">{u.name}</p>
                    <p className="text-xs text-muted truncate">{u.email}</p>
                  </div>
                  <Badge tone="muted">{u.role}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card padding="none">
        <div className="px-5 sm:px-6 py-5 border-b border-line">
          <h3 className="text-base font-semibold text-ink">Recent activity</h3>
          <p className="text-sm text-muted mt-0.5">
            Verifications, reports, wallet movements, and withdrawals.
          </p>
        </div>
        {activityLoading && activity.length === 0 ? (
          <div className="divide-y divide-line">
            {Array.from({ length: ACTIVITY_PAGE_SIZE }).map((_, i) => (
              <div key={i} className="px-5 sm:px-6 py-3 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
              </div>
            ))}
          </div>
        ) : activityTotal === 0 ? (
          <EmptyState
            icon={History}
            title="No activity yet"
            description="Verifications, reports, wallet movements, and withdrawals will appear here as this institution uses Rain."
            className="py-10"
          />
        ) : (
          <>
            <ul className="divide-y divide-line">
              {activity.map((item) => (
                <li
                  key={`${item.type}-${item.id}`}
                  className="px-5 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1"
                >
                  <div>
                    <p className="text-sm font-medium text-ink">{item.title}</p>
                    <p className="text-xs text-muted">{item.detail}</p>
                  </div>
                  <time className="text-xs text-subtle shrink-0">
                    {formatDateTime(item.createdAt)}
                  </time>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 sm:px-6 py-4">
              <Pagination
                page={activityPage}
                totalPages={activityTotalPages}
                total={activityTotal}
                onPageChange={setActivityPage}
              />
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
