'use client'

import { MoonIcon, SunIcon } from 'lucide-react'
import {
  createContext,
  useContext,
  useLayoutEffect,
  useSyncExternalStore,
} from 'react'

import { dashboardThemeKey } from '@/lib/dashboard-theme'
import { cn } from '@/lib/utils'

export type DashboardTheme = 'light' | 'dark'

type DashboardThemeContextValue = {
  theme: DashboardTheme
  toggleTheme: () => void
}

const DashboardThemeContext =
  createContext<DashboardThemeContextValue | null>(null)

export function readDashboardTheme(userId: string): DashboardTheme {
  try {
    return localStorage.getItem(dashboardThemeKey(userId)) === 'dark'
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}

export function applyDashboardTheme(theme: DashboardTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

const themeChangeEvent = 'dashboard-theme-change'

function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(themeChangeEvent, onStoreChange)
  window.addEventListener('storage', onStoreChange)
  return () => {
    window.removeEventListener(themeChangeEvent, onStoreChange)
    window.removeEventListener('storage', onStoreChange)
  }
}

export function DashboardThemeProvider({
  userId,
  children,
}: {
  userId: string
  children: React.ReactNode
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    () => readDashboardTheme(userId),
    (): DashboardTheme => 'light',
  )

  useLayoutEffect(() => {
    applyDashboardTheme(readDashboardTheme(userId))
    return () => {
      document.documentElement.classList.remove('dark')
    }
  }, [userId])

  function toggleTheme() {
    const next: DashboardTheme = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(dashboardThemeKey(userId), next)
    } catch {
      // Preference still applies for this visit when storage is blocked.
    }
    applyDashboardTheme(next)
    window.dispatchEvent(new Event(themeChangeEvent))
  }

  return (
    <DashboardThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </DashboardThemeContext.Provider>
  )
}

export function useDashboardTheme() {
  const context = useContext(DashboardThemeContext)
  if (!context) {
    throw new Error('useDashboardTheme must be used within DashboardThemeProvider')
  }
  return context
}

export function DashboardThemeToggle() {
  const { theme, toggleTheme } = useDashboardTheme()
  const isDark = theme === 'dark'

  return (
    <button
      type='button'
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-pressed={isDark}
      onClick={toggleTheme}
      className='relative h-9 w-15 cursor-pointer rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800'>
      <SunIcon
        className={cn(
          'absolute top-1/2 left-2 size-3.5 -translate-y-1/2 text-amber-500 transition-opacity duration-200',
          isDark ? 'opacity-35' : 'opacity-0',
        )}
      />
      <MoonIcon
        className={cn(
          'absolute top-1/2 right-2 size-3.5 -translate-y-1/2 text-slate-400 transition-opacity duration-200',
          isDark ? 'opacity-0' : 'opacity-70',
        )}
      />
      <span
        className={cn(
          'absolute top-1 left-1 flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-slate-800 to-sky-800 text-white shadow-sm transition-transform duration-200 ease-out',
          isDark && 'translate-x-6',
        )}>
        <SunIcon
          className={cn(
            'absolute size-3.5 transition-all duration-200',
            isDark ? 'scale-75 opacity-0' : 'scale-100 opacity-100',
          )}
        />
        <MoonIcon
          className={cn(
            'absolute size-3.5 transition-all duration-200',
            isDark ? 'scale-100 opacity-100' : 'scale-75 opacity-0',
          )}
        />
      </span>
    </button>
  )
}
