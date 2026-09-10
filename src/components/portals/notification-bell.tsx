"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { 
  Bell, 
  AlertTriangle, 
  FileText, 
  Receipt, 
  ShoppingBag, 
  DollarSign, 
  FolderKanban,
  UserCheck,
  Megaphone,
  Check, 
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  RefreshCw,
  X,
  Send,
  Filter,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Select } from "@/components/ui/select";

export interface NotificationItem {
  id: string;
  type: "OVERDUE_INVOICE" | "PENDING_QUOTATION" | "OPEN_PO" | "HIGH_EXPENSE" | "LOW_MARGIN_PROJECT" | "NEW_CLIENT" | "ANNOUNCEMENT";
  title: string;
  description: string;
  severity: "high" | "medium" | "info";
  timestamp: string;
  actionUrl: string;
  read: boolean;
  createdByName?: string;
}

type FilterType = "all" | "needs_attention" | "unread" | "high" | "medium" | "info";

export function NotificationBell() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userRole, setUserRole] = useState<string>("admin");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [showPriorityFilter, setShowPriorityFilter] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const priorityFilterRef = useRef<HTMLDivElement>(null);

  // Broadcast Modal State
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newSeverity, setNewSeverity] = useState<"high" | "medium" | "info">("info");
  const [newTarget, setNewTarget] = useState<"all" | "admin" | "employee">("all");
  const [newActionUrl, setNewActionUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.items || []);
        if (data.userRole) setUserRole(data.userRole);
      }
    } catch {
      // Ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Close popover on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        popoverRef.current && 
        !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
      if (
        priorityFilterRef.current &&
        !priorityFilterRef.current.contains(event.target as Node)
      ) {
        setShowPriorityFilter(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key for modal & popover
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isModalOpen && !submitting) {
          setIsModalOpen(false);
        } else if (isOpen) {
          setIsOpen(false);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isOpen, submitting]);

  const activeItems = notifications.filter((n) => !n.read);
  const highPriorityItems = notifications.filter((n) => n.severity === "high");
  const mediumPriorityItems = notifications.filter((n) => n.severity === "medium");
  const urgentCount = highPriorityItems.length;
  const actionRequiredCount = notifications.filter((n) => n.severity === "high" || n.severity === "medium" || !n.read).length;

  const displayItems = notifications.filter((n) => {
    if (filter === "needs_attention") return n.severity === "high" || n.severity === "medium";
    if (filter === "high") return n.severity === "high";
    if (filter === "medium") return n.severity === "medium";
    if (filter === "info") return n.severity === "info";
    if (filter === "unread") return !n.read;
    return true;
  });

  const markReadOnServer = async (notificationId?: string, markAll?: boolean) => {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: markAll ? "markAllRead" : "markRead",
          notificationId,
          markAll,
          notificationIds: markAll ? notifications.map((n) => n.id) : undefined,
        }),
      });
    } catch {
      // Ignore fallback
    }
  };

  const dismissOnServer = async (notificationId: string) => {
    try {
      await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "dismiss",
          notificationId,
        }),
      });
    } catch {
      // Ignore fallback
    }
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    dismissOnServer(id);
  };

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    markReadOnServer(undefined, true);
  };

  const markRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    markReadOnServer(id, false);
  };

  const handleCreateBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/admin/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: newTitle,
          description: newDescription,
          severity: newSeverity,
          target: newTarget,
          actionUrl: newActionUrl,
        }),
      });

      if (res.ok) {
        setNewTitle("");
        setNewDescription("");
        setNewActionUrl("");
        setIsModalOpen(false);
        fetchNotifications();
      }
    } catch {
      // Handle error
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="relative" ref={popoverRef}>
        {/* Bell Trigger Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "relative flex items-center justify-center size-9 rounded-xl border border-border/80 bg-background hover:bg-muted/60 text-muted-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-2xs",
            isOpen && "bg-muted text-foreground border-border shadow-xs"
          )}
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="size-4" />
          
          {/* Subtle Indicator Badge */}
          {activeItems.length > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/40 opacity-75" />
              <span className="relative inline-flex size-3.5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground shadow-2xs">
                {activeItems.length > 9 ? "9+" : activeItems.length}
              </span>
            </span>
          )}
        </button>

        {/* Solid Enterprise Notification Panel */}
        {isOpen && (
          <div className="absolute right-0 mt-2.5 w-[calc(100vw-2rem)] sm:w-[460px] max-w-[460px] rounded-2xl border border-border bg-card text-card-foreground shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/80 px-4 py-3.5 bg-card">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">Notifications</h3>
                <p className="text-[11px] font-medium text-muted-foreground mt-0.5">
                  {urgentCount} urgent · {actionRequiredCount} action required
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {userRole === "admin" && (
                  <button
                    onClick={() => {
                      setIsModalOpen(true);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border/80 bg-muted/40 hover:bg-muted text-foreground text-[11px] font-medium transition-colors"
                    title="Send announcement to users"
                    aria-label="Broadcast notification"
                  >
                    <Megaphone className="size-3 text-primary" />
                    <span>Broadcast</span>
                  </button>
                )}

                <button
                  onClick={fetchNotifications}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
                  title="Refresh notifications"
                  aria-label="Refresh notifications"
                >
                  <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                </button>

                <button
                  onClick={markAllRead}
                  disabled={activeItems.length === 0}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Mark all as read"
                  aria-label="Mark all as read"
                >
                  <CheckCheck className="size-3.5" />
                </button>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-1.5 bg-muted/20 text-xs">
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setFilter("all")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0",
                    filter === "all" 
                      ? "bg-background text-foreground font-semibold shadow-2xs border border-border/60" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  All ({notifications.length})
                </button>

                <button
                  onClick={() => setFilter("needs_attention")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 shrink-0",
                    filter === "needs_attention" 
                      ? "bg-background text-foreground font-semibold shadow-2xs border border-border/60" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  <span className="size-1.5 rounded-full bg-amber-500" />
                  Needs attention ({highPriorityItems.length + mediumPriorityItems.length})
                </button>

                <button
                  onClick={() => setFilter("unread")}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors shrink-0",
                    filter === "unread" 
                      ? "bg-background text-foreground font-semibold shadow-2xs border border-border/60" 
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  Unread ({activeItems.length})
                </button>
              </div>

              {/* Priority Filter Dropdown */}
              <div className="relative shrink-0" ref={priorityFilterRef}>
                <button
                  onClick={() => setShowPriorityFilter(!showPriorityFilter)}
                  className={cn(
                    "p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1 text-[11px]",
                    (filter === "high" || filter === "medium" || filter === "info") && "text-primary font-semibold"
                  )}
                  title="Filter by severity"
                  aria-label="Filter by severity"
                >
                  <Filter className="size-3" />
                </button>

                {showPriorityFilter && (
                  <div className="absolute right-0 mt-1 w-32 rounded-xl border border-border bg-card p-1 shadow-lg z-50 text-[11px]">
                    <button
                      onClick={() => {
                        setFilter("high");
                        setShowPriorityFilter(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted flex items-center gap-1.5 text-red-600 dark:text-red-400 font-medium"
                    >
                      <span className="size-1.5 rounded-full bg-red-500" />
                      High ({highPriorityItems.length})
                    </button>
                    <button
                      onClick={() => {
                        setFilter("medium");
                        setShowPriorityFilter(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium"
                    >
                      <span className="size-1.5 rounded-full bg-amber-500" />
                      Medium ({mediumPriorityItems.length})
                    </button>
                    <button
                      onClick={() => {
                        setFilter("info");
                        setShowPriorityFilter(false);
                      }}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-muted flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium"
                    >
                      <span className="size-1.5 rounded-full bg-blue-500" />
                      Info ({notifications.filter((n) => n.severity === "info").length})
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notification List Body */}
            <div className="max-h-[380px] overflow-y-auto divide-y divide-border/50">
              {loading && notifications.length === 0 ? (
                <NotificationSkeleton />
              ) : displayItems.length === 0 ? (
                <EmptyNotificationState />
              ) : (
                displayItems.map((item) => (
                  <NotificationItemCard
                    key={item.id}
                    item={item}
                    onMarkRead={markRead}
                    onDismiss={handleDismiss}
                    onClosePopover={() => setIsOpen(false)}
                  />
                ))
              )}
            </div>

            {/* Footer */}
            <div className="border-t border-border/80 bg-muted/10 p-2.5 text-center">
              <Link
                href="/admin/activity"
                onClick={() => setIsOpen(false)}
                className="text-xs font-semibold text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
              >
                View all activity →
              </Link>
            </div>

          </div>
        )}
      </div>

      {/* Broadcast Custom Notification Modal */}
      {isModalOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150 relative z-10 text-card-foreground">
            
            <div className="flex items-center justify-between border-b border-border/60 pb-3.5">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10 text-primary border border-primary/20">
                  <Megaphone className="size-4.5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">Send System Announcement</h3>
                  <p className="text-xs text-muted-foreground">Broadcast an alert or notice across the organization</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateBroadcast} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Notification Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled System Maintenance or Q3 Financial Audit"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Message Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Provide comprehensive instructions or details for team members..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Priority Level</label>
                  <Select
                    value={newSeverity}
                    onValueChange={(val) => setNewSeverity(val as any)}
                    options={[
                      { value: "info", label: "Info (Blue)" },
                      { value: "medium", label: "Action Needed (Amber)" },
                      { value: "high", label: "Urgent / High (Red)" },
                    ]}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target Audience</label>
                  <Select
                    value={newTarget}
                    onValueChange={(val) => setNewTarget(val as any)}
                    options={[
                      { value: "all", label: "Everyone (All Roles)" },
                      { value: "admin", label: "Admins Only" },
                      { value: "employee", label: "Employees Only" },
                    ]}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Action Link URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. /admin/projects or /admin/quotations"
                  value={newActionUrl}
                  onChange={(e) => setNewActionUrl(e.target.value)}
                  className="w-full rounded-xl border border-border/80 bg-background px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border/60">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-semibold shadow-xs hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  <Send className="size-3.5" />
                  <span>{submitting ? "Sending..." : "Send announcement"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

{/* Helper Sub-components */}

function NotificationItemCard({
  item,
  onMarkRead,
  onDismiss,
  onClosePopover,
}: {
  item: NotificationItem;
  onMarkRead: (id: string) => void;
  onDismiss: (id: string, e: React.MouseEvent) => void;
  onClosePopover: () => void;
}) {
  const category = getCategoryLabel(item.type);
  const actionLabel = getActionLabel(item.type, item.actionUrl);
  const relativeTime = formatRelativeTime(item.timestamp);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 p-3.5 border-l-2 transition-all hover:bg-muted/40",
        getPriorityLeftBorder(item.severity),
        !item.read ? "bg-muted/20" : "bg-card/30 opacity-90 hover:opacity-100"
      )}
    >
      {/* Icon Container */}
      <div className="p-2 rounded-lg bg-background border border-border/60 shadow-2xs shrink-0 text-muted-foreground mt-0.5">
        {getNotificationIcon(item.type, item.severity)}
      </div>

      {/* Item Body */}
      <div className="flex-1 min-w-0 pr-6">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground/80 uppercase font-mono">
            {category}
          </span>
          <span className="text-[10px] text-muted-foreground font-mono shrink-0">
            {relativeTime}
          </span>
        </div>

        <div className="flex items-center gap-1.5 mt-0.5">
          {!item.read && (
            <span className="size-1.5 rounded-full bg-primary shrink-0" title="Unread" />
          )}
          <h4 className={cn("text-xs text-foreground truncate", !item.read ? "font-bold" : "font-medium")}>
            {item.title}
          </h4>
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed mt-1 line-clamp-2">
          {item.description}
        </p>

        {item.createdByName && (
          <p className="text-[10px] text-primary/80 font-medium mt-1">
            Sent by {item.createdByName}
          </p>
        )}

        <div className="mt-2.5 flex items-center justify-between gap-2">
          <PriorityBadge severity={item.severity} />

          {actionLabel && item.actionUrl && item.actionUrl !== "#" && (
            <Link
              href={item.actionUrl}
              onClick={() => {
                onMarkRead(item.id);
                onClosePopover();
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline transition-all"
            >
              {actionLabel}
            </Link>
          )}
        </div>
      </div>

      {/* Dismiss Button on Hover */}
      <button
        onClick={(e) => onDismiss(item.id, e)}
        className="absolute top-3 right-3 text-muted-foreground/60 hover:text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10"
        title="Dismiss notification"
        aria-label="Dismiss notification"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}

function PriorityBadge({ severity }: { severity: NotificationItem["severity"] }) {
  switch (severity) {
    case "high":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-600 dark:text-red-400 text-[9px] font-bold uppercase tracking-wider border border-red-500/20">
          <span className="size-1.5 rounded-full bg-red-500" />
          HIGH
        </span>
      );
    case "medium":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[9px] font-bold uppercase tracking-wider border border-amber-500/20">
          <span className="size-1.5 rounded-full bg-amber-500" />
          MEDIUM
        </span>
      );
    case "info":
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[9px] font-bold uppercase tracking-wider border border-blue-500/20">
          <span className="size-1.5 rounded-full bg-blue-500" />
          INFO
        </span>
      );
  }
}

function NotificationSkeleton() {
  return (
    <div className="p-4 space-y-3.5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-3 animate-pulse">
          <div className="size-8 rounded-lg bg-muted/60 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-2.5 bg-muted/60 rounded w-16" />
              <div className="h-2.5 bg-muted/40 rounded w-12" />
            </div>
            <div className="h-3.5 bg-muted/70 rounded w-3/4" />
            <div className="h-3 bg-muted/40 rounded w-full" />
            <div className="flex justify-between items-center pt-1">
              <div className="h-3 bg-muted/50 rounded w-14" />
              <div className="h-3 bg-muted/50 rounded w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyNotificationState() {
  return (
    <div className="py-12 px-6 text-center flex flex-col items-center justify-center space-y-2">
      <div className="size-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 mb-1">
        <CheckCircle2 className="size-5" />
      </div>
      <h4 className="text-xs font-bold text-foreground">All caught up</h4>
      <p className="text-[11px] text-muted-foreground max-w-xs leading-relaxed">
        There are no notifications requiring your attention.
      </p>
    </div>
  );
}

{/* Helper Utility Functions */}

function getCategoryLabel(type: NotificationItem["type"]) {
  switch (type) {
    case "OVERDUE_INVOICE":
      return "FINANCE";
    case "PENDING_QUOTATION":
      return "SALES";
    case "OPEN_PO":
      return "PROCUREMENT";
    case "HIGH_EXPENSE":
      return "FINANCE";
    case "LOW_MARGIN_PROJECT":
      return "PROJECT";
    case "NEW_CLIENT":
      return "CRM";
    case "ANNOUNCEMENT":
      return "SYSTEM";
    default:
      return "GENERAL";
  }
}

function getActionLabel(type: NotificationItem["type"], actionUrl?: string) {
  if (!actionUrl || actionUrl === "#") return null;
  const url = actionUrl.toLowerCase();
  if (type === "LOW_MARGIN_PROJECT" || url.includes("project")) return "View project →";
  if (type === "OVERDUE_INVOICE" || url.includes("invoice")) return "View invoice →";
  if (type === "PENDING_QUOTATION" || url.includes("quotation")) return "View quotation →";
  if (type === "OPEN_PO" || url.includes("po") || url.includes("purchase")) return "View purchase order →";
  if (type === "HIGH_EXPENSE" || url.includes("expense")) return "View expense →";
  if (type === "NEW_CLIENT" || url.includes("client")) return "View client →";
  return "View details →";
}

function getPriorityLeftBorder(severity: NotificationItem["severity"]) {
  switch (severity) {
    case "high":
      return "border-l-red-500";
    case "medium":
      return "border-l-amber-500";
    case "info":
    default:
      return "border-l-blue-500";
  }
}

function getNotificationIcon(type: NotificationItem["type"], severity: NotificationItem["severity"]) {
  if (type === "ANNOUNCEMENT") return <Megaphone className="size-4 text-sky-500 shrink-0" />;
  if (severity === "high") return <AlertTriangle className="size-4 text-red-500 shrink-0" />;
  switch (type) {
    case "OVERDUE_INVOICE":
      return <Receipt className="size-4 text-red-500 shrink-0" />;
    case "PENDING_QUOTATION":
      return <FileText className="size-4 text-amber-500 shrink-0" />;
    case "OPEN_PO":
      return <ShoppingBag className="size-4 text-emerald-500 shrink-0" />;
    case "LOW_MARGIN_PROJECT":
      return <FolderKanban className="size-4 text-purple-500 shrink-0" />;
    case "NEW_CLIENT":
      return <UserCheck className="size-4 text-blue-500 shrink-0" />;
    default:
      return <DollarSign className="size-4 text-teal-500 shrink-0" />;
  }
}

function formatRelativeTime(isoString: string) {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return "";
    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}
