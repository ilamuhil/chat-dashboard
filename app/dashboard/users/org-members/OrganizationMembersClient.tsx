'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, UserPlusIcon, Trash2Icon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import ConfirmationDialog from '@/components/ui/ConfirmationDialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

type Role = 'admin' | 'editor'
type Member = {
  id: string
  role: Role
  createdAt: string
  isSelf: boolean
  user: {
    id: string
    email: string | null
    fullName: string | null
    avatarUrl: string | null
    isActive: boolean
  } | null
}

function getInitials(member: Member) {
  const name = member.user?.fullName?.trim()
  if (name) {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0])
      .join('')
      .toUpperCase()
  }
  return member.user?.email?.[0]?.toUpperCase() || '?'
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as
    | { error?: string }
    | null
  return data?.error || 'Something went wrong. Please try again.'
}

export default function OrganizationMembersClient({
  canManage,
}: {
  canManage: boolean
}) {
  const [members, setMembers] = useState<Member[]>([])
  const [inviteOpen, setInviteOpen] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<Role>('editor')
  const [isLoading, setIsLoading] = useState(true)
  const [isInviting, setIsInviting] = useState(false)
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false)
  const [memberToRemove, setMemberToRemove] = useState<Member | null>(null)
  const [removeConfirmation, setRemoveConfirmation] = useState('')
  const [isRemoving, setIsRemoving] = useState(false)
  const [roleDialogOpen, setRoleDialogOpen] = useState(false)
  const [memberRoleChange, setMemberRoleChange] = useState<{
    member: Member
    role: Role
  } | null>(null)
  const [isUpdatingRole, setIsUpdatingRole] = useState(false)

  const loadMembers = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/dashboard/org-members')
      if (!response.ok) throw new Error(await readError(response))
      const data = (await response.json()) as { members: Member[] }
      setMembers(data.members)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Could not load organization members',
      )
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    // The initial request synchronizes this client component with the API.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadMembers()
  }, [loadMembers])

  async function inviteUser(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsInviting(true)
    try {
      const response = await fetch('/api/dashboard/org-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, email, role }),
      })
      if (!response.ok) throw new Error(await readError(response))
      setFullName('')
      setEmail('')
      await loadMembers()
      toast.success('Invitation sent successfully')
      setInviteOpen(false)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not invite user',
      )
    } finally {
      setIsInviting(false)
    }
  }

  async function updateRole(member: Member, nextRole: Role) {
    setIsUpdatingRole(true)
    try {
      const response = await fetch(`/api/dashboard/org-members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: nextRole }),
      })
      if (!response.ok) throw new Error(await readError(response))
      setMembers(current =>
        current.map(item =>
          item.id === member.id ? { ...item, role: nextRole } : item,
        ),
      )
      toast.success('Member role updated and notification sent')
      return true
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not update role',
      )
      return false
    } finally {
      setIsUpdatingRole(false)
    }
  }

  async function removeMember(member: Member) {
    setIsRemoving(true)
    try {
      const response = await fetch(`/api/dashboard/org-members/${member.id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error(await readError(response))
      setMembers(current => current.filter(item => item.id !== member.id))
      toast.success('Member removed from the organization')
      return true
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not remove member',
      )
      return false
    } finally {
      setIsRemoving(false)
    }
  }

  function requestRemoveMember(member: Member) {
    setMemberToRemove(member)
    setRemoveConfirmation('')
    setRemoveDialogOpen(true)
  }

  function requestRoleChange(member: Member, nextRole: Role) {
    if (member.role === nextRole) return
    setMemberRoleChange({ member, role: nextRole })
    setRoleDialogOpen(true)
  }

  return (
    <section className='dashboard-surface flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl'>
      <header className='flex shrink-0 items-center justify-between gap-3 border-b border-slate-100 px-5 py-4'>
        <div>
          <h1 className='text-base font-semibold tracking-tight text-foreground'>
            Organization members
          </h1>
          <p className='mt-1 text-xs text-muted-foreground'>
            Manage who can access this organization.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <span className='rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600'>
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
          {canManage && (
            <Dialog
              open={inviteOpen}
              onOpenChange={open => {
                if (!isInviting) setInviteOpen(open)
              }}>
              <DialogTrigger asChild>
                <Button type='button' size='sm' className='h-8 bg-sky-700 text-xs hover:bg-sky-800'>
                  <UserPlusIcon className='mr-1.5 size-3.5' />
                  Invite user
                </Button>
              </DialogTrigger>
              <DialogContent className='min-h-[430px] rounded-2xl border-slate-200 bg-white p-7 shadow-2xl sm:max-w-md'>
                <DialogHeader className='border-b border-slate-100 pb-4 pr-6'>
                  <DialogTitle>Invite organization member</DialogTitle>
                  <DialogDescription>
                    Enter the user&apos;s name and email. They will receive a secure sign-in link.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={inviteUser} className='flex flex-1 flex-col space-y-4'>
                  <div className='space-y-1.5'>
                    <Label htmlFor='member-full-name' className='text-xs'>Full name</Label>
                    <Input
                      id='member-full-name'
                      required
                      value={fullName}
                      onChange={event => setFullName(event.target.value)}
                      placeholder='Jane Doe'
                      className='text-sm'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label htmlFor='member-email' className='text-xs'>Email address</Label>
                    <Input
                      id='member-email'
                      type='email'
                      required
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder='jane@example.com'
                      className='text-sm'
                    />
                  </div>
                  <div className='space-y-1.5'>
                    <Label className='text-xs'>Role</Label>
                    <Select value={role} onValueChange={value => setRole(value as Role)}>
                      <SelectTrigger className='text-sm'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value='editor'>Editor</SelectItem>
                        <SelectItem value='admin'>Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className='mt-auto flex justify-end gap-2 border-t border-slate-100 pt-5'>
                    <Button type='button' variant='outline' onClick={() => setInviteOpen(false)}>
                      Cancel
                    </Button>
                    <Button type='submit' disabled={isInviting} className='bg-sky-700 hover:bg-sky-800'>
                      {isInviting && <Loader2 className='mr-2 size-4 animate-spin' />}
                      {isInviting ? 'Sending…' : 'Send invitation'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </header>

      <ConfirmationDialog
        open={removeDialogOpen}
        setOpen={setRemoveDialogOpen}
        title='Remove organization member?'
        description='This will immediately revoke the member’s access to this organization. Their user account will not be deleted.'
        requiredConfirmationText={memberToRemove?.user?.fullName || memberToRemove?.user?.email || 'this user'}
        confirmationValue={removeConfirmation}
        onConfirmationValueChange={setRemoveConfirmation}
        confirmLabel='Proceed'
        confirmClassName='bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500'
        isPending={isRemoving}
        keepOpenUntilComplete
        pendingLabel='Removing…'
        onConfirm={async () => {
          if (!memberToRemove) return
          if (await removeMember(memberToRemove)) {
            setRemoveDialogOpen(false)
            setMemberToRemove(null)
            setRemoveConfirmation('')
          }
        }}
      />
      <ConfirmationDialog
        open={roleDialogOpen}
        setOpen={setRoleDialogOpen}
        title='Update member role?'
        description={`Change ${memberRoleChange?.member.user?.fullName || memberRoleChange?.member.user?.email || 'this member'} to ${memberRoleChange?.role || 'the selected role'}? An email and dashboard notification will be sent.`}
        isPending={isUpdatingRole}
        keepOpenUntilComplete
        pendingLabel='Updating…'
        onConfirm={async () => {
          if (!memberRoleChange) return
          if (await updateRole(memberRoleChange.member, memberRoleChange.role)) {
            setRoleDialogOpen(false)
            setMemberRoleChange(null)
          }
        }}
      />

      <div className='min-h-0 flex-1 overflow-auto px-5 py-4'>
        <div className='overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/40'>
          <Table>
            <TableHeader className='bg-slate-50/80'>
              <TableRow className='hover:bg-transparent'>
                <TableHead className='h-10 px-4 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500'>
                  Member
                </TableHead>
                <TableHead className='h-10 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500'>
                  Access level
                </TableHead>
                <TableHead className='h-10 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500'>
                  Added
                </TableHead>
                {canManage && <TableHead className='w-20' />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 4 : 3}
                    className='py-10 text-center text-xs text-muted-foreground'>
                    Loading members…
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={canManage ? 4 : 3}
                    className='py-10 text-center text-xs text-muted-foreground'>
                    No organization members found.
                  </TableCell>
                </TableRow>
              ) : (
                members.map(member => (
                  <TableRow
                    key={member.id}
                    className='group border-slate-100 transition-colors hover:bg-sky-50/35'>
                    <TableCell className='px-4'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <div className='flex size-9 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-sky-100 to-indigo-100 text-xs font-semibold text-sky-800 ring-1 ring-sky-200/70'>
                          {getInitials(member)}
                        </div>
                        <div className='min-w-0'>
                          <p className='truncate text-sm font-semibold text-slate-800'>
                          {member.user?.fullName || 'Unnamed user'}
                          </p>
                          <p className='truncate text-xs text-slate-500'>
                          {member.user?.email || 'No email'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {canManage ? (
                        <Select
                          value={member.role}
                          onValueChange={value =>
                            requestRoleChange(member, value as Role)
                          }>
                          <SelectTrigger className='h-8 w-28 border-slate-200 bg-white text-xs capitalize shadow-none'>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value='editor'>Editor</SelectItem>
                            <SelectItem value='admin'>Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className='inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium capitalize text-slate-600'>
                          {member.role}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className='text-xs font-medium text-slate-500'>
                      {new Date(member.createdAt).toLocaleDateString()}
                    </TableCell>
                    {canManage && (
                      <TableCell>
                        {!member.isSelf && (
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            aria-label='Remove member'
                            className='size-8 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 focus-visible:opacity-100'
                            onClick={() => requestRemoveMember(member)}>
                            <Trash2Icon className='size-3.5' />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </section>
  )
}
