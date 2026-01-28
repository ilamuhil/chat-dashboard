"use server";

import { nanoid } from "nanoid";
import { z } from "zod";
import { uploadFile, deleteFile, getPresignedGetUrl } from "@/lib/filemanagement";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { getAuthUserIdFromCookies, requireAuthUserId } from "@/lib/auth-server";
import type { Prisma } from "@/generated/prisma/client";

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

export async function updateProfile(
  prevState: ProfileResult | null,
  formData: FormData
): Promise<ProfileResult> {
  const nonce = Date.now().toString()
  const userId = await requireAuthUserId()

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

  const existingAssociation = await prisma.organizationMembers.findFirst({
    where: { organizationId: response.id, userId },
    select: { id: true },
  })
  if (!existingAssociation) {
    await prisma.organizationMembers.create({
      data: {
        organizationId: response.id,
        userId,
        role: "admin",
      },
    })
  }

  return {
    success: response.success ?? "Organization updated successfully",
    id: response.id,
    organization: response.organization
      ? {
          ...response.organization,
          address:
            response.organization.address ?? {
              address_line1: null,
              address_line2: null,
              city: null,
              state: null,
              zip: null,
              country: null,
            },
        }
      : undefined,
    nonce,
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
  try {
    const orgId = id || nanoid()
    const address: {
      address_line1: string
      address_line2: string | null
      city: string
      state: string
      zip: string
      country: string
    } = {
      address_line1: address_line1,
      address_line2: address_line2 || null,
      city: city,
      state: state,
      zip: zip,
      country: country,
    }

    const upserted = id
      ? await prisma.organizations.update({
          where: { id: orgId },
          data: {
            name,
            email: email || null,
            phone: phone || null,
            logoUrl: logo_url || null,
            address: address as unknown as Prisma.InputJsonValue,
          },
          select: { id: true, name: true, email: true, phone: true, logoUrl: true, address: true },
        })
      : await prisma.organizations.create({
          data: {
            id: orgId,
            name,
            email: email || null,
            phone: phone || null,
            logoUrl: logo_url || null,
            address: address as unknown as Prisma.InputJsonValue,
          },
          select: { id: true, name: true, email: true, phone: true, logoUrl: true, address: true },
        })

    const transformedOrg: Organization = {
      id: upserted.id,
      name: upserted.name ?? '',
      email: upserted.email ?? null,
      phone: upserted.phone ?? null,
      logo_url: upserted.logoUrl ?? null,
      address: (upserted.address ?? null) as unknown as Organization['address'],
    }

    return {
      success: id ? 'Organization updated successfully' : 'Organization created successfully',
      id: upserted.id,
      organization: transformedOrg,
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to create/update organization'
    return { error: msg }
  }
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

    const userId = await requireAuthUserId()

    const organizationId = formData.get('organizationId')?.toString()
    const file = formData.get('file') as File | null

    if (!organizationId) {
      return { error: 'Organization ID is required' }
    }
    if (!file) {
      return { error: 'File is required' }
    }

    const membership = await prisma.organizationMembers.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    })
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
    const presignedUrl = await getPresignedGetUrl(BUCKET, filePath, 60 * 60 * 24)
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

    const userId = await requireAuthUserId()
    const membership = await prisma.organizationMembers.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    })
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

    const userId = await getAuthUserIdFromCookies()
    if (!userId) return null
    const membership = await prisma.organizationMembers.findFirst({
      where: { userId, organizationId },
      select: { id: true },
    })
    if (!membership) return null

    // Check if R2 environment variables are configured
    if (!process.env.CLOUDFLARE_R2_BASE_URL || !process.env.ACCESS_KEY_ID || !process.env.SECRET_ACCESS_KEY) {
      console.error('R2 environment variables not configured. Missing:', {
        CLOUDFLARE_R2_BASE_URL: !process.env.CLOUDFLARE_R2_BASE_URL,
        ACCESS_KEY_ID: !process.env.ACCESS_KEY_ID,
        SECRET_ACCESS_KEY: !process.env.SECRET_ACCESS_KEY,
      })
      return null
    }

    // Try common image extensions - use AWS SDK HeadObjectCommand to check existence
    const baseUrl = process.env.CLOUDFLARE_R2_BASE_URL
    const accessKeyId = process.env.ACCESS_KEY_ID
    const secretAccessKey = process.env.SECRET_ACCESS_KEY

    if (!baseUrl || !accessKeyId || !secretAccessKey) {
      return null
    }

    const client = new S3Client({
      region: 'auto',
      endpoint: baseUrl,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true,
    })

    const extensions = ['jpg', 'jpeg', 'png', 'webp']
    for (const ext of extensions) {
      const fileName = `logo.${ext}`
      const filePath = getFilePath(organizationId, fileName)
      try {
        // Use AWS SDK HeadObjectCommand to check if file exists
        const command = new HeadObjectCommand({
          Bucket: BUCKET,
          Key: filePath,
        })
        await client.send(command)
        // File exists, return presigned GET URL for immediate access
        return await getPresignedGetUrl(BUCKET, filePath, 60 * 60 * 24) // 24 hour expiry
      } catch (err: unknown) {
        // File doesn't exist (404) or other error, try next extension
        // Only log non-404 errors for debugging
        if (err instanceof Error && !err.message.includes('NotFound') && !err.message.includes('404')) {
          console.warn(`Error checking for logo file ${fileName}:`, err.message)
        }
        continue
      }
    }
    return null
  } catch (err) {
    // Log full error details for debugging
    if (err instanceof Error) {
      console.error('Error getting logo URL:', err.message, err.stack)
    } else {
      console.error('Error getting logo URL (unknown):', err)
    }
    // Return null instead of throwing to prevent breaking the UI
    return null
  }
}
