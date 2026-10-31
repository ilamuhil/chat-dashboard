'use client'

import { useOrganizationAccess } from '@/components/organization-access'
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CounsellorOption } from '@/lib/leads/follow-ups'

export function OwnerSelect({
  leadId,
  ownerId,
  members,
  leadName = 'lead',
}: {
  leadId: string
  ownerId: string | null
  members: CounsellorOption[]
  leadName?: string
}) {
  const access = useOrganizationAccess()
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [refreshing, startTransition] = useTransition()
  const busy = saving || refreshing
  async function assign(value: string) {
    setSaving(true)
    try {
      const response = await fetch(`/api/dashboard/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedCounsellorId: value === 'unassigned' ? null : value,
        }),
      })
      if (!response.ok)
        throw new Error(
          (await response.json()).error || 'Could not assign lead',
        )
      toast.success(
        value === 'unassigned'
          ? 'Lead returned to unassigned'
          : 'Lead owner updated',
      )
      startTransition(() => router.refresh())
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not assign lead',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <div className='flex min-w-40 items-center gap-2'>
      <Select
        value={ownerId || 'unassigned'}
        onValueChange={assign}
        disabled={busy || !access.can('operate')}>
        <SelectTrigger
          aria-label={`Assigned counsellor for ${leadName}`}
          className='w-full max-w-60 text-xs'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='unassigned'>Unassigned</SelectItem>
          {ownerId && !members.some((member) => member.userId === ownerId) && (
            <SelectItem value={ownerId}>Former member</SelectItem>
          )}
          {members.map((member) => (
            <SelectItem key={member.userId} value={member.userId}>
              {member.name || member.email || 'Organization member'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {busy && (
        <Loader2
          className='size-4 shrink-0 animate-spin text-muted-foreground'
          aria-label='Saving assignment'
        />
      )}
    </div>
  )
}
