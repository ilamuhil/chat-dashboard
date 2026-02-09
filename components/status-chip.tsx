"use client";

import React from "react";
import { cn } from "@/lib/utils";

export type StatusChipStatus =
  | "pending"
  | "created"
  | "upload_failed"
  | "uploaded"
  | "queued"
  | "queued_for_training"
  | "processing"
  | "processed"
  | "processing_failed"
  | "training"
  | "trained"
  | "training_failed"
  | "completed"
  | "partially_completed"
  | "cleanup_completed"
  | "failed"
  | "unknown";

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
  upload_failed: {
    label: "upload failed",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
  uploaded: {
    label: "uploaded",
    className: "bg-sky-50 text-sky-700 ring-sky-200",
    dotClassName: "bg-sky-400",
  },
  queued: {
    label: "queued",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    dotClassName: "bg-indigo-400",
  },
  queued_for_training: {
    label: "queued",
    className: "bg-indigo-50 text-indigo-700 ring-indigo-200",
    dotClassName: "bg-indigo-400",
  },
  processing: {
    label: "processing",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dotClassName: "bg-amber-400",
  },
  processed: {
    label: "processed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  processing_failed: {
    label: "processing failed",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
  training: {
    label: "training",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
    dotClassName: "bg-amber-400",
  },
  trained: {
    label: "trained",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  training_failed: {
    label: "training failed",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
  completed: {
    label: "completed",
    className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  },
  partially_completed: {
    label: "partially completed",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  cleanup_completed: {
    label: "cleanup completed",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
  failed: {
    label: "failed",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  },
  unknown: {
    label: "unknown",
    className: "bg-slate-100 text-slate-700 ring-slate-200",
  },
};

export function StatusChip({
  status,
  className,
  label,
}: {
  status: StatusChipStatus | string | null | undefined;
  className?: string;
  label?: string;
}) {
  const normalized =
    (status && status in STATUS_STYLES ? (status as StatusChipStatus) : "unknown") satisfies StatusChipStatus;
  const style = STATUS_STYLES[normalized];
  const effectiveLabel = label ?? style.label ?? (status ? String(status) : "unknown");

  return (
    <span
      aria-label={`status: ${effectiveLabel}`}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-none px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        style.className,
        className
      )}
    >
      {(normalized === "processing" ||
        normalized === "queued" ||
        normalized === "queued_for_training" ||
        normalized === "training") && (
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

