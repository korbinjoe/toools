import {
  BarChart3,
  Building,
  GitBranch,
  Megaphone,
  Palette,
  PenTool,
  Sparkles,
  Terminal,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StackPreview } from "@/lib/stacks-data";

type StackIconKey = StackPreview["icon"];

const iconMap: Record<StackIconKey, LucideIcon> = {
  terminal: Terminal,
  "pen-tool": PenTool,
  building: Building,
  "git-branch": GitBranch,
  sparkles: Sparkles,
  megaphone: Megaphone,
  "bar-chart": BarChart3,
  palette: Palette,
  users: Users,
};

const iconStyles: Record<StackIconKey, string> = {
  terminal: "bg-gradient-to-br from-amber-100 to-amber-300 text-amber-800 dark:from-amber-950/60 dark:to-amber-900/40 dark:text-amber-200",
  "pen-tool": "bg-gradient-to-br from-blue-100 to-blue-400 text-blue-800 dark:from-blue-950/60 dark:to-blue-900/40 dark:text-blue-200",
  building: "bg-gradient-to-br from-emerald-100 to-emerald-300 text-emerald-800 dark:from-emerald-950/60 dark:to-emerald-900/40 dark:text-emerald-200",
  "git-branch": "bg-gradient-to-br from-violet-100 to-violet-300 text-violet-800 dark:from-violet-950/60 dark:to-violet-900/40 dark:text-violet-200",
  sparkles: "bg-gradient-to-br from-purple-100 to-purple-300 text-purple-800 dark:from-purple-950/60 dark:to-purple-900/40 dark:text-purple-200",
  megaphone: "bg-gradient-to-br from-orange-100 to-orange-300 text-orange-800 dark:from-orange-950/60 dark:to-orange-900/40 dark:text-orange-200",
  "bar-chart": "bg-gradient-to-br from-cyan-100 to-cyan-300 text-cyan-800 dark:from-cyan-950/60 dark:to-cyan-900/40 dark:text-cyan-200",
  palette: "bg-gradient-to-br from-pink-100 to-pink-300 text-pink-800 dark:from-pink-950/60 dark:to-pink-900/40 dark:text-pink-200",
  users: "bg-gradient-to-br from-indigo-100 to-indigo-300 text-indigo-800 dark:from-indigo-950/60 dark:to-indigo-900/40 dark:text-indigo-200",
};

const sizeStyles = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-11 w-11 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12 rounded-xl", icon: "h-6 w-6" },
};

export function StackIcon({
  icon,
  size = "md",
  className,
}: {
  icon: StackIconKey;
  size?: keyof typeof sizeStyles;
  className?: string;
}) {
  const Icon = iconMap[icon];
  const s = sizeStyles[size];

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        s.box,
        iconStyles[icon],
        className,
      )}
    >
      <Icon className={s.icon} strokeWidth={2} aria-hidden="true" />
    </div>
  );
}
