export type WidgetVisibilityMode = 'all' | 'include' | 'exclude'
export type WidgetVisibility = {
  widgetVisibilityMode: WidgetVisibilityMode
  widgetVisibilityRoutes: string[]
}

export function normalizeRoutePattern(input: string): string {
  const route = input.trim()
  if (
    !route.startsWith('/') ||
    route.startsWith('//') ||
    route.length > 512 ||
    /[?#\\\s]/.test(route) ||
    route.includes('//') ||
    route.split('/').some((part) => part === '.' || part === '..') ||
    (route.includes('*') &&
      (!route.endsWith('/*') || route.indexOf('*') !== route.length - 1))
  )
    throw new Error(
      'Use a path such as /pricing or /products/*, without a domain, query, or fragment.',
    )
  return route === '/' ? route : route.replace(/\/+$/, '')
}

export function parseVisibilityRoutes(input: string): string[] {
  const routes = input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (routes.length > 50) throw new Error('Use at most 50 routes.')
  return [...new Set(routes.map(normalizeRoutePattern))]
}

export function isWidgetVisible(
  pathname: string,
  visibility: WidgetVisibility,
): boolean {
  const { widgetVisibilityMode: mode, widgetVisibilityRoutes: routes } =
    visibility
  if (mode === 'all') return true
  const path = pathname === '/' ? '/' : pathname.replace(/\/+$/, '')
  const matches = routes.some((route) => {
    if (route.endsWith('/*')) {
      const base = route.slice(0, -2)
      return path === base || path.startsWith(`${base}/`)
    }
    return path === route
  })
  return mode === 'include' ? matches : !matches
}
