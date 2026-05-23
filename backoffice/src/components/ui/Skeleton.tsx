export default function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`bo-skeleton ${className}`} aria-hidden />;
}
