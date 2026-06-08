import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CirclePlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Submit a Tool",
  description: "Submit a tool to the Toools directory via GitHub Issues.",
};

const GITHUB_ISSUES_URL = "https://github.com/korbinjoe/toools/issues";
const GITHUB_NEW_ISSUE_URL =
  "https://github.com/korbinjoe/toools/issues/new?template=tool-submission.yml";

const checklist = [
  "Tool name",
  "Website URL",
  "One-line tagline",
  "Short description",
  "Category (e.g. Design, Development)",
  "Pricing (Free, Freemium, Paid, or Open Source)",
];

export default function SubmitPage() {
  return (
    <div className="mx-auto max-w-lg px-6 lg:px-8 py-10 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Submit a Tool</h1>
        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          Know a great tool that belongs in the collection? Open a GitHub Issue
          and we&apos;ll review it for inclusion.
        </p>
      </div>

      <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
            <CirclePlus className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="min-w-0 pt-0.5">
            <h2 className="text-sm font-semibold text-foreground">
              Submit via GitHub Issues
            </h2>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              We track submissions on GitHub so you can follow progress and
              discuss details in the open.
            </p>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-border/60">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-3">
            Please include
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {checklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-muted-foreground"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary/70" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
          <a
            href={GITHUB_NEW_ISSUE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "default", size: "lg" }),
              "cursor-pointer w-full sm:w-auto",
            )}
          >
            Open submission issue
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
          <a
            href={GITHUB_ISSUES_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "cursor-pointer w-full sm:w-auto border-border",
            )}
          >
            Browse issues
            <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
        Don&apos;t have a GitHub account?{" "}
        <Link
          href="https://github.com/join"
          target="_blank"
          rel="noopener noreferrer"
          className="cursor-pointer text-foreground/80 hover:text-foreground underline underline-offset-2"
        >
          Create one for free
        </Link>
        , or email us through an existing issue thread.
      </p>
    </div>
  );
}
