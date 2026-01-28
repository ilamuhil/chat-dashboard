import { redirect } from "next/navigation"
import { resolveCurrentOrganizationId } from "@/lib/current-organization"
import BotInteractionsClient from "./BotInteractionsClient"
import { requireAuthUserId } from "@/lib/auth-server"
import { prisma } from "@/lib/prisma"
import type { Bot } from "./action"

export default async function BotInteractionsPage() {
  const userId = await requireAuthUserId()
  const organizationId = await resolveCurrentOrganizationId({ userId })

  if (!organizationId) {
    redirect('/auth/login')
  }

  const botsRaw = await prisma.bots.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
  })

  const bots: Bot[] = botsRaw.map((b) => ({
    id: b.id,
    organization_id: b.organizationId ?? organizationId,
    name: b.name,
    tone: b.tone ?? null,
    role: b.role ?? null,
    business_description: b.businessDescription ?? null,
    first_message: b.firstMessage ?? null,
    confirmation_message: b.confirmationMessage ?? null,
    lead_capture_message: b.leadCaptureMessage ?? null,
    capture_leads: b.captureLeads,
    lead_capture_timing: (b.leadCaptureTiming ?? null) as Bot["lead_capture_timing"],
    capture_name: Boolean(b.captureName),
    capture_email: Boolean(b.captureEmail),
    capture_phone: Boolean(b.capturePhone),
    created_at: b.createdAt.toISOString(),
    updated_at: b.updatedAt.toISOString(),
  }))
  
  return (
    <main className='max-h-dvh overflow-y-auto no-scrollbar space-y-4'>
      <header>
        <h1 className='dashboard-title'>Interactions</h1>
      </header>
      <BotInteractionsClient bots={bots || []} />
    </main>
  )
}
