type ErrorStateProps = {
  message: string;
};

export function ErrorState({ message }: ErrorStateProps) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6">
      <h3 className="text-base font-semibold text-destructive">Algo salió mal</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
