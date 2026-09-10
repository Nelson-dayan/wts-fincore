"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle2, User, HelpCircle, Activity } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type { TimelineEvent } from "@/lib/services/orchestration";

interface TimelineCardProps {
  entityType: string;
  entityId: string;
  apiPrefix: string;
}

export function TimelineCard({ entityType, entityId, apiPrefix }: TimelineCardProps) {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (entityId) {
      setLoading(true);
      apiFetch<{ timeline: TimelineEvent[] }>(
        `${apiPrefix}/orchestration/timeline?entityType=${entityType}&entityId=${entityId}`
      )
        .then(res => {
          if (res && res.timeline) {
            setTimeline(res.timeline);
          }
        })
        .catch(err => console.warn("Failed to load entity timeline:", err))
        .finally(() => setLoading(false));
    }
  }, [entityType, entityId, apiPrefix]);

  if (loading) {
    return (
      <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-sm space-y-4 animate-pulse">
        <div className="h-4 bg-muted w-1/3 rounded-lg" />
        <div className="space-y-3">
          <div className="h-3 bg-muted w-3/4 rounded" />
          <div className="h-3 bg-muted w-1/2 rounded" />
        </div>
      </div>
    );
  }

  if (timeline.length === 0) {
    return null; // Don't clutter the UI if there is no history recorded yet
  }

  return (
    <div className="bg-card p-6 rounded-2xl border border-border/80 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b pb-3 mb-2">
        <Clock className="w-4 h-4 text-primary" />
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">Chronological Event Timeline</h4>
      </div>

      <div className="relative border-l border-dashed border-border/80 ml-3.5 pl-5 space-y-5">
        {timeline.map((event, idx) => {
          const isTransition = event.action === "ORCHESTRATED_TRANSITION";
          const formattedDate = new Date(event.timestamp).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });

          return (
            <div key={idx} className="relative group text-xs animate-in fade-in slide-in-from-left-2 duration-300">
              {/* Timeline Marker Dot */}
              <div className="absolute -left-[27px] top-0.5 size-4 rounded-full bg-background border-2 border-primary flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                {isTransition ? (
                  <CheckCircle2 className="w-2.5 h-2.5 text-primary" />
                ) : (
                  <Activity className="w-2 h-2 text-primary" />
                )}
              </div>

              {/* Event Content */}
              <div className="flex flex-col gap-0.5">
                <div className="flex justify-between items-baseline gap-2">
                  <span className="font-bold text-foreground">{event.title}</span>
                  <span className="text-[10px] text-muted-foreground select-none shrink-0">{formattedDate}</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-normal mt-0.5">{event.description}</p>
                {event.transitionId && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="font-mono text-[8px] bg-muted/65 text-muted-foreground px-1.5 py-0.5 rounded tracking-wide border border-border/40 select-all">
                      {event.transitionId}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
