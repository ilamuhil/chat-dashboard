import {
  AlertCircle,
  CircleCheck,
  Info,
  TriangleAlert,
  X,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { MessageTone } from './billing-utils'

const messageToneStyles: Record<MessageTone, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-900 dark:border-sky-700/50 dark:bg-sky-950/30 dark:text-sky-200',
  success:
    'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-200',
  warning:
    'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200',
  error:
    'border-red-200 bg-red-50 text-red-800 dark:border-red-700/50 dark:bg-red-950/30 dark:text-red-200',
}

export function MessageBar({
  tone,
  children,
  onClose,
}: {
  tone: MessageTone
  children: ReactNode
  onClose: () => void
}) {
  const Icon =
    tone === 'success'
      ? CircleCheck
      : tone === 'warning'
        ? TriangleAlert
        : tone === 'error'
          ? AlertCircle
          : Info
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${messageToneStyles[tone]}`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">{children}</div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss message"
        className="-m-1 shrink-0 rounded-md p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current dark:hover:bg-white/10"
      >
        <X className="size-4" />
      </button>
    </div>
  )
}

export function Meter({
  label,
  used,
  limit,
  suffix = '',
}: {
  label: string
  used: number
  limit: number
  suffix?: string
}) {
  const percentage = Math.min(100, limit ? (used / limit) * 100 : 100)
  return (
    <div>
      <div className="flex items-center justify-between gap-4 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="tabular-nums">
          {used.toLocaleString('en-IN')} / {limit.toLocaleString('en-IN')}
          {suffix}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={used}
        aria-valuemin={0}
        aria-valuemax={limit}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full ${percentage >= 95 ? 'bg-amber-500' : 'bg-sky-600'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}
