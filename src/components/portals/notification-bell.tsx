"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { 
  Bell, 
  AlertTriangle, 
  Clock, 
  FileText, 
  Receipt, 
  ShoppingBag, 
  DollarSign, 
  Check, 
  ChevronRight,
  Sparkles,
  X
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface NotificationItem {
  id: string;
  type: "OVERDUE_INVOICE" | "PENDING_QUOTATION" | "OPEN_PO" | "HIGH_EXPENSE";
  title: string;
  description: string;
  severity: "high" | "medium" | "info";
  timestamp: string;
  actionUrl: string;
  read: boolean;
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<"all" | "attention">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
      }
    } catch {
      // Ignore background fetch errors
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const activeItems = notifications.filter((item) => !readIds.has(item.id));
  const attentionItems = activeItems.filter((item) => item.severity === "high" || item.severity === "medium");
  const displayItems = filter === "attention" ? attentionItems : activeItems;

  const markAllRead = () => {
    const allIds = new Set(notifications.map((n) => n.id));
    setReadIds(allIds);
  };

  const markRead = (id: string) => {
    setReadIds((prev) => new Set([...prev, id]));
  };

  const getIcon = (type: NotificationItem["type"], severity: NotificationItem["severity"]) => {
    if (severity === "high") return <AlertTriangle className="size-4 text-red-500 shrink-0" />;
    if (type === "OVERDUE_INVOICE") return <Receipt className="size-4 text-amber-500 shrink-0" />;
    if (type === "PENDING_QUOTATION") return <FileText className="size-4 text-blue-500 shrink-0" />;
    if (type === "OPEN_PO") return <ShoppingBag className="size-4 text-emerald-500 shrink-0" />;
    return <DollarSign className="size-4 text-purple-500 shrink-0" />;
  };

  const formatRelativeTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      const diffMs = Date.now() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      return `${diffDays}d ago`;
    } catch {
      return "";
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "relative flex items-center justify-center size-9 rounded-xl border border-border/60 bg-muted/30 text-muted-foreground transition-all hover:text-foreground hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          isOpen && "bg-muted text-foreground border-primary/40 shadow-sm"
        )}
        title="Notifications & Alerts"
        aria-label="Notifications"
      >
        <Bell className="size-4 transition-transform group-hover:rotate-12" />
        
        {/* Pulsing Badge if unread high-attention items exist */}
        {activeItems.length > 0 && (
          <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex size-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-extrabold text-white">
              {activeItems.length > 9 ? "9+" : activeItems.length}
            </span>
          </span>
        )}
      </button>

      {/* Notification Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/20">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
                <Sparkles className="size-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Need Attention</h3>
                <p className="text-[10px] text-muted-foreground">
                  {attentionItems.length} priority alert{attentionItems.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
            {activeItems.length > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 transition-colors"
              >
                <Check className="size-3" /> Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 border-b border-border/40 px-3 py-1.5 bg-muted/10 text-[11px]">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors",
                filter === "all" ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({activeItems.length})
            </button>
            <button
              onClick={() => setFilter("attention")}
              className={cn(
                "px-2.5 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5",
                filter === "attention" ? "bg-red-500/10 text-red-600 font-semibold" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="size-1.5 rounded-full bg-red-500" />
              Attention Required ({attentionItems.length})
            </button>
          </div>

          {/* Notifications List */}
          <div className="max-h-[340px] overflow-y-auto divide-y divide-border/40">
            {loading ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                Loading alerts...
              </div>
            ) : displayItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                <Check className="size-6 text-emerald-500/80 bg-emerald-500/10 rounded-full p-1" />
                <p className="font-semibold text-foreground">All caught up!</p>
                <p className="text-[11px]">No pending items require your attention right now.</p>
              </div>
            ) : (
              displayItems.map((item) => (
                <div
                  key={item.id}
                  className={cn(
                    "group relative flex items-start gap-3 p-3.5 text-xs transition-colors hover:bg-muted/40",
                    item.severity === "high" && "bg-red-500/5 hover:bg-red-500/10"
                  )}
                >
                  <div className="mt-0.5 p-2 rounded-xl bg-background border border-border/60 shadow-xs">
                    {getIcon(item.type, item.severity)}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="font-semibold text-foreground truncate">{item.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                      {item.description}
                    </p>
                    <div className="mt-2 flex items-center justify-between">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                          item.severity === "high" && "bg-red-500/15 text-red-600 dark:text-red-400",
                          item.severity === "medium" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                          item.severity === "info" && "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                        )}
                      >
                        {item.severity === "high" ? "High Priority" : item.severity === "medium" ? "Action Needed" : "Info"}
                      </span>
                      <Link
                        href={item.actionUrl}
                        onClick={() => {
                          markRead(item.id);
                          setIsOpen(false);
                        }}
                        className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
                      >
                        View Details <ChevronRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                  <button
                    onClick={() => markRead(item.id)}
                    className="absolute top-3 right-3 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity p-0.5"
                    title="Dismiss"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 bg-muted/30 p-2.5 text-center">
            <Link
              href="/admin/activity"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
            >
              View Full Activity Log & System History →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
