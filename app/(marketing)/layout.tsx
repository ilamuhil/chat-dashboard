import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'
import './marketing.css'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='marketing-shell min-h-svh bg-white text-slate-950'>
      <a href='#main-content' className='marketing-skip-link'>Skip to content</a>
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  )
}
