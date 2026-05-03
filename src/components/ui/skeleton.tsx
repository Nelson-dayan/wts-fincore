import { cn } from "@/lib/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-muted/65",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.3s_infinite]",
        "before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)] dark:before:bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent)]",
        className
      )}
      aria-hidden
    />
  );
}
