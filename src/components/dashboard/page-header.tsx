import type { ReactNode } from "react";

export function DashboardPageHeader({
  title,
  description,
}: {
  title: string;
  description?: ReactNode;
}) {
  return (
    <header className="mb-8 md:mb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h1>
      {description != null && description !== "" ? (
        <div className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">
          {description}
        </div>
      ) : null}
    </header>
  );
}
