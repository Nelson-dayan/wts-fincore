import Link from "next/link";
import { LayoutDashboard, Sparkles } from "lucide-react";
import { isImageSrc } from "@/lib/utils/is-image-src";

export function PortalBrand({
  variant,
  /** Primary company logo from Admin → Company (data URL or image URL). */
  brandLogoSrc,
}: {
  variant: "admin" | "employee";
  brandLogoSrc?: string | null;
}) {
  const href = variant === "admin" ? "/admin" : "/employee";
  const Icon = variant === "admin" ? LayoutDashboard : Sparkles;
  const title = variant === "admin" ? "Admin" : "Workspace";
  const subtitle = variant === "admin" ? "Command center" : "Your hub";
  const logo = typeof brandLogoSrc === "string" ? brandLogoSrc.trim() : "";
  const showBrandLogo = isImageSrc(logo);

  return (
    <Link
      href={href}
      className="group flex max-w-full items-center gap-3.5 rounded-2xl py-0.5 pr-2 transition-[opacity,transform] duration-200 hover:opacity-[0.97] active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <span
        className={
          showBrandLogo
            ? "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl sm:size-11"
            : "relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-muted/40 text-primary sm:size-11 dark:bg-muted/30"
        }
        aria-hidden
      >
        {showBrandLogo ? (
          // eslint-disable-next-line @next/next/no-img-element -- data URL from company settings
          <img src={logo} alt="" className="size-full object-contain" />
        ) : (
          <Icon className="relative size-4.5 sm:size-[1.15rem]" strokeWidth={1.65} aria-hidden />
        )}
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="font-brand block truncate text-[15px] font-semibold tracking-tight sm:text-base">
          {title}
        </span>
        <span className="mt-0.5 block text-[11px] font-medium tracking-wide text-muted-foreground/90">
          {subtitle}
        </span>
      </span>
    </Link>
  );
}
