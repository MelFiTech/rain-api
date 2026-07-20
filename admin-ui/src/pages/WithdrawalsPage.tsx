import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  DATA_TABLE_EMPTY_MIN_HEIGHT,
  dataTableBodyClassName,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCards, SkeletonRequestCards } from "@/components/ui/Skeleton";
import { apiGet, apiPost } from "@/lib/api";
import { formatDateTime, formatNaira, maskAccountNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, Landmark, RefreshCw } from "lucide-react";

type SettlementBank = {
  accountName: string;
  bankName: string;
  accountNumber: string;
};

type WithdrawalRecord = {
  id: string;
  institutionId: string;
  amount: number;
  status: string;
  institutionName: string;
  institutionEmail: string;
  settlementBank: SettlementBank | null;
  createdAt: string;
  reviewedAt?: string;
  reviewedByEmail?: string;
  rejectionReason?: string;
};

const FILTERS = [
  "pending_approval",
  "queued",
  "processing",
  "completed",
  "rejected",
  "failed",
] as const;

type FilterId = (typeof FILTERS)[number];

let withdrawalsListCache: WithdrawalRecord[] | null = null;

function filterLabel(s: FilterId): string {
  if (s === "pending_approval") return "Pending approval";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusTone(status: string) {
  if (status === "pending_approval") return "warning" as const;
  if (status === "completed") return "success" as const;
  if (status === "rejected" || status === "failed") return "danger" as const;
  return "info" as const;
}

export function WithdrawalsPage() {
  const [allRows, setAllRows] = useState<WithdrawalRecord[]>(
    () => withdrawalsListCache ?? [],
  );
  const [filter, setFilter] = useState<FilterId>("pending_approval");
  const [loading, setLoading] = useState(() => withdrawalsListCache === null);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [approvedIds, setApprovedIds] = useState<Set<string>>(() => new Set());
  const [message, setMessage] = useState("");

  const load = useCallback(async (mode: "initial" | "refresh" | "silent" = "initial") => {
    if (mode === "refresh") setRefreshing(true);
    else if (mode === "initial") setLoading(true);
    try {
      const data = await apiGet<WithdrawalRecord[]>(
        "/platform/admin/earnings-withdrawals",
      );
      setAllRows(data);
      withdrawalsListCache = data;
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (withdrawalsListCache) return;
    void load("initial");
  }, [load]);

  const counts = useMemo(() => {
    const map = {} as Record<FilterId, number>;
    for (const f of FILTERS) {
      map[f] = allRows.filter((r) => r.status === f).length;
    }
    return map;
  }, [allRows]);

  const rows = useMemo(
    () => allRows.filter((r) => r.status === filter),
    [allRows, filter],
  );

  const pendingApproval = useMemo(
    () => allRows.filter((r) => r.status === "pending_approval"),
    [allRows],
  );
  const inProgress = useMemo(
    () =>
      allRows.filter(
        (r) => r.status === "queued" || r.status === "processing",
      ),
    [allRows],
  );
  const completed = useMemo(
    () => allRows.filter((r) => r.status === "completed"),
    [allRows],
  );

  const pendingApprovalTotal = pendingApproval.reduce((s, r) => s + r.amount, 0);

  const metricCards = [
    {
      label: "Pending approval",
      value: loading && !withdrawalsListCache ? "…" : String(pendingApproval.length),
      hint: formatNaira(pendingApprovalTotal),
      icon: Clock,
    },
    {
      label: "In progress",
      value: loading && !withdrawalsListCache ? "…" : String(inProgress.length),
      hint: "Queued or processing",
      icon: Landmark,
    },
    {
      label: "Completed",
      value: loading && !withdrawalsListCache ? "…" : String(completed.length),
      hint: "Paid out successfully",
      icon: CheckCircle2,
    },
  ];

  const approve = async (id: string) => {
    setActingId(id);
    setMessage("");
    try {
      await apiPost(
        `/platform/admin/earnings-withdrawals/${encodeURIComponent(id)}/approve`,
      );
      setApprovedIds((prev) => new Set(prev).add(id));
      setMessage(
        "Approved. Payout queued for Monnify within the configured window.",
      );
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
        `/platform/admin/earnings-withdrawals/${encodeURIComponent(id)}/reject`,
        { reason },
      );
      setMessage("Rejected. Earnings returned to the institution.");
      await load("silent");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Reject failed.");
    } finally {
      setActingId(null);
    }
  };

  const emptyCopy = {
    title:
      filter === "pending_approval"
        ? "No withdrawals awaiting approval"
        : `No ${filterLabel(filter).toLowerCase()} withdrawals`,
    description:
      filter === "pending_approval"
        ? "When institutions request earnings bank payouts, they will appear here for review."
        : "Switch tabs to see payouts in other statuses.",
  };

  return (
    <div className="space-y-6">
      {loading && !withdrawalsListCache ? (
        <SkeletonCards count={3} />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {metricCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.label} className="h-full">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs font-medium uppercase tracking-wider text-muted">
                    {stat.label}
                  </p>
                  <Icon className="h-4 w-4 text-muted shrink-0" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-tight text-ink tabular-nums">
                  {stat.value}
                </p>
                <p className="mt-1 text-xs text-muted">{stat.hint}</p>
              </Card>
            );
          })}
        </div>
      )}

      <div className="flex w-full items-center justify-between gap-3">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line p-1 bg-card">
          {FILTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer whitespace-nowrap",
                filter === s
                  ? "bg-surface text-ink border border-line shadow-sm"
                  : "text-muted hover:text-foreground hover:bg-nav-hover border border-transparent",
              )}
            >
              {filterLabel(s)}
              <span
                className={cn(
                  "min-w-[1.375rem] rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums leading-none",
                  filter === s
                    ? "bg-primary/15 text-primary"
                    : "bg-hover text-muted",
                )}
              >
                {loading && !withdrawalsListCache ? "…" : counts[s]}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void load("refresh")}
          disabled={refreshing || loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Refresh withdrawals"
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshing && "animate-spin")}
          />
        </button>
      </div>

      {message && <p className="text-sm text-primary">{message}</p>}

      {loading && !withdrawalsListCache ? (
        <SkeletonRequestCards count={4} />
      ) : rows.length === 0 ? (
        <Card padding="none" className="flex flex-col overflow-hidden">
          <div className={dataTableBodyClassName(true)}>
            <EmptyState
              icon={Landmark}
              title={emptyCopy.title}
              description={emptyCopy.description}
              className={cn("py-0", DATA_TABLE_EMPTY_MIN_HEIGHT)}
            />
          </div>
        </Card>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      to={`/institutions/${r.institutionId}`}
                      className="font-semibold text-ink hover:text-primary"
                    >
                      {r.institutionName}
                    </Link>
                    <Badge tone={statusTone(r.status)}>
                      {r.status.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {formatNaira(r.amount)} · {r.institutionEmail}
                  </p>
                  {r.settlementBank && (
                    <p className="text-xs text-muted mt-1">
                      {r.settlementBank.bankName} ·{" "}
                      {r.settlementBank.accountName}{" "}
                      · {maskAccountNumber(r.settlementBank.accountNumber)}
                    </p>
                  )}
                  <p className="text-xs text-muted mt-1">
                    Requested {formatDateTime(r.createdAt)}
                    {r.reviewedAt && (
                      <>
                        {" "}
                        · Reviewed {formatDateTime(r.reviewedAt)}
                        {r.reviewedByEmail ? ` by ${r.reviewedByEmail}` : ""}
                      </>
                    )}
                  </p>
                  {r.rejectionReason && (
                    <p className="text-xs text-bad-fg mt-1">
                      {r.rejectionReason}
                    </p>
                  )}
                </div>
                {r.status === "pending_approval" || approvedIds.has(r.id) ? (
                  <div className="flex gap-2 shrink-0">
                    {approvedIds.has(r.id) || r.status !== "pending_approval" ? (
                      <Button size="sm" variant="secondary" disabled>
                        Approved
                      </Button>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          loading={actingId === r.id}
                          onClick={() => approve(r.id)}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={actingId === r.id}
                          onClick={() => reject(r.id)}
                        >
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                ) : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
