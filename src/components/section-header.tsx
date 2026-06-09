import Link from "next/link";

export function SectionHeader({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="mb-7 flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-[1.375rem] font-bold tracking-[-0.02em] text-foreground">{title}</h2>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="shrink-0 text-[0.8125rem] font-semibold text-primary transition-colors hover:text-primary/80"
        >
          {linkLabel}
        </Link>
      )}
    </div>
  );
}
