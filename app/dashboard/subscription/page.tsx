import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
export default function SubscriptionPage() {
  type Plan = {
    id: 'free' | 'basic' | 'pro' | 'enterprise'
    name: string
    priceLabel: string
    limits: {
      aiUsage: string
      orgUsers: string
      storage: string
      leads: string
      conversations: string
    }
  }

  // Sample data for now. Later: fetch selected plan + limits from DB.
  const PLANS: Plan[] = [
    {
      id: 'free',
      name: 'Free',
      priceLabel: '₹0 / mo',
      limits: {
        aiUsage: 'Limited AI usage (1,000 AI messages / month)',
        orgUsers: '1 user in org',
        storage: '250 MB storage',
        leads: '50 leads / month',
        conversations: '200 conversations / month',
      },
    },
    {
      id: 'basic',
      name: 'Basic',
      priceLabel: '₹799 / mo',
      limits: {
        aiUsage: '5,000 AI messages / month',
        orgUsers: '3 users in org',
        storage: '5 GB storage',
        leads: '500 leads / month',
        conversations: '1,000 conversations / month',
      },
    },
    {
      id: 'pro',
      name: 'Pro',
      priceLabel: '₹1499 / mo',
      limits: {
        aiUsage: '50,000 AI messages / month',
        orgUsers: '10 users in org',
        storage: '25 GB storage',
        leads: '2,000 leads / month',
        conversations: '5,000 conversations / month',
      },
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      priceLabel: 'Custom',
      limits: {
        aiUsage: 'Unlimited AI messages',
        orgUsers: 'Unlimited users in org',
        storage: 'Custom storage limit (starts at 100 GB)',
        leads: 'Custom lead limits',
        conversations: 'Custom conversation limits',
      },
    },
  ]

  // Sample current plan. Later: read from DB.
  const currentPlanId: Plan['id'] = 'basic'
  const currentPlanIndex = PLANS.findIndex(p => p.id === currentPlanId)
  const currentPlan = PLANS[currentPlanIndex] ?? PLANS[0]

  return (
    <main className='space-y-6'>
      <header>
        <h1 className='dashboard-title'>Subscription Details</h1>
      </header>
      <section className='space-y-4'>
        <h2 className='text-2xl font-bold text-center uppercase my-4'>Choose your plan</h2>
        <div className='flex flex-wrap justify-center gap-4 max-w-7xl mx-auto mt-12'>
          {PLANS.map((plan, index) => {
            const isCurrent = plan.id === currentPlanId
            const isDowngrade = index < currentPlanIndex
            const buttonText = isCurrent
              ? 'Current Plan'
              : isDowngrade
              ? 'Downgrade'
              : 'Upgrade'

            return (
            <Card
              key={plan.id}
              className={`flex flex-col rounded-md shadow-xs border w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] max-w-xs bg-sidebar transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm hover:border-muted-foreground/30 ${
                isCurrent
                  ? 'bg-linear-to-b from-emerald-500/10 to-transparent ring-1 ring-emerald-500/20'
                  : ''
              }`}>
              <CardHeader className='text-center pb-1 px-3 pt-2.5'>
                <CardTitle className='text-sm font-semibold'>{plan.name}</CardTitle>
                <div className='text-xl font-bold mt-1'>{plan.priceLabel}</div>
              </CardHeader>
              <CardContent className='flex-1 space-y-2 px-3'>
                <ul className='space-y-1.5'>
                  {[
                    plan.limits.aiUsage,
                    plan.limits.orgUsers,
                    plan.limits.storage,
                    plan.limits.leads,
                    plan.limits.conversations,
                  ].map((feature, idx) => (
                    <li key={idx} className='flex items-center gap-2'>
                      <Check className='size-3.5 text-green-600 shrink-0' />
                      <span className='text-xs'>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter className='px-3 pt-0'>
                <Button
                  variant={isCurrent ? 'default' : 'outline'}
                  size='sm'
                  className={`w-full text-xs h-8 ${
                    isCurrent ? 'bg-green-600 hover:bg-green-700' : ''
                  }`}>
                  {buttonText}
                </Button>
              </CardFooter>
            </Card>
            )
          })}
          <aside className='rounded bg-[#dbeafe] p-3 mr-auto min-w-sm mt-4'>
            <div className='p-2 bg-sky-100 rounded ring-1 ring-white'>
              <h5 className='font-semibold'>Current Plan</h5>
              <p className='text-sky-600 text-xs'>
                You are currently on the
                <Badge className='text-white text-xs mx-1 rounded bg-amber-500'>
                  {currentPlan.name}
                </Badge>{' '}
                plan.
              </p>
              <ul className='my-2 text-[10px] text-muted-foreground'>
                <li>{currentPlan.limits.aiUsage}</li>
                <li>{currentPlan.limits.orgUsers}</li>
                <li>{currentPlan.limits.storage}</li>
                <li>{currentPlan.limits.leads}</li>
                <li>{currentPlan.limits.conversations}</li>
              </ul>
              <p className='text-xs text-muted-foreground'>
                Your next billing will be in {formatDistanceToNow(new Date('1/1/2026'))} from now.
              </p>
            </div>
            <Button variant='destructive' size='sm' className='mt-2 text-xs'>
              Cancel Subscription
            </Button>
          </aside>
        </div>
      </section>
    </main>
  )
}
