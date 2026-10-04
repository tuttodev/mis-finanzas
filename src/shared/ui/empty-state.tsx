type EmptyStateProps = {
  title: string;
  description?: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-center">
      <h3 className="text-base font-semibold">{title}</h3>
      {description && (
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
