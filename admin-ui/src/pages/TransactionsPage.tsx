import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TransactionDetailSheet } from "@/components/transactions/TransactionDetailSheet";
import {
  DATA_TABLE_EMPTY_MIN_HEIGHT,
  dataTableBodyClassName,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/api";
import { formatDateTime, formatNaira } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRightLeft, RefreshCw } from "lucide-react";

type TransactionRow = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionEmail: string;
  type: string;
  amount: number;
  balanceAfter: number;
  description: string;
  reference: string;
  createdAt: string;
};

type ListResponse = {
  items: TransactionRow[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

const TYPE_TABS = [
  { id: "", label: "All" },
  { id: "funding", label: "Funding" },
  { id: "verification_charge", label: "Verifications" },
  { id: "reward_credit", label: "Rewards" },
  { id: "adjustment", label: "Adjustments" },
] as const;

function typeTone(type: string) {
  if (type === "funding") return "success" as const;
  if (type === "verification_charge") return "warning" as const;
  if (type === "reward_credit") return "info" as const;
  return "muted" as const;
}

function typeLabel(type: string) {
  return type.replace(/_/g, " ");
}

export function TransactionsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const typeFilter = searchParams.get("type") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const openTransaction = (id: string) => {
    setSelectedId(id);
    setSheetOpen(true);
  };

  const closeSheet = () => {
    setSheetOpen(false);
    setSelectedId(null);
  };

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "25",
        });
        if (typeFilter) params.set("type", typeFilter);
        const result = await apiGet<ListResponse>(
          `/platform/admin/transactions?${params.toString()}`,
        );
        setData(result);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page, typeFilter],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const setType = (next: string) => {
    const params: Record<string, string> = {};
    if (next) params.type = next;
    setSearchParams(params);
  };

  const setPage = (next: number) => {
    const params: Record<string, string> = { page: String(next) };
    if (typeFilter) params.type = typeFilter;
    setSearchParams(params);
  };

  const rows = data?.items ?? [];
  const isEmpty = !loading && rows.length === 0;

  return (
    <>
      <div className="flex h-[calc(100dvh-6.75rem)] min-h-[28rem] flex-col gap-4">
        <div className="shrink-0 flex w-full items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-line p-1 bg-card">
            {TYPE_TABS.map((t) => (
              <button
                key={t.id || "all"}
                type="button"
                onClick={() => setType(t.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  typeFilter === t.id
                    ? "bg-surface text-ink border border-line shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-nav-hover border border-transparent",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void load("refresh")}
            disabled={refreshing || loading}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer disabled:opacity-50"
            aria-label="Refresh transactions"
          >
            <RefreshCw
              className={cn("h-4 w-4", refreshing && "animate-spin")}
            />
          </button>
        </div>

        <Card
          padding="none"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className={dataTableBodyClassName(isEmpty)}>
            {loading ? (
              <SkeletonTable rows={12} columns={5} />
            ) : isEmpty ? (
              <EmptyState
                icon={ArrowRightLeft}
                title="No transactions yet"
                description="Wallet movements across institutions will appear here."
                className={cn("py-0", DATA_TABLE_EMPTY_MIN_HEIGHT)}
              />
            ) : (
              <div className="overflow-x-auto -mx-1 min-w-0">
                <table className="w-full min-w-[800px] text-left">
                  <thead className="sticky top-0 z-10 bg-card border-b border-line">
                    <tr className="text-xs uppercase tracking-wider text-muted">
                      <th className="px-4 py-3 font-medium">Institution</th>
                      <th className="px-4 py-3 font-medium">Type</th>
                      <th className="px-4 py-3 font-medium hidden sm:table-cell">
                        Amount
                      </th>
                      <th className="px-4 py-3 font-medium hidden md:table-cell">
                        When
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {rows.map((row) => (
                      <tr
                        key={row.id}
                        onClick={() => openTransaction(row.id)}
                        className="transition-colors hover:bg-hover/60 cursor-pointer"
                      >
                        <td className="px-4 py-4 text-sm">
                          <span className="font-medium text-ink">
                            {row.institutionName}
                          </span>
                          <p className="text-xs text-muted mt-0.5 truncate max-w-[220px]">
                            {row.description}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <Badge tone={typeTone(row.type)}>
                            {typeLabel(row.type)}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-sm tabular-nums font-medium text-ink hidden sm:table-cell">
                          {row.type === "verification_charge" ? "−" : "+"}
                          {formatNaira(row.amount)}
                        </td>
                        <td className="px-4 py-4 text-xs text-muted hidden md:table-cell">
                          {formatDateTime(row.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {data && !loading && !isEmpty && (
            <div className="shrink-0 border-t border-line px-4 py-3">
              <Pagination
                page={data.page}
                totalPages={data.totalPages}
                total={data.total}
                onPageChange={setPage}
              />
            </div>
          )}
        </Card>
      </div>

      <TransactionDetailSheet
        open={sheetOpen}
        transactionId={selectedId}
        onClose={closeSheet}
      />
    </>
  );
}
