export default function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="text-center py-12 px-4">
      <p className="font-bold text-lg">{title}</p>
      {description ? <p className="text-sm text-[var(--bo-muted)] mt-2">{description}</p> : null}
    </div>
  );
}
