import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  tone?:
    | "default"
    | "muted"
    | "success"
    | "warning"
    | "info"
    | "danger"
    | "violet";
}

export function Badge({
  children,
  className,
  tone = "default",
}: BadgeProps) {
  const tones = {
    default: "bg-hover text-foreground",
    muted: "bg-transparent text-muted border border-line",
    success: "bg-ok-bg text-ok-fg",
    warning: "bg-warn-bg text-warn-fg",
    info: "bg-info-bg text-info-fg",
    danger: "bg-bad-bg text-bad-fg",
    violet: "bg-violet-bg text-violet-fg",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
