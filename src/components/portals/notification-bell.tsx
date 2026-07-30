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
  ChevronRight,
  Sparkles,
  Trash2,
  Plus,
  RefreshCw,
  X,
  Send
} from "lucide-react";
import { cn } from "@/lib/utils/cn";

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

export function NotificationBell() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [userRole, setUserRole] = useState<string>("admin");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "high" | "medium" | "info" | "unread">("all");
  const popoverRef = useRef<HTMLDivElement>(null);

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
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Handle ESC key for modal
  useEffect(() => {
    if (!isModalOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && !submitting) {
        setIsModalOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, submitting]);

  const activeItems = notifications.filter((n) => !n.read);
  const highPriorityItems = notifications.filter((n) => n.severity === "high");
  const mediumPriorityItems = notifications.filter((n) => n.severity === "medium");

  const displayItems = notifications.filter((n) => {
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

  const getIcon = (type: NotificationItem["type"], severity: NotificationItem["severity"]) => {
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
    <>
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
          
          {/* Pulsing Badge if unread items exist */}
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
          <div className="absolute right-0 mt-2.5 w-80 sm:w-[420px] rounded-2xl border border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-muted/20">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
                  <Sparkles className="size-3.5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">Notifications & Alerts</h3>
                  <p className="text-[10px] text-muted-foreground">
                    {activeItems.length} unread • {highPriorityItems.length} urgent
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {userRole === "admin" && (
                  <button
                    onClick={() => {
                      setIsModalOpen(true);
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold shadow-xs hover:bg-primary/90 transition-all"
                    title="Send announcement to users"
                  >
                    <Plus className="size-3.5" />
                    <span>Broadcast</span>
                  </button>
                )}
                <button
                  onClick={fetchNotifications}
                  className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  title="Refresh notifications"
                >
                  <RefreshCw className={cn("size-3.5", loading && "animate-spin")} />
                </button>
                {activeItems.length > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[11px] font-medium text-primary hover:underline flex items-center gap-1 transition-colors pl-1"
                  >
                    <Check className="size-3.5" /> Mark read
                  </button>
                )}
              </div>
            </div>

            {/* Filter Tabs by Priority */}
            <div className="flex items-center gap-1 border-b border-border/40 px-3 py-1.5 bg-muted/10 text-[11px] overflow-x-auto">
              <button
                onClick={() => setFilter("all")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-medium transition-colors shrink-0",
                  filter === "all" ? "bg-muted text-foreground font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("high")}
                className={cn(
                  "px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1 shrink-0",
                  filter === "high" ? "bg-red-500/15 text-red-600 font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="size-1.5 rounded-full bg-red-500" />
                High ({highPriorityItems.length})
              </button>
              <button
                onClick={() => setFilter("medium")}
                className={cn(
                  "px-2 py-1 rounded-md font-medium transition-colors flex items-center gap-1 shrink-0",
                  filter === "medium" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <span className="size-1.5 rounded-full bg-amber-500" />
                Medium ({mediumPriorityItems.length})
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={cn(
                  "px-2 py-1 rounded-md font-medium transition-colors shrink-0",
                  filter === "unread" ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                )}
              >
                Unread ({activeItems.length})
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-[360px] overflow-y-auto divide-y divide-border/40">
              {loading && notifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <div className="size-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  Checking for system alerts...
                </div>
              ) : displayItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
                  <Check className="size-6 text-emerald-500/80 bg-emerald-500/10 rounded-full p-1" />
                  <p className="font-semibold text-foreground">No notifications found</p>
                  <p className="text-[11px]">All caught up or filtered out.</p>
                </div>
              ) : (
                displayItems.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "group relative flex items-start gap-3 p-3.5 text-xs transition-colors hover:bg-muted/40",
                      !item.read && "bg-primary/5 dark:bg-primary/10 font-medium",
                      item.severity === "high" && !item.read && "bg-red-500/5 hover:bg-red-500/10"
                    )}
                  >
                    <div className="mt-0.5 p-2 rounded-xl bg-background border border-border/60 shadow-xs shrink-0">
                      {getIcon(item.type, item.severity)}
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <div className="flex items-center justify-between gap-2 mb-0.5">
                        <p className="font-semibold text-foreground truncate">{item.title}</p>
                        <span className="text-[10px] text-muted-foreground shrink-0 font-medium">
                          {formatRelativeTime(item.timestamp)}
                        </span>
                      </div>
                      <p className="text-muted-foreground text-[11px] leading-relaxed line-clamp-2">
                        {item.description}
                      </p>
                      {item.createdByName && (
                        <p className="text-[10px] text-primary/80 font-medium mt-0.5">
                          Sent by {item.createdByName}
                        </p>
                      )}
                      <div className="mt-2 flex items-center justify-between">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                            item.severity === "high" && "bg-red-500/15 text-red-600 dark:text-red-400",
                            item.severity === "medium" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                            item.severity === "info" && "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          )}
                        >
                          {item.severity === "high" ? "High Priority" : item.severity === "medium" ? "Medium Priority" : "Info"}
                        </span>
                        {item.actionUrl && item.actionUrl !== "#" && (
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
                        )}
                      </div>
                    </div>

                    {/* Per-User Dismiss / Delete Button */}
                    <button
                      onClick={(e) => handleDismiss(item.id, e)}
                      className="absolute top-3 right-3 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 rounded-md hover:bg-red-500/10"
                      title="Remove notification for me"
                    >
                      <Trash2 className="size-3.5" />
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
                View System Audit & Activity Logs →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Broadcast Custom Notification Modal using createPortal onto document.body */}
      {isModalOpen && mounted && createPortal(
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget && !submitting) {
              setIsModalOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 relative z-10">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center size-8 rounded-xl bg-primary/10 text-primary">
                  <Megaphone className="size-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Send Custom Notification</h3>
                  <p className="text-xs text-muted-foreground">Broadcast an alert or notice to team members</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted transition-colors"
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
                  placeholder="e.g., System Maintenance or Team Meeting"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Message Description</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter details for the team members..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Priority Level</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="info">Info 🔵</option>
                    <option value="medium">Action Needed 🟡</option>
                    <option value="high">Urgent / High 🔴</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">Target Audience</label>
                  <select
                    value={newTarget}
                    onChange={(e) => setNewTarget(e.target.value as any)}
                    className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="all">Everyone (All Roles)</option>
                    <option value="admin">Admins Only</option>
                    <option value="employee">Employees Only</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Action Link URL (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g., /admin/quotations or /admin/projects"
                  value={newActionUrl}
                  onChange={(e) => setNewActionUrl(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted/20 px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
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
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold shadow-sm hover:bg-primary/90 transition-all disabled:opacity-50"
                >
                  <Send className="size-3.5" />
                  {submitting ? "Sending..." : "Broadcast Notification"}
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
