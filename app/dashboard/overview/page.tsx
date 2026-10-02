import { DashboardPageHeader } from '@/components/dashboard-page-header'
import OverviewClient from './OverviewClient'

export default function OverviewPage() {
  return (
    <DashboardPageHeader
      title='Overview'
      description='A clear view of your bot setup, current activity, and the next useful step for your team.'>
      <OverviewClient />
    </DashboardPageHeader>
  )
}
