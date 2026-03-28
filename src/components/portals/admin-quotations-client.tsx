"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronLeft, ChevronRight, FileText, Search } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CreateQuotationForm } from "@/components/portals/create-quotation-form";

type QuotationRow = {
  _id: string;
  quotationNumber: string;
  status: string;
  projectId: string;
  projectName?: string;
  createdAt: string;
};

export function AdminQuotationsClient({
  initialProjectId = "",
  defaultCreateExpanded = false,
}: {
  initialProjectId?: string;
  defaultCreateExpanded?: boolean;
}) {
  const [items, setItems] = useState<QuotationRow[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 10;

  async function load(nextPage = page, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(nextPage),
        limit: String(limit),
        q: nextQuery,
      });
      if (initialProjectId) qs.set("projectId", initialProjectId);
      const response = await fetch(`/api/admin/quotations?${qs.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        items?: QuotationRow[];
        total?: number;
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message ?? "Failed to load quotations");
      setItems(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load quotations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialProjectId]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="animate-fade-in">
      {initialProjectId ? (
        <Link
          href={`/admin/projects/${initialProjectId}`}
          className="group mb-6 inline-flex items-center gap-2 rounded-lg text-[0.8125rem] font-medium text-muted-foreground transition-[color,background-color] duration-200 hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <ArrowLeft
            className="size-4 transition-transform duration-200 group-hover:-translate-x-0.5"
            aria-hidden
          />
          Back to project
        </Link>
      ) : null}

      <DashboardPageHeader
        title="Quotations"
        description={
          initialProjectId
            ? "Filtered by project. Open a row to view full details, or create a new quotation below."
            : "Browse all quotations, then use Create quotation to open the editor with live preview."
        }
      />

      <Card className="mb-6 border-border/70 bg-card/90 shadow-(--shadow-premium) backdrop-blur-[2px] transition-[box-shadow,border-color] duration-200 hover:border-primary/12">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted/80 text-foreground/80 ring-1 ring-border/50 dark:bg-muted/45">
                <FileText className="size-5" strokeWidth={1.75} aria-hidden />
              </span>
              <div>
                <CardTitle className="flex flex-wrap items-center gap-2 text-lg font-semibold tracking-tight sm:text-xl">
                  Quotation list
                  <span className="inline-flex items-center rounded-full bg-primary/12 px-2.5 py-0.5 text-xs font-semibold tabular-nums text-primary ring-1 ring-primary/20">
                    {total}
                  </span>
                </CardTitle>
                <CardDescription className="mt-1 text-[0.8125rem]">
                  {initialProjectId
                    ? "Filtered list — scroll horizontally on small screens."
                    : "Search by quotation number and paginate."}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by quotation number"
              className="h-10 flex-1 sm:min-w-60"
            />
            <Button
              variant="outline"
              className="h-10 shrink-0 gap-2"
              onClick={() => {
                setPage(1);
                load(1, query);
              }}
            >
              <Search className="size-4 opacity-70" aria-hidden />
              Search
            </Button>
          </div>

          {error ? (
            <div
              className="rounded-2xl border border-destructive/35 bg-destructive/6 p-4 text-[0.8125rem] leading-relaxed text-destructive shadow-sm dark:bg-destructive/10"
              role="alert"
            >
              {error}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border/60 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-left text-[0.8125rem]">
                  <thead>
                    <tr className="border-b border-border/60 bg-muted/45 dark:bg-muted/25">
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Quotation #
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Project
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Created
                      </th>
                      <th className="whitespace-nowrap px-4 py-3.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                          No quotations yet{initialProjectId ? " for this project" : ""}. Use Create
                          quotation below to add one.
                        </td>
                      </tr>
                    ) : (
                      items.map((row) => (
                        <tr
                          key={row._id}
                          className="bg-card/40 transition-[background-color] duration-150 hover:bg-muted/35 dark:hover:bg-muted/20"
                        >
                          <td className="px-4 py-3 align-middle font-medium text-foreground">
                            {row.quotationNumber}
                          </td>
                          <td className="px-4 py-3 align-middle text-muted-foreground">{row.status}</td>
                          <td className="px-4 py-3 align-middle text-muted-foreground">
                            {row.projectName ?? row.projectId}
                          </td>
                          <td className="px-4 py-3 align-middle text-muted-foreground">
                            {new Date(row.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 align-middle">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/admin/quotations/${row._id}`}>View</Link>
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-xl border border-border/50 bg-muted/25 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-muted/15">
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page <= 1}
              className="gap-1.5"
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                load(next, query);
              }}
            >
              <ChevronLeft className="size-4" aria-hidden />
              Previous
            </Button>
            <div className="flex items-center justify-center gap-2 text-[0.8125rem] text-muted-foreground">
              {loading ? (
                <span className="inline-flex size-2 animate-pulse rounded-full bg-primary/60" aria-hidden />
              ) : null}
              <span className="tabular-nums font-medium">
                Page {page} of {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={loading || page >= totalPages}
              className="gap-1.5"
              onClick={() => {
                const next = Math.min(totalPages, page + 1);
                setPage(next);
                load(next, query);
              }}
            >
              Next
              <ChevronRight className="size-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>

      <CreateQuotationForm
        prefillProjectId={initialProjectId}
        defaultCollapsed={!defaultCreateExpanded}
      />
    </div>
  );
}
