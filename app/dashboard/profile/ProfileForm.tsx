"use client";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { updateProfile } from "./action";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ImageUploadDialog } from "./ImageUploadDialog";
import { Activity, useState, useActionState, useEffect } from "react";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { ProfileResult } from "./action";
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

const ProfileForm = ({ organization: initialOrganization }: Props) => {
  const [open, setOpen] = useState(false);
  const [organizationState, action, isPending] = useActionState<
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
          logo_url: initialOrganization.logo_url,
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

  const organization = organizationState?.organization || initialOrganization;

  useEffect(() => {
    if (!organizationState) return;
    const errorMessage =
      typeof organizationState?.error === "string"
        ? organizationState.error
        : organizationState?.error
        ? Object.values(organizationState.error).flat()[0]
        : null;
    if (organizationState.success) {
      toast.success(organizationState.success, { position: "top-center" });
    }
    if (errorMessage) {
      toast.error(errorMessage, { position: "top-center" });
    }
  }, [organizationState]);

  // once user types in the form, set the submitDisabled to false

  return (
    <>
      <Activity mode={open ? "visible" : "hidden"}>
        <ImageUploadDialog open={open} setOpen={setOpen} />
      </Activity>
      <form key={organization?.id || "new"} action={action}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <section>
            <Button
              variant="ghost"
              size="icon-lg"
              className="size-32"
              onClick={() => {
                setOpen(true);
              }}
            >
              <Avatar className="size-32 shadow-md border-3 border-sky-600">
                <AvatarImage
                  sizes="100%"
                  src={
                    organization?.logo_url || "https://github.com/shadcn.png"
                  }
                  alt="@shadcn"
                />
                <AvatarFallback>CN</AvatarFallback>
              </Avatar>
            </Button>
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
          <input
            type="hidden"
            name="logo_url"
            defaultValue={organization?.logo_url || ""}
          />
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
          <section className="col-span-2">
            <Button variant="default" className="text-xs px-2 mb-1">
              Update Password
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
          <section className="col-span-2">
            <Button variant="default" className="text-xs" disabled={isPending}>
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
