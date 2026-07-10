"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Receipt, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectSearchPicker } from "@/components/portals/project-search-picker";
import { usePortalConfig } from "@/components/portals/portal-config-context";

export function AdminExpensesCreateHelper({
  projectId,
  embedded = false,
}: {
  projectId: string;
  embedded?: boolean;
}) {
  const router = useRouter();
  const { pathPrefix } = usePortalConfig();
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || "");

  useEffect(() => {
    if (projectId) {
      setSelectedProjectId(projectId);
    }
  }, [projectId]);

  function goCreate() {
    if (!selectedProjectId) return;
    router.push(`${pathPrefix}/expenses?projectId=${encodeURIComponent(selectedProjectId)}`);
  }

  return (
    <Card className="mb-6 border-primary/25 bg-primary/4 dark:border-primary/35 dark:bg-primary/8">
      <CardHeader className="pb-2">
        <CardTitle className="text-base inline-flex items-center gap-2">
          <Receipt className="size-4 opacity-90" aria-hidden />
          New expense
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" asChild className="gap-2">
            <Link href={`${pathPrefix}/expenses`}>
              <FileText className="size-4" aria-hidden />
              All expenses
            </Link>
          </Button>
          {projectId && !embedded ? (
            <Button size="sm" variant="outline" asChild>
              <Link href={`${pathPrefix}/projects/${encodeURIComponent(projectId)}`}>
                Back to project
                  </Link>
            </Button>
          ) : null}
        </div>

        {!projectId && (
          <div className="space-y-2 max-w-md">
            <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground block">
              Select Project
            </label>
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
              <div className="w-full">
                <ProjectSearchPicker
                  id="exp-project-search"
                  value={selectedProjectId}
                  onChange={(id) => setSelectedProjectId(id)}
                  helperText="Search project or client name to create an expense."
                />
              </div>
              <Button
                type="button"
                className="shrink-0"
                disabled={!selectedProjectId}
                onClick={goCreate}
              >
                Add Expense
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
