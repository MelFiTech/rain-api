import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { ArrowLeft } from "lucide-react";

type WebhookLogDetail = {
  id: string;
  eventType: string;
  dedupeKey: string | null;
  duplicate: boolean;
  payload: unknown;
  createdAt: string;
};

export function WebhookLogDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<WebhookLogDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError("");
    void apiGet<WebhookLogDetail>(
      `/platform/admin/webhook-logs/${encodeURIComponent(id)}`,
    )
      .then(setDetail)
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Could not load webhook log."),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link
          to="/webhook-logs"
          className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Webhook logs
        </Link>
        <Card className="text-sm text-bad-fg">{error || "Not found."}</Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        to="/webhook-logs"
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Webhook logs
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-semibold text-ink tracking-tight">
          {detail.eventType.replace(/_/g, " ")}
        </h2>
        <Badge tone={detail.duplicate ? "muted" : "success"}>
          {detail.duplicate ? "Duplicate (ignored)" : "First delivery"}
        </Badge>
      </div>

      <Card>
        <dl className="grid gap-4 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-xs text-muted uppercase tracking-wider">
              Log ID
            </dt>
            <dd className="mt-1 font-mono text-xs text-ink break-all">
              {detail.id}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted uppercase tracking-wider">
              Received
            </dt>
            <dd className="mt-1 text-ink">{formatDateTime(detail.createdAt)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs text-muted uppercase tracking-wider">
              Dedupe key
            </dt>
            <dd className="mt-1 font-mono text-xs text-ink break-all">
              {detail.dedupeKey ?? "—"}
            </dd>
          </div>
        </dl>
      </Card>

      <Card padding="none">
        <div className="px-5 sm:px-6 py-4 border-b border-line">
          <h3 className="text-sm font-semibold text-ink">Payload</h3>
        </div>
        <pre className="px-5 sm:px-6 py-4 text-xs text-ink overflow-x-auto no-scrollbar max-h-[min(480px,50vh)]">
          {JSON.stringify(detail.payload, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
