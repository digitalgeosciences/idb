import { Card } from "@/components/ui/card";
import { ArrowUpRight, LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  onClick?: () => void;
  actionLabel?: string;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  onClick,
  actionLabel,
}: StatCardProps) => {
  return (
    <Card
      className={`relative p-4 transition-all hover:shadow-lg border-border/50 ${
        onClick ? "cursor-pointer" : ""
      }`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm sm:text-base font-medium text-muted-foreground">
          {title}
        </p>
        <div className="p-1.5 sm:p-2 bg-primary/10 rounded-lg">
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
        </div>
      </div>
      <div className="flex items-start justify-between">
        <p className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
          {value}
        </p>
      </div>
      {actionLabel && (
        <div className="absolute bottom-2 right-3 inline-flex items-center gap-1 text-[11px] sm:text-xs font-semibold text-primary">
          <span className="lowercase">{actionLabel}</span>
          <ArrowUpRight className="h-3 w-3" />
        </div>
      )}
    </Card>
  );
};
