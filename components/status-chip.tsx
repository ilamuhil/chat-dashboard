"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type StatusChipStatus = "pending" | "created" | "processing" | "completed" | "failed";

const STATUS_STYLES: Record<
  StatusChipStatus,
  { label: string; className: string; dotClassName?: string }
> = {
  pending: {
    label: "pending",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  created: {
    label: "created",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
    dotClassName: "bg-sky-400",
  },
  processing: {
    label: "processing",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dotClassName: "bg-amber-400",
  },
  completed: {
    label: "completed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  failed: {
    label: "failed",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
};

export function StatusChip({
  status,
  className,
  label,
}: {
  status: StatusChipStatus;
  className?: string;
  label?: string;
}) {
  const style = STATUS_STYLES[status];
  const effectiveLabel = label ?? style.label;

  return (
    <span
      aria-label={`status: ${effectiveLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        style.className,
        className
      )}
    >
      {status === "processing" && (
        <span className="relative inline-flex size-1.5">
          <span
            className={cn(
              "absolute inline-flex h-full w-full animate-ping rounded-full opacity-40",
              style.dotClassName
            )}
          />
          <span
            className={cn(
              "relative inline-flex size-1.5 animate-pulse rounded-full",
              style.dotClassName
            )}
          />
        </span>
      )}
      <span className="leading-none">{effectiveLabel}</span>
    </span>
  );
}

