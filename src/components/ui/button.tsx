import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

export function buttonStyles(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return cn(
    "inline-flex items-center justify-center font-medium transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    variant === "primary" && "bg-primary text-primary-foreground hover:bg-[#134d39] shadow-sm",
    variant === "secondary" && "bg-white text-foreground border hover:bg-muted",
    variant === "ghost" && "hover:bg-muted text-foreground",
    variant === "outline" && "border bg-card hover:bg-muted text-foreground",
    size === "sm" && "h-8 px-3 text-[13px] rounded-full",
    size === "md" && "h-10 px-5 text-[14px] rounded-full",
    size === "lg" && "h-12 px-7 text-[15px] rounded-full",
    size === "icon" && "h-10 w-10 rounded-full",
    className
  );
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  ...props
}: ButtonProps) {
  return (
    <button
      className={buttonStyles(variant, size, className)}
      {...props}
    />
  );
}
