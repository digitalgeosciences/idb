import { Card } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: ReactNode;
  icon: LucideIcon;
  onClick?: () => void;
  subtitle?: ReactNode;
  subtitleClassName?: string;
}

export const StatCard = ({
  title,
  value,
  icon: Icon,
  onClick,
  subtitle,
  subtitleClassName,
}: StatCardProps) => {
  return (
    <Card
      className={`p-4 transition-all hover:shadow-lg border-border/50 ${
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
        {subtitle && (
          <div
            className={`ml-3 text-right text-[11px] sm:text-xs leading-snug ${
              subtitleClassName ? subtitleClassName : "text-muted-foreground"
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>


    </Card>
  );
};
