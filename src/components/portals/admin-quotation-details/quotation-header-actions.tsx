"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

type QuotationHeaderActionsProps = {
  quotationId: string;
  projectId: string;
};

export function QuotationHeaderActions({ quotationId, projectId }: QuotationHeaderActionsProps) {
  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Link href="/admin/quotations">
        <Button size="sm" variant="outline">
          Back to quotations
        </Button>
      </Link>
      <Button size="sm" variant="outline" asChild>
        <a href={`/api/admin/quotations/${quotationId}/export?format=pdf`}>Download PDF</a>
      </Button>
      <Button size="sm" variant="outline" asChild>
        <a href={`/api/admin/quotations/${quotationId}/export?format=docx`}>Download Word</a>
      </Button>
      <Link href={`/admin/projects/${projectId}`}>
        <Button size="sm" variant="outline">
          Open project
        </Button>
      </Link>
      <Link href={`/admin/quotations?projectId=${encodeURIComponent(projectId)}`}>
        <Button size="sm" variant="outline">
          All quotations for project
        </Button>
      </Link>
    </div>
  );
}
