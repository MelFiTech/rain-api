import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect } from "react";

interface SideSheetProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg";
}

export function SideSheet({
  open,
  onClose,
  title,
  description,
  children,
  size = "md",
}: SideSheetProps) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "w-[min(calc(100vw-16px),24rem)]",
    md: "w-[min(calc(100vw-16px),28rem)]",
    lg: "w-[min(calc(100vw-16px),34rem)]",
  };

  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "side-sheet-title" : undefined}
        className={cn(
          "absolute inset-y-2 right-2 sm:inset-y-2.5 sm:right-2.5 flex flex-col",
          "bg-surface rounded-2xl border border-line overflow-hidden",
          "shadow-[0_1px_2px_rgba(20,10,15,0.06),0_24px_64px_-16px_rgba(10,5,8,0.55)]",
          "animate-drawer-in",
          sizes[size],
        )}
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-6 pb-2 shrink-0 border-b border-line">
          <div className="min-w-0">
            {title && (
              <h2
                id="side-sheet-title"
                className="text-lg font-semibold text-ink tracking-tight"
              >
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-1 text-sm text-muted">{description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-hover text-muted transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 py-5 no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-xs text-muted uppercase tracking-wider">{label}</p>
      <p
        className={cn(
          "mt-1 text-sm text-ink",
          mono && "font-mono text-xs break-all",
        )}
      >
        {value}
      </p>
    </div>
  );
}

export { DetailField };
