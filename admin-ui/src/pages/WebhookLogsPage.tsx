import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import {
  DATA_TABLE_EMPTY_MIN_HEIGHT,
  dataTableBodyClassName,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowRight, RefreshCw, Webhook } from "lucide-react";

type WebhookLogRow = {
  id: string;
  eventType: string;
  dedupeKey: string | null;
  duplicate: boolean;
  createdAt: string;
};

type ListResponse = {
  items: WebhookLogRow[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

export function WebhookLogsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);

  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(
    async (mode: "initial" | "refresh" = "initial") => {
      if (mode === "refresh") setRefreshing(true);
      else setLoading(true);
      try {
        const result = await apiGet<ListResponse>(
          `/platform/admin/webhook-logs?page=${page}&limit=25`,
        );
        setData(result);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [page],
  );

  useEffect(() => {
    void load("initial");
  }, [load]);

  const setPage = (next: number) => {
    setSearchParams({ page: String(next) });
  };

  const rows = data?.items ?? [];
  const isEmpty = !loading && rows.length === 0;

  return (
    <div className="flex h-[calc(100dvh-6.75rem)] min-h-[28rem] flex-col gap-4">
      <div className="shrink-0 flex w-full items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Inbound Monnify webhook notifications received by this API.
        </p>
        <button
          type="button"
          onClick={() => void load("refresh")}
          disabled={refreshing || loading}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-card text-muted hover:text-foreground hover:bg-hover transition-colors cursor-pointer disabled:opacity-50"
          aria-label="Refresh webhook logs"
        >
          <RefreshCw
            className={cn("h-4 w-4", refreshing && "animate-spin")}
          />
        </button>
      </div>

      <Card padding="none" className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={dataTableBodyClassName(isEmpty)}>
          {loading ? (
            <SkeletonTable rows={12} columns={4} />
          ) : isEmpty ? (
            <EmptyState
              icon={Webhook}
              title="No webhook logs yet"
              description="Configure Monnify to POST to /webhooks/monnify. Events will show up here."
              className={cn("py-0", DATA_TABLE_EMPTY_MIN_HEIGHT)}
            />
          ) : (
            <div className="overflow-x-auto -mx-1 min-w-0">
              <table className="w-full min-w-[720px] text-left">
                <thead className="sticky top-0 z-10 bg-card border-b border-line">
                  <tr className="text-xs uppercase tracking-wider text-muted">
                    <th className="px-4 py-3 font-medium">Event</th>
                    <th className="px-4 py-3 font-medium hidden sm:table-cell">
                      Dedupe key
                    </th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium hidden md:table-cell">
                      Received
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
                      <td className="px-4 py-4 text-sm font-medium text-ink">
                        <Link
                          to={`/webhook-logs/${row.id}`}
                          className="hover:text-primary"
                        >
                          {row.eventType.replace(/_/g, " ")}
                        </Link>
                      </td>
                      <td className="px-4 py-4 text-xs font-mono text-muted hidden sm:table-cell max-w-[280px] truncate">
                        {row.dedupeKey ?? "—"}
                      </td>
                      <td className="px-4 py-4">
                        <Badge tone={row.duplicate ? "muted" : "success"}>
                          {row.duplicate ? "Duplicate" : "Processed"}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-xs text-muted hidden md:table-cell">
                        {formatDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link
                          to={`/webhook-logs/${row.id}`}
                          className="inline-flex p-2 rounded-lg hover:bg-hover text-muted hover:text-foreground"
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
  );
}
