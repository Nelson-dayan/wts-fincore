"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type InternalNotesCardProps = {
  projectId: string;
  editing: boolean;
  internalNotes: string;
  onInternalNotesChange: (value: string) => void;
};

export function InternalNotesCard({
  projectId,
  editing,
  internalNotes,
  onInternalNotesChange,
}: InternalNotesCardProps) {
  return (
    <Card className="mb-4 border-dashed">
      <CardHeader>
        <CardTitle className="text-base">Internal (not on client PDF)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p>
          <strong>Project ID:</strong> <span className="font-mono text-xs">{projectId}</span>
        </p>
        {editing ? (
          <div className="space-y-1">
            <Label>Internal notes</Label>
            <textarea
              value={internalNotes}
              onChange={(e) => onInternalNotesChange(e.target.value)}
              rows={4}
              className="flex min-h-25 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            />
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-muted-foreground">{internalNotes || "—"}</p>
        )}
      </CardContent>
    </Card>
  );
}
