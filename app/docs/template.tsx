import { RouteTransition } from '@/components/transitions/route-transition'

export default function DocsTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <RouteTransition className='min-w-0 flex-1'>
      {children}
    </RouteTransition>
  )
}
