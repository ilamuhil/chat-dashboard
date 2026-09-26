import { RouteTransition } from '@/components/transitions/route-transition'

export default function DashboardTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RouteTransition className='flex min-h-0 flex-1 flex-col'>
      {children}
    </RouteTransition>
  )
}
