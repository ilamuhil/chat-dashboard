'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { dashboardButtonClass } from '@/lib/dashboard/dashboard-buttons'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FOLLOW_UP_OUTCOMES,
  FOLLOW_UP_TYPES,
} from '@/lib/organization/lead-options'
import {
  followUpLabel,
  fromWorkspaceInput,
  toWorkspaceInput,
  type CounsellorOption,
  type FollowUpItem,
  type LeadOption,
} from '@/lib/leads/follow-ups'

export function FollowUpDialog({
  item,
  leads,
  members,
  onClose,
}: {
  item: FollowUpItem | null
  leads: LeadOption[]
  members: CounsellorOption[]
  onClose: () => void
}) {
  const router = useRouter()
  const [leadId, setLeadId] = useState(
    item?.leadId || (leads.length === 1 ? leads[0].id : ''),
  )
  const [owner, setOwner] = useState(
    item
      ? item.counsellorId ||
          (item.status === 'requested'
            ? leads.find((lead) => lead.id === item.leadId)
                ?.assignedCounsellorId
            : null) ||
          'none'
      : leads.length === 1
        ? leads[0].assignedCounsellorId || 'none'
        : 'none',
  )
  const [type, setType] = useState(
    item?.followUpType === 'review_elligibility'
      ? 'review_eligibility'
      : item?.followUpType || 'callback',
  )
  const isReview = item?.status === 'requested'
  const [status, setStatus] = useState(
    isReview ? 'pending' : item?.status || 'pending',
  )
  const [lostReason, setLostReason] = useState('')
  const [reviewReason, setReviewReason] = useState('')
  const [notes, setNotes] = useState(item?.notes || '')
  const [outcome, setOutcome] = useState(item?.outcome || 'none')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [refreshing, startTransition] = useTransition()
  const busy = saving || refreshing
  const selectedLead = leads.find((lead) => lead.id === leadId)
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!leadId) return
    const schedule = String(
      new FormData(event.currentTarget).get('scheduledFor') || '',
    )
    setFormError('')
    setSaving(true)
    try {
      const response = await fetch(
        `/api/dashboard/leads/${leadId}/follow-ups${item ? `/${item.id}` : ''}`,
        {
          method: item ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...(item
              ? {
                  expectedUpdatedAt: item.updatedAt,
                  confirm: isReview && status === 'pending',
                  reviewReason: reviewReason.trim() || undefined,
                }
              : {}),
            lostReason: lostReason.trim() || undefined,
            counsellorId: owner === 'none' ? null : owner,
            followUpType: type,
            status,
            scheduledFor: fromWorkspaceInput(schedule),
            outcome: outcome === 'none' ? null : outcome,
            notes: notes.trim() || null,
          }),
        },
      )
      if (!response.ok)
        throw new Error(
          (await response.json()).error || 'Could not save follow-up',
        )
      toast.success(item ? 'Follow-up updated' : 'Follow-up scheduled')
      startTransition(() => {
        router.refresh()
        onClose()
      })
    } catch (error) {
      setFormError(
        error instanceof Error ? error.message : 'Could not save follow-up',
      )
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose()
      }}>
      <DialogContent className='max-h-[90dvh] overflow-y-auto sm:max-w-xl'>
        <DialogHeader>
          <DialogTitle>
            {isReview
              ? 'Review counselling request'
              : item
                ? 'Edit follow-up'
                : 'Add follow-up'}
          </DialogTitle>
          <DialogDescription>
            {isReview
              ? 'Review the request, choose a counsellor and schedule the next step in IST. Confirmation records your team’s decision; contact the visitor separately to agree the appointment.'
              : 'Keep the owner, schedule and outcome up to date. Scheduled times use IST.'}
          </DialogDescription>
        </DialogHeader>
        {isReview && (
          <div className='space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs'>
            <p>
              Contact:{' '}
              {selectedLead?.phone ||
                selectedLead?.email ||
                'Review the lead profile for contact details'}
            </p>
            <p>
              Contact consent:{' '}
              {selectedLead?.consentToContact === true
                ? 'Given'
                : selectedLead?.consentToContact === false
                  ? 'Not given — confirmation is blocked'
                  : 'Verify in the lead profile'}
            </p>
            <p className='text-muted-foreground'>
              Visitor timing is a preference in the notes, not a confirmed slot.
            </p>
          </div>
        )}
        <form onSubmit={save} className='space-y-5'>
          <fieldset disabled={busy} className='grid gap-4 sm:grid-cols-2'>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='task-lead'>Lead</Label>
              <Select
                value={leadId}
                disabled={!!item || leads.length === 1 || busy}
                onValueChange={(id) => {
                  setLeadId(id)
                  setOwner(
                    leads.find((lead) => lead.id === id)
                      ?.assignedCounsellorId || 'none',
                  )
                }}>
                <SelectTrigger id='task-lead' className='w-full'>
                  <SelectValue placeholder='Select a lead' />
                </SelectTrigger>
                <SelectContent>
                  {leads.map((lead) => (
                    <SelectItem key={lead.id} value={lead.id}>
                      {lead.name || 'Unnamed lead'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='task-owner'>Counsellor</Label>
              <Select value={owner} disabled={busy} onValueChange={setOwner}>
                <SelectTrigger id='task-owner' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>Unassigned</SelectItem>
                  {owner !== 'none' &&
                    !members.some((m) => m.userId === owner) && (
                      <SelectItem value={owner}>Former member</SelectItem>
                    )}
                  {members.map((member) => (
                    <SelectItem key={member.userId} value={member.userId}>
                      {member.name || member.email || 'Organization member'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='task-type'>Activity</Label>
              <Select value={type} disabled={busy} onValueChange={setType}>
                <SelectTrigger id='task-type' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FOLLOW_UP_TYPES.filter(
                    (v) => v !== 'review_elligibility',
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {followUpLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='task-schedule'>Schedule · IST</Label>
              <Input
                id='task-schedule'
                type='datetime-local'
                required={isReview && status === 'pending'}
                name='scheduledFor'
                defaultValue={toWorkspaceInput(item?.scheduledFor || null)}
              />
              <p className='text-xs text-muted-foreground'>
                {isReview && status === 'pending'
                  ? 'Choose a future time to confirm this request.'
                  : 'Leave blank to keep it in Unscheduled.'}
              </p>
            </div>
            <div className='space-y-2'>
              <Label htmlFor='task-status'>Status</Label>
              <Select value={status} disabled={busy} onValueChange={setStatus}>
                <SelectTrigger id='task-status' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(isReview
                    ? ['requested', 'pending', 'cancelled']
                    : ['pending', 'complete', 'cancelled']
                  ).map((value) => (
                    <SelectItem key={value} value={value}>
                      {value === 'requested'
                        ? 'Keep in review'
                        : isReview && value === 'pending'
                          ? 'Confirm and schedule'
                          : isReview && value === 'cancelled'
                            ? 'Decline request'
                            : value === 'complete'
                              ? 'Completed'
                              : followUpLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='task-outcome'>Outcome</Label>
              <Select
                value={outcome}
                disabled={busy}
                onValueChange={setOutcome}>
                <SelectTrigger id='task-outcome' className='w-full'>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>No outcome yet</SelectItem>
                  {FOLLOW_UP_OUTCOMES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {followUpLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {status === 'complete' && outcome === 'lost' && (
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='task-lost-reason'>Why was the lead lost?</Label>
                <Textarea
                  id='task-lost-reason'
                  required
                  maxLength={2000}
                  value={lostReason}
                  onChange={(event) => setLostReason(event.target.value)}
                  placeholder='Record the reason for this outcome.'
                />
              </div>
            )}
            {isReview && status === 'cancelled' && (
              <div className='space-y-2 sm:col-span-2'>
                <Label htmlFor='task-review-reason'>
                  Why decline this request?
                </Label>
                <Textarea
                  id='task-review-reason'
                  required
                  maxLength={2000}
                  value={reviewReason}
                  onChange={(event) => setReviewReason(event.target.value)}
                />
              </div>
            )}
            <div className='space-y-2 sm:col-span-2'>
              <Label htmlFor='task-notes'>Notes</Label>
              <Textarea
                id='task-notes'
                rows={3}
                maxLength={10000}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder='What should the counsellor know?'
              />
            </div>
          </fieldset>
          {formError && (
            <p role='alert' className='text-sm text-destructive'>
              {formError}
            </p>
          )}
          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              disabled={busy}
              onClick={onClose}>
              Cancel
            </Button>
            <Button
              type='submit'
              className={dashboardButtonClass}
              disabled={busy || !leadId}>
              {busy && <Loader2 className='size-4 animate-spin' />}
              {busy
                ? 'Saving…'
                : isReview && status === 'pending'
                  ? 'Confirm task'
                  : 'Save follow-up'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
