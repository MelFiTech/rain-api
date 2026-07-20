import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const variants: Record<Variant, string> = {
  primary:
    "rounded-full text-white bg-gradient-to-b from-[#f2679e] to-[#d63f7c] ring-1 ring-[#c93a72]/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_2px_10px_-2px_rgba(234,76,137,0.5)] hover:from-[#f47bab] hover:to-[#e04a86] disabled:opacity-60",
  secondary: "rounded-xl bg-hover text-ink hover:bg-active disabled:text-subtle",
  ghost: "rounded-xl bg-transparent text-foreground hover:bg-hover",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading,
      disabled,
      children,
      ...props
    },
    ref,
  ) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium transition-all cursor-pointer disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  ),
);
Button.displayName = "Button";
