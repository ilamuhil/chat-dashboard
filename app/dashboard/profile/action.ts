"use server";

import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { uploadFile, deleteFile, getPresignedUrl, getPublicUrl, getPresignedGetUrl } from "@/lib/filemanagement";
import axios from "axios";

const businessProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, "Name must be at least 3 characters").max(50),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  logo_url: z.string().url("Logo URL must be a valid URL").optional(),
  address_line1: z.string().min(1, "Address line 1 is required").max(100),
  address_line2: z.string().optional(),
  city: z.string().min(3, "City must be at least 3 characters").max(100),
  state: z.string().min(3, "State must be at least 3 characters").max(100),
  zip: z.string().min(3, "Zip code must be at least 3 characters").max(100),
  country: z.string().min(3, "Country must be at least 3 characters").max(100),
});


export type ProfileResult = {
  error?: string | Record<string, string[]>;
  success?: string;
  nonce?: string | null;
  organization?: {
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
  };
  id?: string;
};

export async function updatePassword(state: unknown, formData: FormData) {
  const nonce = Date.now().toString()
  const supabaseUserClient = await createClient()
  const new_password = formData.get('new-password')?.toString()
  const confirm_password = formData.get('confirm-password')?.toString()
  if (new_password !== confirm_password) {
    return { error: 'Passwords do not match', nonce }
  }
  const { error } = await supabaseUserClient.auth.updateUser({
    password: new_password,
  })
  if (error) {
    return { error: error.message, nonce }
  }
  return { success: 'Password updated successfully', nonce }
}

export async function updateProfile(
  prevState: ProfileResult | null,
  formData: FormData
): Promise<ProfileResult> {
  const nonce = Date.now().toString()
  const supabaseUserClient = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabaseUserClient.auth.getUser();
  const supabase = await createClient(true);
  if (userError || !user) {
    redirect("/auth/login");
  } else {
    // Helper to convert null/empty to undefined for optional fields
    const getValue = (key: string) => {
      const value = formData.get(key);
      return value === null || value === "" ? undefined : value.toString();
    };

    const validatedFields = businessProfileSchema.safeParse({
      name: formData.get("name")?.toString() || "",
      email: formData.get("email")?.toString() || "",
      phone: getValue("phone"),
      logo_url: getValue("logo_url"),
      address_line1: formData.get("address_line1")?.toString() || "",
      address_line2: getValue("address_line2"),
      city: formData.get("city")?.toString() || "",
      state: formData.get("state")?.toString() || "",
      zip: formData.get("zip")?.toString() || "",
      country: formData.get("country")?.toString() || "",
      id: getValue("id"),
    });
    if (!validatedFields.success) {
      console.error(validatedFields.error.flatten().fieldErrors);
      return { error: validatedFields.error.flatten().fieldErrors, nonce };
    }
    const response = await createOrUpdateOrganization(
      validatedFields.data.name,
      validatedFields.data.email,
      validatedFields.data.phone ?? "",
      validatedFields.data.logo_url ?? "",
      validatedFields.data.address_line1,
      validatedFields.data.address_line2 ?? "",
      validatedFields.data.city,
      validatedFields.data.state,
      validatedFields.data.zip,
      validatedFields.data.country,
      validatedFields.data.id
    );

    if (response.error) {
      console.error("Error creating or updating organization:", response.error);
      return { error: response.error, nonce };
    }
    if (!response.id) {
      console.error("Organization ID not found");
      return { error: "Organization ID not found", nonce };
    }
    //Associate user with organization if not already associated

    const { data: existingAssociation } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", response.id)
      .eq("user_id", user.id)
      .maybeSingle();
    if (existingAssociation) {
      // Use organization from response if available, otherwise fetch it
      if (response.organization) {
        console.log("Organization updated successfully");
        console.log("Organization:", response.organization);
        console.log("creating user association if not already exists");
        // Supabase returns address as nested JSONB, so use it directly
        const transformedOrg = {
          id: response.organization.id,
          name: response.organization.name,
          email: response.organization.email,
          phone: response.organization.phone,
          logo_url: response.organization.logo_url,
          address: response.organization.address || {
            address_line1: null,
            address_line2: null,
            city: null,
            state: null,
            zip: null,
            country: null,
          },
        };
        return {
          success: "Organization updated successfully",
          organization: transformedOrg,
          nonce,
        };
      }
      return {
        success: "Organization updated successfully",
        nonce,
      };
    }
    const { error: associationError } = await supabase
      .from("organization_members")
      .insert({
        organization_id: response.id,
        user_id: user.id,
        role: "admin",
      });
    if (associationError) {
      console.error(
        "Error associating user with organization:",
        associationError
      );
      return { error: associationError.message, nonce };
    } else {
      console.log("User associated with organization successfully");
      // Supabase returns address as nested JSONB, so use it directly
      if (response.organization) {
        const transformedOrg = {
          id: response.organization.id,
          name: response.organization.name,
          email: response.organization.email,
          phone: response.organization.phone,
          logo_url: response.organization.logo_url,
          address: response.organization.address || {
            address_line1: null,
            address_line2: null,
            city: null,
            state: null,
            zip: null,
            country: null,
          },
        };
        return {
          success: response.success,
          id: response.id,
          organization: transformedOrg,
          nonce,
        };
      }
      return {
        success: response.success,
        id: response.id,
        nonce,
      };
    }
  }
}

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
  } | null;
  created_at?: string;
};

async function createOrUpdateOrganization(
  name: string,
  email: string,
  phone: string,
  logo_url: string,
  address_line1: string,
  address_line2: string,
  city: string,
  state: string,
  zip: string,
  country: string,
  id?: string
): Promise<{
  error?: string;
  success?: string;
  id?: string;
  organization?: Organization;
}> {
  const supabase = await createClient(true);
  const organizationData = {
    id: id || nanoid(),
    name: name,
    email: email || null,
    phone: phone || null,
    logo_url: logo_url || null,
    address: {
      address_line1: address_line1,
      address_line2: address_line2 || null,
      city: city,
      state: state,
      zip: zip,
      country: country,
    },
  };
  if (id) {
    const { data: updatedOrg, error: updateError } = await supabase
      .from("organizations")
      .update(organizationData)
      .eq("id", id)
      .select()
      .single();
    if (updateError) {
      console.error("Error updating organization:", updateError);
      return { error: updateError?.message || "Failed to update organization" };
    }
    // Transform to match expected structure
    const transformedOrg = {
      id: updatedOrg.id,
      name: updatedOrg.name,
      email: updatedOrg.email,
      phone: updatedOrg.phone,
      logo_url: updatedOrg.logo_url,
      address: updatedOrg.address || {
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        zip: null,
        country: null,
      },
    };
    return {
      success: "Organization updated successfully",
      id: id,
      organization: transformedOrg,
    };
  }
  const { data: orgData, error } = await supabase
    .from("organizations")
    .insert(organizationData)
    .select()
    .single();
  if (error) {
    console.error("Error creating organization:", error);
    return { error: error?.message || "Failed to create organization" };
  }
  // Transform to match expected structure
  const transformedOrg = {
    id: orgData.id,
    name: orgData.name,
    email: orgData.email,
    phone: orgData.phone,
    logo_url: orgData.logo_url,
    address: orgData.address || {
      address_line1: null,
      address_line2: null,
      city: null,
      state: null,
      zip: null,
      country: null,
    },
  };
  return {
    success: "Organization created successfully",
    id: orgData.id,
    organization: transformedOrg,
  };
}

// R2 Storage functions for organization logos
const BUCKET = 'org-assets'
const getFilePath = (organizationId: string, fileName: string) => `organizations/${organizationId}/${fileName}`

/**
 * Uploads an organization logo to R2 storage.
 */
export async function uploadOrganizationLogo(formData: FormData): Promise<{ error?: string; success?: string; url?: string }> {
  try {
    // Check if R2 environment variables are configured
    if (!process.env.CLOUDFLARE_R2_BASE_URL || !process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY) {
      const missing = []
      if (!process.env.CLOUDFLARE_R2_BASE_URL) missing.push('CLOUDFLARE_R2_BASE_URL')
      if (!process.env.ACCESS_KEY_ID) missing.push('ACCESS_KEY_ID')
      if (!process.env.SECRET_ACCESS_KEY) missing.push('SECRET_ACCESS_KEY')
      console.error('R2 environment variables not configured. Missing:', missing.join(', '))
      return { error: `R2 storage not configured. Missing: ${missing.join(', ')}` }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Unauthorized' }
    }

    const organizationId = formData.get('organizationId')?.toString()
    const file = formData.get('file') as File | null

    if (!organizationId) {
      return { error: 'Organization ID is required' }
    }
    if (!file) {
      return { error: 'File is required' }
    }

    // Verify user belongs to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!membership) {
      return { error: 'Unauthorized: User does not belong to this organization' }
    }

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'File size must be less than 5MB' }
    }
    const fileExtension = file.name.split('.').pop()?.toLowerCase()
    if (!fileExtension || !['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension)) {
      return { error: 'Invalid file type. Supported formats: JPG, JPEG, PNG, WEBP' }
    }

    const filePath = getFilePath(organizationId, `logo.${fileExtension}`)

    // Delete old logo files first
    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    for (const ext of extensions) {
      if (ext !== fileExtension) {
        const oldFilePath = getFilePath(organizationId, `logo.${ext}`)
        try {
          await deleteFile(BUCKET, oldFilePath)
        } catch {
          // Ignore errors - old files may not exist
        }
      }
    }

    // Upload new file
    await uploadFile(file, filePath, BUCKET)

    // Return presigned GET URL for immediate access (works for both public and private buckets)
    // Presigned URL expires in 24 hours - long enough for the image to be displayed
    const presignedUrl = getPresignedGetUrl(BUCKET, filePath, 60 * 60 * 24)
    return { success: 'Image uploaded successfully', url: presignedUrl }
  } catch (err) {
    console.error('Error uploading logo:', err)
    return { error: err instanceof Error ? err.message : 'Failed to upload image. Please try again later.' }
  }
}

/**
 * Deletes an organization logo from R2 storage.
 */
export async function deleteOrganizationLogo(organizationId: string): Promise<{ error?: string; success?: string }> {
  try {
    // Check if R2 environment variables are configured
    if (!process.env.CLOUDFLARE_R2_BASE_URL || !process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY) {
      const missing = []
      if (!process.env.CLOUDFLARE_R2_BASE_URL) missing.push('CLOUDFLARE_R2_BASE_URL')
      if (!process.env.ACCESS_KEY_ID) missing.push('ACCESS_KEY_ID')
      if (!process.env.SECRET_ACCESS_KEY) missing.push('SECRET_ACCESS_KEY')
      console.error('R2 environment variables not configured. Missing:', missing.join(', '))
      return { error: `R2 storage not configured. Missing: ${missing.join(', ')}` }
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return { error: 'Unauthorized' }
    }

    // Verify user belongs to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!membership) {
      return { error: 'Unauthorized: User does not belong to this organization' }
    }

    // Try to delete all possible logo file extensions
    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    let deletedCount = 0

    for (const ext of extensions) {
      const fileName = `logo.${ext}`
      const filePath = getFilePath(organizationId, fileName)
      try {
        await deleteFile(BUCKET, filePath)
        deletedCount++
      } catch {
        // Ignore errors - files may not exist
      }
    }

    if (deletedCount > 0) {
      return { success: 'Logo deleted successfully' }
    } else {
      return { error: 'No logo files found to delete' }
    }
  } catch (err) {
    console.error('Error deleting logo:', err)
    return { error: err instanceof Error ? err.message : 'Failed to delete logo. Please try again later.' }
  }
}

/**
 * Gets the logo URL for an organization from R2 storage.
 * Checks for common image extensions and returns the first found.
 */
export async function getOrganizationLogoUrl(organizationId: string): Promise<string | null> {
  try {
    if (!organizationId) {
      console.error('getOrganizationLogoUrl: organizationId is required')
      return null
    }

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.warn('getOrganizationLogoUrl: User not authenticated')
      return null
    }

    // Verify user belongs to organization
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('organization_id', organizationId)
      .maybeSingle()

    if (!membership) {
      console.warn(`getOrganizationLogoUrl: User ${user.id} does not belong to organization ${organizationId}`)
      return null
    }

    // Check if R2 environment variables are configured
    if (!process.env.CLOUDFLARE_R2_BASE_URL || !process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY) {
      console.error('R2 environment variables not configured. Missing:', {
        CLOUDFLARE_R2_BASE_URL: !process.env.CLOUDFLARE_R2_BASE_URL,
        ACCESS_KEY_ID: !process.env.ACCESS_KEY_ID,
        SECRET_ACCESS_KEY: !process.env.SECRET_ACCESS_KEY,
      })
      return null
    }

    // Try common image extensions - use HEAD request to check existence
    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    for (const ext of extensions) {
      const fileName = `logo.${ext}`
      const filePath = getFilePath(organizationId, fileName)
      try {
        // Use HEAD request to check if file exists
        const headUrl = getPresignedUrl({
          method: 'HEAD',
          bucket: BUCKET,
          key: filePath,
          expiresInSeconds: 60,
        })
        const response = await axios.head(headUrl, {
          validateStatus: (status) => status >= 200 && status < 300,
        })
        // File exists (status 200-299), return presigned GET URL for immediate access
        if (response.status >= 200 && response.status < 300) {
          return getPresignedGetUrl(BUCKET, filePath, 60 * 60 * 24) // 24 hour expiry
        }
      } catch (err) {
        // File doesn't exist (404) or other error, try next extension
        // Only log non-404 errors for debugging
        if (axios.isAxiosError(err) && err.response?.status !== 404) {
          console.warn(`Error checking for logo file ${fileName}:`, err.response?.status, err.message)
        }
        continue
      }
    }
    return null
  } catch (err) {
    // Log full error details for debugging
    if (err instanceof Error) {
      console.error('Error getting logo URL:', err.message, err.stack)
    } else if (axios.isAxiosError(err)) {
      console.error('Error getting logo URL (axios):', err.response?.status, err.response?.statusText, err.message)
    } else {
      console.error('Error getting logo URL (unknown):', err)
    }
    // Return null instead of throwing to prevent breaking the UI
    return null
  }
}
