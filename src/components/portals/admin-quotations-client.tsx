"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { QuotationBuilderPanel } from "@/components/quotation/QuotationBuilderPanel";
import { QuotationPdfSavedListCard } from "@/components/quotation/QuotationPdfSavedListCard";

export function AdminQuotationsClient({
  initialProjectId = "",
}: {
  initialProjectId?: string;
}) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#quotation-builder") return;
    window.requestAnimationFrame(() => {
      document.getElementById("quotation-builder")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

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
            ? "Save PDF drafts on this device, then use the builder below."
            : undefined
        }
      />

      <QuotationPdfSavedListCard alwaysShow />

      <section
        id="quotation-builder"
        className="scroll-mt-6 rounded-2xl border border-border/70 bg-card/95 p-5 shadow-(--shadow-premium) backdrop-blur-[2px] sm:p-6"
      >
        <QuotationBuilderPanel variant="embedded" initialSaveProjectId={initialProjectId} />
      </section>
    </div>
  );
}
