'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { updateProfile } from './action'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ImageUploadDialog } from './ImageUploadDialog'
import { getOrganizationLogoUrl } from './action'
import { Activity, useState, useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { type ProfileResult } from './action'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import React from 'react'
import { Building2Icon, CameraIcon, MailIcon, MapPinIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Organization = {
  id: string
  name: string
  email: string | null
  phone: string | null
  logo_url: string | null
  address: {
    address_line1: string | null
    address_line2: string | null
    city: string | null
    state: string | null
    zip: string | null
    country: string | null
  }
} | null

type Props = {
  organization: Organization
}

const fieldLabelClass = 'text-xs font-medium text-muted-foreground'
const fieldControlClass = 'h-9 border-slate-200 text-sm shadow-sm'
const sectionCardClass =
  'dashboard-surface rounded-xl p-5 space-y-4'
const sectionTitleClass = 'text-sm font-semibold tracking-tight text-foreground'
const sectionDescClass = 'text-xs text-muted-foreground'

const ProfileForm = ({ organization: initialOrganization }: Props) => {
  const [open, setOpen] = useState(false)
  const [organizationState, businessProfileSubmitAction, isPending] =
    useActionState<ProfileResult | null, FormData>(updateProfile, {
      error: undefined,
      success: undefined,
      organization: initialOrganization
        ? {
            id: initialOrganization.id,
            name: initialOrganization.name,
            email: initialOrganization.email,
            phone: initialOrganization.phone,
            logo_url: null,
            address: initialOrganization.address || {
              address_line1: null,
              address_line2: null,
              city: null,
              state: null,
              zip: null,
              country: null,
            },
          }
        : undefined,
    })

  const organization = organizationState?.organization || initialOrganization

  useEffect(() => {
    if (!organizationState?.nonce) return
    if (organizationState.success) {
      toast.success(organizationState.success, { position: 'top-center' })
      return
    }
    if (organizationState.error) {
      const msg =
        typeof organizationState.error === 'string'
          ? organizationState.error
          : Object.values(organizationState.error).flat()[0]
      toast.error(msg, { position: 'top-center' })
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [organizationState?.nonce])

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null)

  const getPlaceholderUrl = () => '/corporate_placeholder.png'

  const lastFetchedOrgId = useRef<string | null>(null)

  useEffect(() => {
    const orgId = organization?.id || initialOrganization?.id
    if (!orgId) {
      lastFetchedOrgId.current = null
      return
    }

    if (lastFetchedOrgId.current === orgId) return
    lastFetchedOrgId.current = orgId
    let cancelled = false
    ;(async () => {
      try {
        const logoUrl = await getOrganizationLogoUrl(orgId)
        if (!cancelled) {
          setCurrentLogoUrl(logoUrl)
        }
      } catch (error) {
        console.error('Error fetching logo:', error)
        if (!cancelled) {
          setCurrentLogoUrl(null)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [organization?.id, initialOrganization?.id])

  const handleAvatarClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (!organization?.id) {
      return
    }
    setOpen(true)
  }

  const handleLogoUploadSuccess = async (url: string) => {
    setCurrentLogoUrl(url)
  }

  const handleLogoDeleteSuccess = async () => {
    setCurrentLogoUrl(null)
  }

  const fieldError = (key: string) => {
    if (typeof organizationState?.error !== 'object' || !organizationState.error) {
      return null
    }
    const messages = organizationState.error[key]
    return messages?.[0] ?? null
  }

  return (
    <>
      <Activity mode={open ? 'visible' : 'hidden'}>
        <ImageUploadDialog
          open={open}
          setOpen={setOpen}
          organizationId={organization?.id}
          onUploadSuccess={handleLogoUploadSuccess}
          onDeleteSuccess={handleLogoDeleteSuccess}
        />
      </Activity>

      <form
        key={organizationState?.nonce ?? 'profile-form'}
        className='space-y-5'>
        <input
          id='id'
          name='id'
          type='hidden'
          defaultValue={organization?.id || ''}
        />

        {/* Organization identity */}
        <section className={sectionCardClass}>
          <div className='space-y-1 border-b border-slate-100 pb-3'>
            <div className='flex items-center gap-2'>
              <Building2Icon className='size-4 text-slate-500' />
              <h3 className={sectionTitleClass}>Organization</h3>
            </div>
            <p className={sectionDescClass}>
              Logo and basic identity for your business profile.
            </p>
          </div>

          <div className='grid grid-cols-1 gap-5 md:grid-cols-[auto_1fr] md:items-start'>
            <div className='flex flex-col items-start gap-2'>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type='button'
                    variant='ghost'
                    className='group relative size-28 overflow-hidden rounded-xl p-0 hover:bg-transparent'
                    onClick={handleAvatarClick}
                    disabled={!organization?.id}>
                    <Avatar
                      className='size-28 rounded-xl border border-slate-200 shadow-sm ring-1 ring-sky-200/50'
                      key={currentLogoUrl}>
                      <AvatarImage
                        sizes='100%'
                        src={currentLogoUrl || getPlaceholderUrl()}
                        alt='Organization logo'
                        className='object-cover'
                      />
                      <AvatarFallback className='rounded-xl bg-slate-100 text-sm font-semibold text-slate-500'>
                        Logo
                      </AvatarFallback>
                    </Avatar>
                    <span className='absolute inset-0 flex items-center justify-center rounded-xl bg-slate-900/0 transition-colors group-hover:bg-slate-900/35 group-disabled:hidden'>
                      <CameraIcon className='size-5 text-white opacity-0 transition-opacity group-hover:opacity-100' />
                    </span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {!organization?.id
                    ? 'Please save other information first'
                    : 'Change logo'}
                </TooltipContent>
              </Tooltip>
              <p className='max-w-28 text-[11px] leading-relaxed text-muted-foreground'>
                JPG, PNG, or WEBP up to 5MB
              </p>
            </div>

            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='name' className={fieldLabelClass}>
                  Company / Organization Name *
                </Label>
                <Input
                  id='name'
                  name='name'
                  type='text'
                  defaultValue={organization?.name || ''}
                  required
                  className={fieldControlClass}
                  placeholder='Acme Institute'
                />
                {fieldError('name') && (
                  <p className='text-xs text-destructive'>{fieldError('name')}</p>
                )}
              </div>

              <div className='space-y-1.5 sm:col-span-2'>
                <Label htmlFor='tenant_id' className={fieldLabelClass}>
                  Tenant ID
                </Label>
                <Input
                  id='tenant_id'
                  name='tenant_id'
                  type='text'
                  disabled
                  defaultValue={organization?.id || ''}
                  className={cn(fieldControlClass, 'bg-slate-50 font-mono text-xs')}
                />
                <p className='text-[11px] leading-relaxed text-muted-foreground'>
                  Auto-generated organization identifier. It cannot be changed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Contact */}
        <section className={sectionCardClass}>
          <div className='space-y-1 border-b border-slate-100 pb-3'>
            <div className='flex items-center gap-2'>
              <MailIcon className='size-4 text-slate-500' />
              <h3 className={sectionTitleClass}>Contact</h3>
            </div>
            <p className={sectionDescClass}>
              How customers and the system can reach your organization.
            </p>
          </div>

          <div className='grid grid-cols-1 items-start gap-4 md:grid-cols-2'>
            <div className='flex flex-col gap-1.5'>
              <div className='flex h-7 items-center justify-between gap-2'>
                <Label htmlFor='email' className={fieldLabelClass}>
                  Email
                </Label>
                <Button
                  type='button'
                  size='sm'
                  disabled
                  className='h-7 shrink-0 rounded-md bg-amber-600 px-2.5 text-[11px] font-medium hover:bg-amber-600'>
                  Verify Email
                </Button>
              </div>
              <Input
                id='email'
                name='email'
                type='email'
                defaultValue={organization?.email || ''}
                className={fieldControlClass}
                placeholder='hello@company.com'
              />
              {fieldError('email') && (
                <p className='text-xs text-destructive'>{fieldError('email')}</p>
              )}
            </div>

            <div className='flex flex-col gap-1.5'>
              <div className='flex h-7 items-center'>
                <Label htmlFor='phone' className={fieldLabelClass}>
                  Phone Number
                </Label>
              </div>
              <Input
                id='phone'
                name='phone'
                type='text'
                defaultValue={organization?.phone || ''}
                className={fieldControlClass}
                placeholder='+1 (555) 000-0000'
              />
              {fieldError('phone') && (
                <p className='text-xs text-destructive'>{fieldError('phone')}</p>
              )}
            </div>
          </div>
        </section>

        {/* Address */}
        <section className={sectionCardClass}>
          <div className='space-y-1 border-b border-slate-100 pb-3'>
            <div className='flex items-center gap-2'>
              <MapPinIcon className='size-4 text-slate-500' />
              <h3 className={sectionTitleClass}>Business address</h3>
            </div>
            <p className={sectionDescClass}>
              Primary address used across your organization profile.
            </p>
          </div>

          <div className='grid grid-cols-1 gap-4 md:grid-cols-2'>
            <div className='space-y-1.5 md:col-span-2'>
              <Label htmlFor='address_line1' className={fieldLabelClass}>
                Address Line 1
              </Label>
              <Input
                id='address_line1'
                name='address_line1'
                type='text'
                defaultValue={organization?.address?.address_line1 || ''}
                className={fieldControlClass}
                placeholder='Street address'
              />
              {fieldError('address_line1') && (
                <p className='text-xs text-destructive'>
                  {fieldError('address_line1')}
                </p>
              )}
            </div>

            <div className='space-y-1.5 md:col-span-2'>
              <Label htmlFor='address_line2' className={fieldLabelClass}>
                Address Line 2
              </Label>
              <Input
                id='address_line2'
                name='address_line2'
                type='text'
                defaultValue={organization?.address?.address_line2 || ''}
                className={fieldControlClass}
                placeholder='Suite, unit, or floor (optional)'
              />
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='city' className={fieldLabelClass}>
                City
              </Label>
              <Input
                id='city'
                name='city'
                type='text'
                defaultValue={organization?.address?.city || ''}
                className={fieldControlClass}
              />
              {fieldError('city') && (
                <p className='text-xs text-destructive'>{fieldError('city')}</p>
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='state' className={fieldLabelClass}>
                State
              </Label>
              <Input
                id='state'
                name='state'
                type='text'
                defaultValue={organization?.address?.state || ''}
                className={fieldControlClass}
              />
              {fieldError('state') && (
                <p className='text-xs text-destructive'>{fieldError('state')}</p>
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='zip' className={fieldLabelClass}>
                Zip Code
              </Label>
              <Input
                id='zip'
                name='zip'
                type='text'
                defaultValue={organization?.address?.zip || ''}
                className={fieldControlClass}
              />
              {fieldError('zip') && (
                <p className='text-xs text-destructive'>{fieldError('zip')}</p>
              )}
            </div>

            <div className='space-y-1.5'>
              <Label htmlFor='country' className={fieldLabelClass}>
                Country
              </Label>
              <Input
                id='country'
                name='country'
                type='text'
                defaultValue={organization?.address?.country || ''}
                className={fieldControlClass}
              />
              {fieldError('country') && (
                <p className='text-xs text-destructive'>
                  {fieldError('country')}
                </p>
              )}
            </div>
          </div>
        </section>

        <div className='flex justify-end'>
          <Button
            variant='default'
            type='submit'
            formAction={businessProfileSubmitAction}
            disabled={isPending}
            className='h-10 w-full rounded-lg bg-linear-to-r from-slate-800 to-sky-800 px-6 text-sm font-medium shadow-sm transition-all duration-200 hover:from-slate-900 hover:to-sky-900 disabled:from-slate-300 disabled:to-slate-300 md:w-auto'>
            {isPending ? (
              <>
                Saving… <Spinner />
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </form>
    </>
  )
}

export default ProfileForm
