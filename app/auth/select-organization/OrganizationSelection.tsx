'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

type Organization = { id: string; name: string }

export default function OrganizationSelection({
  organizations,
  preferredOrganizationId,
}: {
  organizations: Organization[]
  preferredOrganizationId?: string
}) {
  const router = useRouter()
  const initialId = useMemo(
    () =>
      organizations.some(org => org.id === preferredOrganizationId)
        ? preferredOrganizationId!
        : organizations[0].id,
    [organizations, preferredOrganizationId],
  )
  const [organizationId, setOrganizationId] = useState(initialId)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  async function selectOrganization() {
    setIsPending(true)
    setError(null)
    try {
      const response = await fetch('/api/auth/select-organization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organizationId, next: '/dashboard' }),
      })
      const data = (await response.json()) as {
        error?: string
        next?: string
      }
      if (!response.ok) throw new Error(data.error || 'Could not select organization')
      router.replace(data.next || '/dashboard')
      router.refresh()
    } catch (selectionError) {
      setError(
        selectionError instanceof Error
          ? selectionError.message
          : 'Could not select organization',
      )
      setIsPending(false)
    }
  }

  return (
    <main className='flex min-h-svh items-center justify-center bg-slate-50 px-4'>
      <Card className='w-full max-w-md rounded-2xl border-slate-200 shadow-sm'>
        <CardHeader>
          <CardTitle className='text-lg'>Choose an organization</CardTitle>
          <CardDescription>
            Select which organization you want to open.
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='organization'>Organization</Label>
            <Select value={organizationId} onValueChange={setOrganizationId}>
              <SelectTrigger id='organization'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {organizations.map(organization => (
                  <SelectItem key={organization.id} value={organization.id}>
                    {organization.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {error && (
            <p role='alert' className='text-sm text-rose-600'>
              {error}
            </p>
          )}
          <Button
            type='button'
            className='w-full bg-sky-700 hover:bg-sky-800'
            disabled={isPending}
            onClick={() => void selectOrganization()}>
            {isPending ? 'Opening…' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}
