import React, { Suspense } from "react";
import { connection } from "next/server";
import { PublicQuotationClient } from "@/components/portals/public-quotation-client";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function PublicQuotationContent({ params }: PageProps) {
  await connection();
  const { id } = await params;
  return <PublicQuotationClient id={id} />;
}

export default function PublicQuotationPage({ params }: PageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
          <div className="flex items-center space-x-3 bg-card border border-border/80 px-6 py-4 rounded-xl shadow-xs">
            <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-semibold text-muted-foreground">Loading Official Document...</span>
          </div>
        </div>
      }
    >
      <PublicQuotationContent params={params} />
    </Suspense>
  );
}
