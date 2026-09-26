import { RouteTransition } from '@/components/transitions/route-transition'

export default function MarketingTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return <RouteTransition>{children}</RouteTransition>
}
