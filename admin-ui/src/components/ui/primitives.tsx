import { cn } from "@/lib/utils";

export function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-line p-5 sm:p-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-hover text-muted border border-line",
        className,
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-semibold tracking-tight text-ink">
        {title}
      </h1>
      {description && (
        <p className="mt-1 text-sm text-muted leading-relaxed">{description}</p>
      )}
    </div>
  );
}

export function Input({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-sm font-medium text-ink">{label}</span>
      )}
      <input
        className={cn(
          "w-full h-11 px-3.5 rounded-xl border border-line bg-card text-ink text-sm placeholder:text-subtle focus:outline-none focus:ring-2 focus:ring-primary/30",
          className,
        )}
        {...props}
      />
    </label>
  );
}

export function RainMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="rain-drop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f2679e" />
          <stop offset="100%" stopColor="#d63f7c" />
        </linearGradient>
      </defs>
      <path
        fill="url(#rain-drop)"
        d="M16 2C11 10 6 14 6 20a10 10 0 1 0 20 0c0-6-5-10-10-18zm2 22l-4-4 2.5-2.5L18 19l4-4 2 2-6 7z"
      />
    </svg>
  );
}
