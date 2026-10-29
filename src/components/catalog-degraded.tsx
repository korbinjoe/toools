export function CatalogDegraded({ title, message }: { title: string; message: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 lg:px-8 py-10 sm:py-12">
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
