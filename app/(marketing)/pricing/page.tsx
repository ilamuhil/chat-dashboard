import type { Metadata } from 'next'
import Link from 'next/link'
import { Check, ArrowRight, ShieldCheck } from 'lucide-react'
import { PLANS, money } from '@/lib/billing/catalog'
export const metadata: Metadata = {
  title: 'Pricing',
  description:
    'Simple monthly pricing for your institute’s admissions assistant.',
  alternates: { canonical: '/pricing' },
}
export default function PricingPage() {
  return (
    <main id="main-content" className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[.18em] text-sky-700">
          Built for admissions teams
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">
          A helpful assistant.
          <br />A predictable monthly bill.
        </h1>
        <p className="mt-5 text-base leading-7 text-slate-600">
          Answer enquiries, capture leads and keep your counsellors in the
          conversation. Start with a 14-day trial. No card required.
        </p>
      </div>
      <div className="mt-12 grid gap-5 md:grid-cols-3">
        {Object.values(PLANS).map((plan) => (
          <article
            key={plan.id}
            className={`flex flex-col rounded-2xl border p-7 ${plan.id === 'starter' ? 'border-sky-300 bg-sky-50/40 shadow-sm' : 'border-slate-200 bg-white'}`}
          >
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">
              {plan.description}
            </p>
            <div className="mt-5">
              <span className="text-3xl font-semibold tracking-tight">
                {plan.id === 'trial' ? 'Free' : money(plan.pricePaise)}
              </span>
              <span className="ml-1 text-sm text-slate-500">
                {plan.id === 'trial' ? 'for 14 days' : '/ month'}
              </span>
            </div>
            <ul className="my-7 flex-1 space-y-3 text-sm text-slate-600">
              {[
                `${plan.limits.replies.toLocaleString('en-IN')} AI replies ${plan.id === 'trial' ? 'total' : 'per billing cycle'}`,
                `${plan.limits.members} dashboard ${plan.limits.members === 1 ? 'member' : 'members'}`,
                `${plan.limits.bots} ${plan.limits.bots === 1 ? 'bot' : 'bots'} · 1 organization`,
                `${plan.limits.storageBytes / 1_000_000} MB uploaded files`,
                `${plan.limits.sources} training sources`,
                'Lead capture and counsellor handoff',
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <Check
                    className="mt-0.5 size-4 shrink-0 text-sky-700"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href={`/pricing/start?plan=${plan.id}`}
              className="flex items-center justify-center gap-2 rounded-lg bg-sky-700 px-4 py-3 text-sm font-medium text-white hover:bg-sky-800"
            >
              Start {plan.id === 'trial' ? 'free trial' : `with ${plan.name}`}
              <ArrowRight className="size-4" />
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-5 text-center text-xs text-slate-500">
        Monthly billing. Applicable taxes are shown before payment. Each
        organization has its own subscription and allowances.
      </p>
      <section className="mt-16 rounded-2xl border border-slate-200 bg-slate-50 p-7">
        <h2 className="text-xl font-semibold">
          Clear limits, without surprises
        </h2>
        <div className="mt-6 grid gap-7 text-sm leading-6 text-slate-600 sm:grid-cols-2">
          <div>
            <h3 className="font-semibold text-slate-900">
              What counts as an AI reply?
            </h3>
            <p className="mt-2">
              One successful AI answer uses one reply. Internal processing is
              included. Human replies, fixed greetings and errors do not count.
              Test chats use the same allowance.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              What happens when replies run out?
            </h3>
            <p className="mt-2">
              AI answers pause. Visitors can still leave their contact details
              or request a counsellor. We notify your administrators before the
              limit. There are no automatic overage charges.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              How is training limited?
            </h3>
            <p className="mt-2">
              Starter includes 500,000 active training tokens and 1 million
              processed tokens per cycle. Growth includes 2 million active and 4
              million processed. File limits are 10 MB and 25 MB respectively.
              These are separate from AI replies.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">
              Can I change or cancel?
            </h3>
            <p className="mt-2">
              Manage billing inside your dashboard. Plan changes take effect at
              the next paid renewal. Cancel future renewals and keep access
              through your paid period. Included replies do not roll over.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Are leads limited?</h3>
            <p className="mt-2">
              Paid plans have no separate monthly lead-capture cap. Spam
              controls and retention apply. Lead records are retained for 12
              months while subscribed; transcripts for 90 days on Starter and
              180 days on Growth. Export before expiry.
            </p>
          </div>
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-slate-900">
              <ShieldCheck className="size-4" />
              Payments and support
            </h3>
            <p className="mt-2">
              Checkout is handled securely by our payment provider. Starter includes business-hours
              email support; Growth receives priority in the same queue. You can
              review the final total before authorizing payment.
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
