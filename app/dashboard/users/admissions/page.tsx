import { DashboardPageHeader } from '@/components/dashboard-page-header'
import { parseReportingWindow } from '@/lib/leads/admissions-metrics'
import AdmissionsClient from './AdmissionsClient'
export default function AdmissionsPage() {
  const window = parseReportingWindow()
  return (
    <DashboardPageHeader
      title='Admissions analytics'
      description='Track lead outcomes, inspect pipeline progression, and find enquiries that need better answers.'>
      <AdmissionsClient initialWindow={{ from: window.from, to: window.to }} />
    </DashboardPageHeader>
  )
}
