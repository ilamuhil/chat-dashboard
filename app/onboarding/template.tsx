import { RouteTransition } from '@/components/transitions/route-transition'

export default function OnboardingTemplate({
  children,
}: {
  children: React.ReactNode
}) {
  return <RouteTransition>{children}</RouteTransition>
}
