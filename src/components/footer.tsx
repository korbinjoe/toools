import Link from "next/link";
import { Wordmark } from "@/components/logo";

export function Footer() {
  return (
    <footer className="border-t border-border/60 mt-auto">
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Wordmark height={20} className="text-foreground" />
            <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">
              A curated workspace of tools you can try right here, or find the right one for your workflow.
            </p>
          </div>
          <nav className="flex gap-8 text-sm">
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Explore
              </span>
              <Link href="/tools" className="text-muted-foreground hover:text-foreground transition-colors">
                Browse Tools
              </Link>
              <Link href="/categories" className="text-muted-foreground hover:text-foreground transition-colors">
                Categories
              </Link>
            </div>
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Contribute
              </span>
              <Link href="/submit" className="text-muted-foreground hover:text-foreground transition-colors">
                Submit a Tool
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
