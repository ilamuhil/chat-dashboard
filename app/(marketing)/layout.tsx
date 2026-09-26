import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='min-h-svh bg-white text-slate-950'>
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  )
}
