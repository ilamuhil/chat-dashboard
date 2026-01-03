import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'current_organization_id'

export function useCurrentOrganizationId() {
  const [organizationId, setOrganizationIdState] = useState<string | null>(() => {
    try {
      return typeof window !== 'undefined'
        ? window.localStorage.getItem(STORAGE_KEY)
        : null
    } catch {
      return null
    }
  })

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setOrganizationIdState(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const setOrganizationId = useCallback((id: string | null) => {
    setOrganizationIdState(id)
    try {
      if (id) {
        window.localStorage.setItem(STORAGE_KEY, id)
        document.cookie = `current_organization_id=${encodeURIComponent(
          id
        )}; Path=/; SameSite=Lax`
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
        document.cookie =
          'current_organization_id=; Path=/; Max-Age=0; SameSite=Lax'
      }
    } catch {
      // ignore
    }
  }, [])

  return { organizationId, setOrganizationId }
}


