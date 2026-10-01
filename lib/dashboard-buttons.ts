/** Primary dashboard action. Slate-to-sky in light mode, a brighter sky gradient in dark mode. */
export const dashboardButtonClass =
  'bg-linear-to-r from-slate-800 to-sky-800 text-white shadow-sm hover:from-slate-900 hover:to-sky-900 dark:from-sky-600 dark:to-sky-800 dark:text-white dark:hover:from-sky-500 dark:hover:to-sky-700 disabled:from-slate-300 disabled:to-slate-400 dark:disabled:from-slate-700 dark:disabled:to-slate-700'

/** Secondary dashboard action. */
export const dashboardOutlineButtonClass =
  'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-sky-400/40 dark:hover:bg-sky-500/15 dark:hover:text-sky-100'

/** Destructive dashboard action. */
export const dashboardDangerButtonClass =
  'border-rose-200 bg-white text-rose-600 shadow-sm hover:bg-rose-50 hover:text-rose-700 dark:border-rose-400/35 dark:bg-slate-900 dark:text-rose-300 dark:hover:bg-rose-500/15 dark:hover:text-rose-200'
