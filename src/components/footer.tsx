import Link from "next/link";
import { Suspense } from "react";
import { Wordmark } from "@/components/logo";
import { GithubStarLink } from "@/components/github-star-link";
import { FooterUpdatedAt } from "@/components/footer-updated-at";
import { GITHUB_REPO_URL } from "@/lib/site";

function FooterUpdatedAtFallback() {
  return <span className="text-muted-foreground/50">Loading update time…</span>;
}

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
            <div className="mt-4">
              <GithubStarLink variant="button" />
            </div>
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
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Open Source
              </span>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                GitHub Repository
              </a>
              <a
                href={GITHUB_REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Star on GitHub
              </a>
            </div>
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-border/40 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Toools</span>
          <Suspense fallback={<FooterUpdatedAtFallback />}>
            <FooterUpdatedAt />
          </Suspense>
        </div>
      </div>
    </footer>
  );
}
