"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DashboardPageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type ProjectRow = {
  _id: string;
  name: string;
  status: "lead" | "in_progress" | "completed" | "on_hold";
  priority: "low" | "medium" | "high";
  budget?: number;
  createdAt: string;
};

export function AdminProjectsClient({ initialClientId = "" }: { initialClientId?: string }) {
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const limit = 10;

  async function loadProjects(nextPage = page, nextQuery = query) {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({
        page: String(nextPage),
        limit: String(limit),
        q: nextQuery,
      });
      if (initialClientId) qs.set("clientId", initialClientId);
      const response = await fetch(`/api/admin/projects?${qs.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        items?: ProjectRow[];
        total?: number;
        message?: string;
      };
      if (!response.ok) throw new Error(payload.message ?? "Failed to load projects");
      setItems(payload.items ?? []);
      setTotal(payload.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProjects(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialClientId]);

  return (
    <div className="animate-[fade-in_0.4s_ease-out_both]">
      <DashboardPageHeader
        title="Projects"
        description={
          initialClientId
            ? "Filtered by selected client. Open View to manage full project details."
            : "Open View to manage project details, edit, and delete safely."
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Project List ({total})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-3 flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects by name"
            />
            <Button
              variant="outline"
              onClick={() => {
                setPage(1);
                loadProjects(1, query);
              }}
            >
              Search
            </Button>
          </div>
          {error ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left text-sm">
                <thead className="text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Priority</th>
                    <th className="py-2 pr-3">Budget</th>
                    <th className="py-2 pr-3">Created At</th>
                    <th className="py-2 pr-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((project) => (
                    <tr key={project._id} className="border-t border-border/70">
                      <td className="py-2 pr-3">
                        {project.name}
                      </td>
                      <td className="py-2 pr-3">
                        {project.status}
                      </td>
                      <td className="py-2 pr-3">
                        {project.priority}
                      </td>
                      <td className="py-2 pr-3">
                        {project.budget ?? "-"}
                      </td>
                      <td className="py-2 pr-3">
                        {new Date(project.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2 pr-3">
                        <Link href={`/admin/projects/${project._id}`}>
                          <Button size="sm" variant="outline">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm">
            <Button
              variant="outline"
              disabled={loading || page <= 1}
              onClick={() => {
                const next = Math.max(1, page - 1);
                setPage(next);
                loadProjects(next, query);
              }}
            >
              Previous
            </Button>
            <span className="text-muted-foreground">
              Page {page} of {Math.max(1, Math.ceil(total / limit))}
            </span>
            <Button
              variant="outline"
              disabled={loading || page >= Math.max(1, Math.ceil(total / limit))}
              onClick={() => {
                const next = Math.min(Math.ceil(total / limit), page + 1);
                setPage(next);
                loadProjects(next, query);
              }}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
