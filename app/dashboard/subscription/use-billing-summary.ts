import { useQuery } from '@tanstack/react-query'
import { billingRequest } from './billing-utils'
import type { Summary } from './billing-types'

export function useBillingSummary() {
  return useQuery<Summary>({
    queryKey: ['billing-summary'],
    queryFn: ({ signal }) => billingRequest<Summary>('GET', undefined, signal),
    staleTime: 0,
    refetchOnMount: 'always',
    retry: 1,
  })
}
