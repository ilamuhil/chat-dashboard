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
  const plans = [
    {
      name: 'Free',
      price: '₹0',
      features: ['1 Project', '1GB Storage', 'Community Support'],
      buttonText: 'Current Plan',
      buttonVariant: 'default' as const,
      isCurrent: false,
    },
    {
      name: 'Basic',
      price: '₹499',
      features: ['5 Projects', '10GB Storage', 'Basic Support'],
      buttonText: 'Current Plan',
      buttonVariant: 'default' as const,
      isCurrent: true,
    },
    {
      name: 'Pro',
      price: '₹999',
      features: [
        'Unlimited Projects',
        '50GB Storage',
        'Priority Support',
        'Advanced Analytics',
      ],
      buttonText: 'Upgrade Plan',
      buttonVariant: 'default' as const,
      isCurrent: false,
    },
    {
      name: 'Enterprise',
      price: '₹1999',
      features: [
        'Unlimited Projects',
        'Unlimited Storage',
        '24/7 Dedicated Support',
        'Custom Integrations',
      ],
      buttonText: 'Upgrade Plan',
      buttonVariant: 'default' as const,
      isCurrent: false,
    },
  ]

  return (
    <main className='space-y-6'>
      <header>
        <h1 className='dashboard-title'>Subscription Details</h1>
      </header>
      <section className='space-y-4'>
        <h2 className='text-2xl font-bold text-center uppercase my-4'>Choose your plan</h2>
        <div className='flex flex-wrap justify-center gap-4 max-w-7xl mx-auto mt-12'>
          {plans.map(plan => (
            <Card
              key={plan.name}
              className='flex flex-col rounded-lg shadow-xs border w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(25%-0.75rem)] max-w-sm bg-sidebar'>
              <CardHeader className='text-center pb-2'>
                <CardTitle className='text-xl font-bold'>{plan.name}</CardTitle>
                <div className='text-3xl font-bold mt-2'>{plan.price}</div>
              </CardHeader>
              <CardContent className='flex-1 space-y-3'>
                <ul className='space-y-2'>
                  {plan.features.map((feature, index) => (
                    <li key={index} className='flex items-center gap-2'>
                      <Check className='size-4 text-green-600 shrink-0' />
                      <span className='text-sm'>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  variant={plan.isCurrent ? 'default' : 'outline'}
                  className={`w-full ${
                    plan.isCurrent ? 'bg-green-600 hover:bg-green-700' : ''
                  }`}>
                  {plan.buttonText}
                </Button>
              </CardFooter>
            </Card>
          ))}
          <aside className='rounded bg-[#dbeafe] p-3 mr-auto min-w-sm mt-4'>
            <div className='p-2 bg-sky-100 rounded ring-1 ring-white'>
              <h5 className='font-semibold'>Current Plan</h5>
              <p className='text-sky-600 text-xs'>
                You are currently on the
                <Badge className='text-white text-xs mx-1 rounded bg-amber-500'>
                  Basic
                </Badge>{' '}
                plan.
              </p>
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
