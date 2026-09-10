"use client";

import React from "react";
import { cn } from "@/lib/utils/cn";

export type StatusVariant = "success" | "warning" | "danger" | "info" | "neutral";

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  size?: "sm" | "md";
  className?: string;
}

function resolveVariant(statusStr: string): StatusVariant {
  const val = statusStr.toUpperCase().replace(/\s+/g, "_");
  
  // SUCCESS
  if (["PAID", "APPROVED", "ACTIVE", "COMPLETED", "PRIMARY"].includes(val)) {
    return "success";
  }
  // WARNING
  if (["PARTIAL", "PENDING", "DRAFT", "IN_PROGRESS", "TECHNICAL", "BILLING"].includes(val)) {
    return "warning";
  }
  // DANGER
  if (["OVERDUE", "DECLINED", "REJECTED", "CANCELLED", "INACTIVE"].includes(val)) {
    return "danger";
  }
  // INFO
  if (["SENT", "PROCESSING", "NEW", "FINANCE", "PROJECT_MANAGER", "APPROVER", "PROCUREMENT"].includes(val)) {
    return "info";
  }
  
  return "neutral";
}

const variantStyles: Record<StatusVariant, string> = {
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  danger: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  info: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  neutral: "bg-muted text-muted-foreground border-border/80",
};

export function StatusBadge({ status, variant, size = "sm", className }: StatusBadgeProps) {
  if (!status) return null;

  const activeVariant = variant ?? resolveVariant(status);
  const formattedLabel = status.replace(/_/g, " ").toUpperCase();

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-mono font-semibold uppercase tracking-wider border rounded-md transition-colors",
        size === "sm" ? "px-2 py-0.5 text-[10px] leading-tight" : "px-2.5 py-1 text-xs leading-normal",
        variantStyles[activeVariant],
        className
      )}
    >
      {formattedLabel}
    </span>
  );
}
