export function DashboardPageHeader({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-8 md:mb-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
        {title}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-[15px]">
        {description}
      </p>
    </header>
  );
}
