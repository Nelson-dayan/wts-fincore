export function DashboardPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 border-b border-border/40 pb-6 md:mb-10 md:pb-8">
      <div className="mb-3 h-px w-12 rounded-full bg-gradient-to-r from-primary to-primary/30" />
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-[1.75rem] md:leading-tight">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-muted-foreground">
        {description}
      </p>
    </header>
  );
}
