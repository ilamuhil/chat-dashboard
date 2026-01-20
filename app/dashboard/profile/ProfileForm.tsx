"use client";

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { updateProfile } from './action'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { ImageUploadDialog } from './ImageUploadDialog'
import { getOrganizationLogoUrl } from './action'
import { Activity, useState, useActionState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Spinner } from '@/components/ui/spinner'
import { updatePassword, type ProfileResult } from './action'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import React from 'react'

type Organization = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  logo_url: string | null;
  address: {
    address_line1: string | null;
    address_line2: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
    country: string | null;
  };
} | null;

type Props = {
  organization: Organization;
};

type PasswordResult = {
  error?: string | Record<string, string[]>
  success?: string
  nonce?: string | null
}

const ProfileForm = ({ organization: initialOrganization }: Props) => {
  const [open, setOpen] = useState(false)
  const [organizationState, businessProfileSubmitAction, isPending] = useActionState<
    ProfileResult | null,
    FormData
  >(updateProfile, {
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
  });


  const [passwordState, passwordSubmitAction, isPendingPassword] = useActionState<
    PasswordResult | null,
    FormData
  >(updatePassword,null)

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

  useEffect(() => {
    if (!passwordState?.nonce) return
    if (passwordState.success) {
      toast.success(passwordState.success, { position: 'top-center' })
      return
    }
    if (passwordState.error) {
      const msg =
        typeof passwordState.error === 'string'
          ? passwordState.error
          : Object.values(passwordState.error).flat()[0]
      toast.error(msg, { position: 'top-center' })
    }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [passwordState?.nonce])


  // once user types in the form, set the submitDisabled to false

  const [currentLogoUrl, setCurrentLogoUrl] = useState<string | null>(null)
  
  // Generate placeholder URL based on organization ID for consistency (human profile images only)
  const getPlaceholderUrl = () => {
    return 'https://avatar.iran.liara.run/public'
  }

  // Track the last organization ID we fetched logo for to prevent duplicate calls
  const lastFetchedOrgId = useRef<string | null>(null)

  // Fetch logo from R2 storage based on organizationId
  // Only fetch once per organization ID to avoid duplicate API calls
  useEffect(() => {
    const orgId = organization?.id || initialOrganization?.id
    if (!orgId) {
      setCurrentLogoUrl(null)
      lastFetchedOrgId.current = null
      return
    }

    // Skip if we already fetched for this organization ID
    if (lastFetchedOrgId.current === orgId) {
      return
    }

    lastFetchedOrgId.current = orgId

    const fetchLogo = async () => {
      try {
        const logoUrl = await getOrganizationLogoUrl(orgId)
        setCurrentLogoUrl(logoUrl)
      } catch (error) {
        console.error('Error fetching logo:', error)
        setCurrentLogoUrl(null)
      }
    }

    fetchLogo()
  }, [organization?.id, initialOrganization?.id])

  const handleAvatarClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!organization?.id) {
      return; // Don't open dialog if organizationId doesn't exist
    }
    setOpen(true);
  };

  const handleLogoUploadSuccess = async (url: string) => {
    // Presigned URLs are already time-limited and unique, so use them directly
    // Adding cache-busting would break the signature
    // Use the URL directly from upload - no need to refetch
    setCurrentLogoUrl(url)
  };

  const handleLogoDeleteSuccess = async () => {
    // Clear the logo URL display - deletion was successful, no need to verify
    setCurrentLogoUrl(null)
  };

  return (
    <>
      <Activity mode={open ? "visible" : "hidden"}>
        <ImageUploadDialog 
          open={open} 
          setOpen={setOpen} 
          organizationId={organization?.id}
          onUploadSuccess={handleLogoUploadSuccess}
          onDeleteSuccess={handleLogoDeleteSuccess}
        />
      </Activity>
      <form>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <section>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-lg"
                  className="size-32"
                  onClick={handleAvatarClick}
                  disabled={!organization?.id}
                >
              <Avatar className="size-32 shadow-md border-3 border-sky-600" key={currentLogoUrl}>
                <AvatarImage
                  sizes="100%"
                  src={currentLogoUrl || getPlaceholderUrl()}
                  alt="Organization logo"
                />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {!organization?.id 
                  ? 'Please save other information first'
                  : 'Profile image'
                }
              </TooltipContent>
            </Tooltip>
          </section>
          <section className="my-auto">
            <Label
              htmlFor="name"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              Company/Organization Name *
            </Label>
            <Input
              id="name"
              name="name"
              type="text"
              defaultValue={organization?.name || ""}
              required
            />
          </section>
          <section>
            <Label
              htmlFor="tenant_id"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              Tenant ID *
            </Label>
            <Input
              id="tenant_id"
              name="tenant_id"
              type="text"
              disabled
              defaultValue={organization?.id || ""}
            />
            <Input
              id="id"
              name="id"
              type="text"
              hidden
              defaultValue={organization?.id || ""}
            />
            <small className="text-xs text-muted-foreground">
              This is your organization ID. It is used to identify your
              organization in the system. It is auto-generated and cannot be
              changed.
            </small>
          </section>
          <section>
            <div className="flex justify-between">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-muted-foreground mb-2"
              >
                Email
              </Label>
              <Button
                variant="default"
                size="sm"
                className="text-xs px-2 mb-1 bg-amber-600"
                disabled
                onClick={() => {
                  setOpen(true);
                }}
              >
                Verify Email
              </Button>
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={organization?.email || ""}
            />
            {typeof organizationState?.error === "object" &&
              organizationState.error?.email && (
                <small className="text-sm text-destructive">
                  {organizationState.error.email[0]}
                </small>
              )}
          </section>
          <Separator className="col-span-2" />
          <h2 className="text-lg font-medium text-muted-foreground col-span-2">
            Update Password
          </h2>
          <section>
            <Label
              htmlFor="new-password"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              New Password
            </Label>
            <Input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="off"
            />
          </section>
          <section>
            <Label
              htmlFor="confirm-password"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              Confirm Password
            </Label>
            <Input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="off"
            />
          </section>
          <section className='col-span-2'>
            <Button variant='default' className='text-xs px-2 mb-1' type='submit' formAction={passwordSubmitAction}>
              {isPendingPassword ? (
                <>
                  Updating Password... <Spinner />
                </>
              ) : (
                'Update Password'
              )}
            </Button>
          </section>
          <Separator className="col-span-2" />
          <h2 className="text-lg font-medium text-muted-foreground col-span-2">
            Business Address Information
          </h2>
          <section>
            <Label
              htmlFor="address_line1"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              Address Line 1
            </Label>
            <Input
              id="address_line1"
              name="address_line1"
              type="text"
              defaultValue={organization?.address?.address_line1 || ""}
            />
          </section>
          <section>
            <Label
              htmlFor="address_line2"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              Address Line 2
            </Label>
            <Input
              id="address_line2"
              name="address_line2"
              type="text"
              defaultValue={organization?.address?.address_line2 || ""}
            />
          </section>
          <section>
            <Label
              htmlFor="city"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              City
            </Label>
            <Input
              id="city"
              name="city"
              type="text"
              defaultValue={organization?.address?.city || ""}
            />
          </section>
          <section>
            <Label
              htmlFor="state"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              State
            </Label>
            <Input
              id="state"
              name="state"
              type="text"
              defaultValue={organization?.address?.state || ""}
            />
          </section>
          <section>
            <Label
              htmlFor="zip"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              Zip Code
            </Label>
            <Input
              id="zip"
              name="zip"
              type="text"
              defaultValue={organization?.address?.zip || ""}
            />
          </section>
          <section>
            <Label
              htmlFor="country"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              Country
            </Label>
            <Input
              id="country"
              name="country"
              type="text"
              defaultValue={organization?.address?.country || ""}
            />
          </section>
          <section>
            <Label
              htmlFor="phone"
              className="text-xs font-medium text-muted-foreground mb-2"
            >
              Phone Number
            </Label>
            <Input
              id="phone"
              name="phone"
              type="text"
              defaultValue={organization?.phone || ""}
            />
          </section>
          <section className='col-span-2'>
            <Button variant='default' type='submit' formAction={businessProfileSubmitAction} className='text-xs' disabled={isPending}>
              {isPending ? (
                <>
                  Saving... <Spinner />
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </section>
        </div>
      </form>
    </>
  );
};

export default ProfileForm;
