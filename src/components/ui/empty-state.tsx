import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function EmptyState({
  icon,
  title,
  desc,
  children,
}: {
  icon: ReactNode;
  title: string;
  desc?: string;
  children?: ReactNode;
}) {
  return (
    <Card className="p-8 text-center rounded-[24px] border-dashed">
      <div className="h-14 w-14 rounded-2xl bg-[var(--primary-soft)] flex items-center justify-center mx-auto text-primary" aria-hidden="true">
        {icon}
      </div>
      <h2 className="font-bold text-lg mt-4">{title}</h2>
      {desc && <p className="text-sm text-muted-foreground mt-1 max-w-[36ch] mx-auto leading-6">{desc}</p>}
      {children && <div className="mt-6 flex justify-center gap-2 flex-wrap">{children}</div>}
    </Card>
  );
}
