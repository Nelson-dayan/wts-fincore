"use client";

import { useEffect, useState } from "react";
import { History, ShieldCheck, User, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditLogItem {
  _id: string;
  action: string;
  entityType: string;
  message: string;
  createdAt: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

export function ProjectAuditHistoryCard({ projectId }: { projectId: string }) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/activity?projectId=${projectId}&limit=10`);
        if (res.ok) {
          const data = await res.json();
          setLogs(data.items || []);
        }
      } catch (err) {
        console.error("Failed to load project audit history:", err);
      } finally {
        setLoading(false);
      }
    }
    if (projectId) {
      fetchLogs();
    }
  }, [projectId]);

  return (
    <Card className="border-border/70 bg-card shadow-sm overflow-hidden">
      <CardHeader className="border-b border-border/50 bg-muted/20 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            <CardTitle className="text-base font-bold">Project Audit & Security History</CardTitle>
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            <ShieldCheck className="h-3 w-3" /> Immutable Audit Ledger
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted-foreground">
            No audit records logged for this project yet.
          </div>
        ) : (
          <div className="relative space-y-4 before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border/60">
            {logs.map((log) => (
              <div key={log._id} className="relative flex items-start gap-3 pl-8">
                <div className="absolute left-2 top-1.5 h-3 w-3 rounded-full bg-primary ring-4 ring-background" />
                <div className="flex-1 space-y-1 rounded-xl border border-border/50 bg-muted/20 p-3 text-xs">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground capitalize">
                      {log.action.replace(/\./g, " • ")}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                      <Clock className="h-3 w-3" />
                      {new Date(log.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-muted-foreground text-xs">{log.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
