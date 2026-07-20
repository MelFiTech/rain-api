import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DATA_TABLE_EMPTY_MIN_HEIGHT,
  dataTableBodyClassName,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  SkeletonRequestCards,
  SkeletonTable,
} from "@/components/ui/Skeleton";
import { apiGet, apiPost } from "@/lib/api";
import { formatDateTime, formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, Building2, RefreshCw, ShieldCheck } from "lucide-react";

type InstitutionRow = {
  id: string;
  name: string;
  email: string;
  walletBalance: number;
  userCount: number;
  verificationCount: number;
  reportCount: number;
  apiKeyLastUsedAt?: string;
};

type AccessRequestRecord = {
  id: string;
  companyName: string;
  email: string;
  cacNumber: string;
  status: string;
  createdAt: string;
  institutionId?: string;
  rejectionReason?: string;
};

const TABS = [
  { id: "all", label: "All" },
  { id: "requests", label: "Requests" },
  { id: "approved", label: "Approved" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function RequestApproveActions({
  request,
  actingId,
  approvedIds,
  onApprove,
  onReject,
  compact,
}: {
  request: AccessRequestRecord;
  actingId: string | null;
  approvedIds: ReadonlySet<string>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  compact?: boolean;
}) {
  const approved =
    request.status === "approved" || approvedIds.has(request.id);

  if (request.status === "rejected") {
    return null;
  }

  if (approved) {
    return (
      <Button size="sm" variant="secondary" disabled>
        Approved
      </Button>
    );
  }

  if (request.status !== "pending") {
    return null;
  }

  return (
    <div className={cn("flex shrink-0", compact ? "gap-1 justify-end" : "gap-2")}>
      <Button
        size="sm"
        loading={actingId === request.id}
        onClick={() => onApprove(request.id)}
      >
        Approve
      </Button>
      <Button
        size="sm"
        variant="secondary"
        disabled={actingId === request.id}
        onClick={() => onReject(request.id)}
      >
        Reject
      </Button>
    </div>
  );
}

type InstitutionsListCache = {
  institutions: InstitutionRow[];
  requests: AccessRequestRecord[];
};

let institutionsListCache: InstitutionsListCache | null = null;

function InstitutionsTablePanel({
  rows,
  loading,
}: {
  rows: InstitutionRow[];
  loading: boolean;
}) {
  const isEmpty = !loading && rows.length === 0;

  return (
    <Card
      padding="none"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className={dataTableBodyClassName(isEmpty)}>
        {loading ? (
          <SkeletonTable rows={10} columns={4} />
        ) : isEmpty ? (
          <EmptyState
            icon={Building2}
            title="No active institutions"
            description="Approved institutions appear here once access requests are provisioned."
            className={cn("py-0", DATA_TABLE_EMPTY_MIN_HEIGHT)}
          />
        ) : (
          <div className="overflow-x-auto -mx-1 min-w-0">
            <table className="w-full min-w-[640px] text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted">
                    Institution
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted hidden sm:table-cell">
                    Wallet
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted hidden md:table-cell">
                    Activity
                  </th>
                  <th className="px-4 py-3 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((row) => (
                  <tr
                    key={row.id}
                    className="transition-colors hover:bg-hover/60"
                  >
                    <td className="px-4 py-4 text-sm">
                      <Link
                        to={`/institutions/${row.id}`}
                        className="font-medium text-ink hover:text-primary"
                      >
                        {row.name}
                      </Link>
                      <p className="text-xs text-muted mt-0.5">{row.email}</p>
                    </td>
                    <td className="px-4 py-4 text-sm tabular-nums text-ink hidden sm:table-cell">
                      {formatNaira(row.walletBalance)}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted hidden md:table-cell">
                      {row.verificationCount} verifications · {row.reportCount}{" "}
                      reports · {row.userCount} users
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/institutions/${row.id}`}
                        className="inline-flex p-2 rounded-lg hover:bg-hover text-muted hover:text-foreground"
                        aria-label={`View ${row.name}`}
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && rows.length > 0 && (
        <div className="shrink-0 border-t border-line px-4 py-3">
          <p className="text-xs text-muted tabular-nums">
            {rows.length} institution{rows.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </Card>
  );
}

function RequestCards({
  rows,
  actingId,
  approvedIds,
  onApprove,
  onReject,
  loading,
}: {
  rows: AccessRequestRecord[];
  actingId: string | null;
  approvedIds: ReadonlySet<string>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  loading: boolean;
}) {
  if (loading) {
    return <SkeletonRequestCards count={4} />;
  }

  if (rows.length === 0) {
    return (
      <Card className="flex flex-1 flex-col min-h-[min(360px,45vh)]">
        <EmptyState
          icon={ShieldCheck}
          title="No access requests"
          description="New institution applications will show up here for review."
        />
      </Card>
    );
  }

  return (
    <ul className="space-y-3 min-h-0 flex-1 overflow-y-auto no-scrollbar">
      {rows.map((r) => (
        <li key={r.id}>
          <Card className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-ink">{r.companyName}</h3>
                <Badge
                  tone={
                    r.status === "pending"
                      ? "warning"
                      : r.status === "rejected"
                        ? "danger"
                        : "success"
                  }
                >
                  {r.status}
                </Badge>
              </div>
              <p className="mt-1 text-sm text-muted">
                {r.email} · CAC {r.cacNumber}
              </p>
              <p className="text-xs text-muted mt-1">
                Submitted {formatDateTime(r.createdAt)}
              </p>
              {r.rejectionReason && (
                <p className="text-xs text-muted mt-1">{r.rejectionReason}</p>
              )}
              {r.institutionId && (
                <Link
                  to={`/institutions/${r.institutionId}`}
                  className="inline-flex items-center gap-1 text-xs text-primary mt-2 hover:underline"
                >
                  View institution
                  <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </div>
            <RequestApproveActions
              request={r}
              actingId={actingId}
              approvedIds={approvedIds}
              onApprove={onApprove}
              onReject={onReject}
            />
          </Card>
        </li>
      ))}
    </ul>
  );
}

/** All tab: active institutions plus open access requests in one scrollable table. */
function AllDirectoryTable({
  institutions,
  requests,
  loading,
  actingId,
  approvedIds,
  onApprove,
  onReject,
}: {
  institutions: InstitutionRow[];
  requests: AccessRequestRecord[];
  loading: boolean;
  actingId: string | null;
  approvedIds: ReadonlySet<string>;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  const openRequests = requests.filter(
    (r) => r.status !== "approved" || approvedIds.has(r.id),
  );
  const isEmpty = !loading && institutions.length === 0 && openRequests.length === 0;

  return (
    <Card
      padding="none"
      className="flex min-h-0 flex-1 flex-col overflow-hidden"
    >
      <div className={dataTableBodyClassName(isEmpty)}>
        {loading ? (
          <SkeletonTable rows={12} columns={5} />
        ) : isEmpty ? (
          <EmptyState
            icon={Building2}
            title="Nothing on the directory yet"
            description="Active institutions and open access requests will appear in this list."
            className={cn("py-0", DATA_TABLE_EMPTY_MIN_HEIGHT)}
          />
        ) : (
          <div className="overflow-x-auto -mx-1 min-w-0">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted">
                    Name
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted hidden sm:table-cell">
                    Details
                  </th>
                  <th className="px-4 py-3 text-xs font-medium uppercase tracking-wider text-muted hidden md:table-cell">
                    Activity
                  </th>
                  <th className="px-4 py-3 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {institutions.map((row) => (
                  <tr
                    key={`inst-${row.id}`}
                    className="transition-colors hover:bg-hover/60"
                  >
                    <td className="px-4 py-4 text-sm">
                      <Link
                        to={`/institutions/${row.id}`}
                        className="font-medium text-ink hover:text-primary"
                      >
                        {row.name}
                      </Link>
                      <p className="text-xs text-muted mt-0.5">{row.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge tone="success">Active</Badge>
                    </td>
                    <td className="px-4 py-4 text-sm tabular-nums text-ink hidden sm:table-cell">
                      {formatNaira(row.walletBalance)}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted hidden md:table-cell">
                      {row.verificationCount} verifications · {row.reportCount}{" "}
                      reports
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        to={`/institutions/${row.id}`}
                        className="inline-flex p-2 rounded-lg hover:bg-hover text-muted hover:text-foreground"
                      >
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
                {openRequests.map((r) => (
                  <tr
                    key={`req-${r.id}`}
                    className="transition-colors hover:bg-hover/60"
                  >
                    <td className="px-4 py-4 text-sm">
                      <p className="font-medium text-ink">{r.companyName}</p>
                      <p className="text-xs text-muted mt-0.5">{r.email}</p>
                    </td>
                    <td className="px-4 py-4">
                      <Badge
                        tone={
                          r.status === "pending"
                            ? "warning"
                            : r.status === "rejected"
                              ? "danger"
                              : "muted"
                        }
                      >
                        Request · {r.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-4 text-xs text-muted hidden sm:table-cell">
                      CAC {r.cacNumber}
                    </td>
                    <td className="px-4 py-4 text-xs text-muted hidden md:table-cell">
                      {formatDateTime(r.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <RequestApproveActions
                        request={r}
                        actingId={actingId}
                        approvedIds={approvedIds}
                        onApprove={onApprove}
                        onReject={onReject}
                        compact
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {!loading && !isEmpty && (
        <div className="shrink-0 border-t border-line px-4 py-3">
          <p className="text-xs text-muted tabular-nums">
            {institutions.length} active · {openRequests.length} request
            {openRequests.length !== 1 ? "s" : ""}
          </p>
        </div>
      )}
    </Card>
  );
}

export function InstitutionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as TabId) || "all";
  const setTab = (next: TabId) =>
    setSearchParams(next === "all" ? {} : { tab: next });

  const [institutions, setInstitutions] = useState<InstitutionRow[]>(
    () => institutionsListCache?.institutions ?? [],
  );
  const [requests, setRequests] = useState<AccessRequestRecord[]>(
    () => institutionsListCache?.requests ?? [],
  );
  const [loading, setLoading] = useState(() => institutionsListCache === null);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");

  const load = useCallback(async (mode: "initial" | "refresh" | "silent" = "initial") => {
    if (mode === "refresh") {
      setRefreshing(true);
    } else if (mode === "initial") {
      setLoading(true);
    }
    try {
      const [instData, reqData] = await Promise.all([
        apiGet<InstitutionRow[]>("/platform/admin/institutions"),
        apiGet<AccessRequestRecord[]>("/platform/admin/access-requests"),
      ]);
      setInstitutions(instData);
      setRequests(reqData);
      institutionsListCache = {
        institutions: instData,
        requests: reqData,
      };
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (institutionsListCache) return;
    void load("initial");
  }, [load]);

  const approve = async (id: string) => {
    setActingId(id);
    setMessage("");
    try {
      await apiPost(
        `/platform/admin/access-requests/${encodeURIComponent(id)}/approve`,
      );
      setApprovedIds((prev) => new Set(prev).add(id));
      setRequests((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "approved" } : r)),
      );
      setMessage("Approved. Applicant can sign in with their chosen password.");
      await load("silent");
      setApprovedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Approve failed.");
    } finally {
      setActingId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Rejection reason (optional):") ?? undefined;
    setActingId(id);
    setMessage("");
    try {
      await apiPost(
        `/platform/admin/access-requests/${encodeURIComponent(id)}/reject`,
        { reason },
      );
      setMessage("Request rejected.");
      await load("silent");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Reject failed.");
    } finally {
      setActingId(null);
    }
  };

  const openRequests = requests.filter((r) => r.status !== "approved");
  const tabCounts: Record<TabId, number> = {
    all: institutions.length + openRequests.length,
    requests: requests.length,
    approved: institutions.length,
  };

  return (
    <div className="flex h-[calc(100dvh-6.75rem)] min-h-[28rem] flex-col gap-4">
      <div className="shrink-0 flex w-full items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line p-1 bg-card">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                tab === t.id
                  ? "bg-surface text-ink border border-line shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-nav-hover border border-transparent",
              )}
            >
              {t.label}
              <span
                className={cn(
                  "min-w-[1.375rem] rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none",
                  tab === t.id
                    ? "bg-primary/15 text-primary"
                    : "bg-hover text-muted",
                )}
                aria-label={`${tabCounts[t.id]} items`}
              >
                {loading && !institutionsListCache ? "…" : tabCounts[t.id]}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load("refresh")}
          disabled={refreshing || loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Refresh institutions list"
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshing && "animate-spin")}
          />
        </button>
      </div>

      {message && (
        <p className="shrink-0 text-sm text-primary">{message}</p>
      )}

      {tab === "all" ? (
        <AllDirectoryTable
          institutions={institutions}
          requests={requests}
          loading={loading}
          actingId={actingId}
          approvedIds={approvedIds}
          onApprove={approve}
          onReject={reject}
        />
      ) : tab === "approved" ? (
        <InstitutionsTablePanel rows={institutions} loading={loading} />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <RequestCards
            rows={requests}
            actingId={actingId}
            approvedIds={approvedIds}
            onApprove={approve}
            onReject={reject}
            loading={loading}
          />
        </div>
      )}
    </div>
  );
}
