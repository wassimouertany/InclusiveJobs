const tones: Record<string, string> = {
  success: "bo-badge-success",
  warning: "bo-badge-warning",
  danger: "bo-badge-danger",
  neutral: "bo-badge-neutral",
  pending: "bo-badge-warning",
  review: "bo-badge-neutral",
  accepted: "bo-badge-success",
  rejected: "bo-badge-danger",
  open: "bo-badge-success",
  closed: "bo-badge-neutral",
  archived: "bo-badge-neutral",
  draft: "bo-badge-warning",
  active: "bo-badge-success",
  suspended: "bo-badge-danger",
  trial: "bo-badge-warning",
};

export default function Badge({ value, tone }: { value: string; tone?: string }) {
  const cls = tones[tone ?? value] ?? "bo-badge-neutral";
  return <span className={`bo-badge ${cls}`}>{value}</span>;
}
