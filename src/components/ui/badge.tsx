import { cn } from "@/lib/utils";

export function Badge({
  className,
  variant = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { variant?: "default" | "success" | "warning" | "muted" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold tracking-wide uppercase",
        variant === "default" && "bg-primary-soft text-primary border border-primary/10",
        variant === "success" && "bg-[var(--success-soft)] text-[var(--success)]",
        variant === "warning" && "bg-[var(--warning-soft)] text-[var(--warning)]",
        variant === "muted" && "bg-muted text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}
