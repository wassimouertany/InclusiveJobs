import type { LucideIcon } from "lucide-react";
import Card from "./Card";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  subtitle?: string;
  tone?: "success" | "neutral" | "warning";
  icon: LucideIcon;
}

export default function StatCard({
  label,
  value,
  delta,
  subtitle,
  tone = "success",
  icon: Icon,
}: StatCardProps) {
  const deltaClass =
    tone === "warning" || tone === "neutral"
      ? "bo-stat-delta--neutral"
      : "bo-stat-delta--up";

  return (
    <Card className="bo-stat-card">
      <div className="bo-stat-card-top">
        <p className="bo-kicker" style={{ marginBottom: 0 }}>
          {label}
        </p>
        <span className="bo-stat-icon" aria-hidden>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="bo-stat-value">{value}</p>
      {subtitle != null ? (
        <p className={`bo-stat-delta ${deltaClass}`}>{subtitle}</p>
      ) : delta != null ? (
        <p className={`bo-stat-delta ${deltaClass}`}>{delta} vs last period</p>
      ) : null}
    </Card>
  );
}
