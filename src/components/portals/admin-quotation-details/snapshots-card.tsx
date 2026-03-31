"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { QuotationPayload } from "./types";

export function SnapshotsCard({ item }: { item: QuotationPayload }) {
  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-base">Snapshots</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
        <p>
          <strong>Client:</strong> {item.clientSnapshot.name} ({item.clientSnapshot.company})
        </p>
        <p>
          <strong>Client address:</strong> {item.clientSnapshot.address || "-"}
        </p>
        <p>
          <strong>Company:</strong> {item.companySnapshot.name}
        </p>
        <p>
          <strong>Company email:</strong> {item.companySnapshot.email || "-"}
        </p>
      </CardContent>
    </Card>
  );
}
