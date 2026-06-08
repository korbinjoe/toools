import { Github, Star } from "lucide-react";
import { GITHUB_REPO_URL } from "@/lib/site";
import { cn } from "@/lib/utils";

type GithubStarLinkProps = React.ComponentPropsWithoutRef<"a"> & {
  variant?: "button" | "ghost" | "text";
  showStarIcon?: boolean;
};

export function GithubStarLink({
  className,
  variant = "button",
  showStarIcon = true,
  ...props
}: GithubStarLinkProps) {
  return (
    <a
      href={GITHUB_REPO_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Star Toools on GitHub"
      className={cn(
        "inline-flex items-center gap-1.5 transition-colors",
        variant === "button" &&
          "rounded-lg border border-border bg-background px-2.5 py-1.5 text-sm font-medium text-foreground hover:bg-muted",
        variant === "ghost" &&
          "rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
        variant === "text" &&
          "text-sm text-muted-foreground hover:text-foreground",
        className,
      )}
      {...props}
    >
      <Github className="h-4 w-4 shrink-0" />
      <span>Star on GitHub</span>
      {showStarIcon && variant === "button" && (
        <Star className="h-3.5 w-3.5 shrink-0 text-amber-500 fill-amber-500" />
      )}
    </a>
  );
}
