import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/Badge";
import { DetailField, SideSheet } from "@/components/ui/SideSheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { apiGet } from "@/lib/api";
import { formatDateTime, formatNaira } from "@/lib/format";

type MonnifyPayer = {
  customerName?: string;
  customerEmail?: string;
  paymentMethod?: string;
  amountPaid?: number;
  paidOn?: string;
  sources?: Array<{
    accountName?: string;
    accountNumber?: string;
    bankCode?: string;
    amountPaid?: number;
  }>;
};

export type TransactionDetail = {
  id: string;
  institutionId: string;
  institutionName: string;
  institutionEmail: string;
  institutionWalletBalance: number;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  flow: "inflow" | "outflow";
  description: string;
  reference: string;
  createdAt: string;
  funding?: {
    creditAmount: number;
    fee: number;
    transferAmount: number;
    fundReference?: string;
    destination?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    };
    sender?: MonnifyPayer;
    senderAvailable: boolean;
  };
  verification?: {
    reference: string;
    maskedIdentifier: string;
    identifierType: string;
    result: string;
    feeAmount: number;
    recipient: { name: string; description: string };
  };
  earning?: {
    kind: string;
    withdrawalReference?: string;
    amount: number;
    description: string;
  };
};

function typeTone(type: string) {
  if (type === "funding") return "success" as const;
  if (type === "verification_charge") return "warning" as const;
  if (type === "reward_credit") return "info" as const;
  return "muted" as const;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-line/80 bg-surface-2/40 p-4 space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </p>
      {children}
    </div>
  );
}

function SenderBlock({ sender }: { sender: MonnifyPayer }) {
  const source = sender.sources?.[0];
  return (
    <div className="grid grid-cols-2 gap-4">
      {sender.customerName && (
        <DetailField label="Name" value={sender.customerName} className="col-span-2" />
      )}
      {sender.customerEmail && (
        <DetailField label="Email" value={sender.customerEmail} className="col-span-2" />
      )}
      {sender.paymentMethod && (
        <DetailField label="Payment method" value={sender.paymentMethod.replace(/_/g, " ")} />
      )}
      {sender.amountPaid != null && (
        <DetailField label="Amount paid" value={formatNaira(sender.amountPaid)} />
      )}
      {sender.paidOn && (
        <DetailField label="Paid on" value={sender.paidOn} className="col-span-2" />
      )}
      {source?.accountName && (
        <DetailField label="Sender account name" value={source.accountName} className="col-span-2" />
      )}
      {source?.accountNumber && (
        <DetailField label="Sender account" value={source.accountNumber} mono />
      )}
      {source?.bankCode && (
        <DetailField label="Bank code" value={source.bankCode} mono />
      )}
    </div>
  );
}

interface TransactionDetailSheetProps {
  open: boolean;
  transactionId: string | null;
  onClose: () => void;
}

export function TransactionDetailSheet({
  open,
  transactionId,
  onClose,
}: TransactionDetailSheetProps) {
  const [detail, setDetail] = useState<TransactionDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !transactionId) {
      setDetail(null);
      setError("");
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    void apiGet<TransactionDetail>(
      `/platform/admin/transactions/${encodeURIComponent(transactionId)}`,
    )
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "Could not load transaction.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, transactionId]);

  const displayAmount = detail ? Math.abs(detail.amount) : 0;
  const amountPrefix =
    detail?.flow === "outflow" || detail?.amount < 0 ? "−" : "+";

  return (
    <SideSheet
      open={open}
      onClose={onClose}
      title="Transaction details"
      description={
        detail?.description ?? (loading ? "Loading…" : undefined)
      }
      size="md"
    >
      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      )}

      {!loading && error && (
        <p className="text-sm text-bad-fg">{error}</p>
      )}

      {!loading && detail && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-2xl font-semibold text-ink tabular-nums tracking-tight">
              {amountPrefix}
              {formatNaira(displayAmount)}
            </p>
            <Badge tone={typeTone(detail.type)}>
              {detail.type.replace(/_/g, " ")}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <DetailField
              label="Wallet before"
              value={formatNaira(detail.balanceBefore)}
            />
            <DetailField
              label="Wallet after"
              value={formatNaira(detail.balanceAfter)}
            />
            <DetailField
              label="Institution"
              value={
                <Link
                  to={`/institutions/${detail.institutionId}`}
                  className="text-primary hover:underline font-medium"
                  onClick={onClose}
                >
                  {detail.institutionName}
                </Link>
              }
              className="col-span-2"
            />
            <DetailField
              label="Email"
              value={detail.institutionEmail}
              className="col-span-2"
            />
            <DetailField
              label="Reference"
              value={detail.reference}
              mono
              className="col-span-2"
            />
            <DetailField
              label="Transaction ID"
              value={detail.id}
              mono
              className="col-span-2"
            />
            <DetailField
              label="Created"
              value={formatDateTime(detail.createdAt)}
              className="col-span-2"
            />
          </div>

          {detail.funding && (
            <>
              <DetailSection title="Funding breakdown">
                <div className="grid grid-cols-2 gap-4">
                  <DetailField
                    label="Credit to wallet"
                    value={formatNaira(detail.funding.creditAmount)}
                  />
                  <DetailField
                    label="Rain fee"
                    value={formatNaira(detail.funding.fee)}
                  />
                  <DetailField
                    label="Transfer total"
                    value={formatNaira(detail.funding.transferAmount)}
                    className="col-span-2"
                  />
                  {detail.funding.fundReference && (
                    <DetailField
                      label="Funding reference"
                      value={detail.funding.fundReference}
                      mono
                      className="col-span-2"
                    />
                  )}
                  {detail.funding.destination && (
                    <>
                      <DetailField
                        label="Paid to bank"
                        value={detail.funding.destination.bankName}
                        className="col-span-2"
                      />
                      <DetailField
                        label="Account name"
                        value={detail.funding.destination.accountName}
                        className="col-span-2"
                      />
                      <DetailField
                        label="Account number"
                        value={detail.funding.destination.accountNumber}
                        mono
                        className="col-span-2"
                      />
                    </>
                  )}
                </div>
              </DetailSection>

              <DetailSection title="Sender">
                {detail.funding.senderAvailable && detail.funding.sender ? (
                  <SenderBlock sender={detail.funding.sender} />
                ) : (
                  <p className="text-sm text-muted leading-relaxed">
                    Sender bank details appear after Monnify sends a{" "}
                    <span className="font-mono text-xs">SUCCESSFUL_TRANSACTION</span>{" "}
                    webhook (customer name, email, and{" "}
                    <span className="font-mono text-xs">paymentSourceInformation</span>
                    ).
                  </p>
                )}
              </DetailSection>
            </>
          )}

          {detail.verification && (
            <DetailSection title="Verification fee">
              <div className="grid grid-cols-2 gap-4">
                <DetailField
                  label="Recipient"
                  value={detail.verification.recipient.name}
                />
                <DetailField
                  label="Fee"
                  value={formatNaira(detail.verification.feeAmount)}
                />
                <DetailField
                  label="Verification"
                  value={detail.verification.reference}
                  mono
                  className="col-span-2"
                />
                <DetailField
                  label="Subject"
                  value={detail.verification.maskedIdentifier}
                  className="col-span-2"
                />
                <DetailField
                  label="Identifier type"
                  value={detail.verification.identifierType.replace(/_/g, " ")}
                />
                <DetailField
                  label="Result"
                  value={detail.verification.result.replace(/_/g, " ")}
                />
                <DetailField
                  label="Purpose"
                  value={detail.verification.recipient.description}
                  className="col-span-2"
                />
              </div>
            </DetailSection>
          )}

          {detail.earning && (
            <DetailSection title="Earning">
              <div className="grid grid-cols-2 gap-4">
                <DetailField
                  label="Amount"
                  value={formatNaira(detail.earning.amount)}
                />
                <DetailField
                  label="Source"
                  value={detail.earning.kind.replace(/_/g, " ")}
                />
                {detail.earning.withdrawalReference && (
                  <DetailField
                    label="Withdrawal ref"
                    value={detail.earning.withdrawalReference}
                    mono
                    className="col-span-2"
                  />
                )}
                <DetailField
                  label="Description"
                  value={detail.earning.description}
                  className="col-span-2"
                />
              </div>
            </DetailSection>
          )}
        </div>
      )}
    </SideSheet>
  );
}
