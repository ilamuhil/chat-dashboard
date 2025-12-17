'use server'

import { nanoid } from 'nanoid'
import { createClient } from '@/lib/supabase-server'
import { redirect } from 'next/navigation'
import { z } from 'zod'

const businessProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(3, 'Name must be at least 3 characters').max(50),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  logo_url: z.string().url('Logo URL must be a valid URL').optional(),
  address_line1: z.string().min(1, 'Address line 1 is required').max(100),
  address_line2: z.string().optional(),
  city: z.string().min(3, 'City must be at least 3 characters').max(100),
  state: z.string().min(3, 'State must be at least 3 characters').max(100),
  zip: z.string().min(3, 'Zip code must be at least 3 characters').max(100),
  country: z.string().min(3, 'Country must be at least 3 characters').max(100),
})

export async function updateProfile(state: unknown, formData: FormData) {
  const supabaseUserClient = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabaseUserClient.auth.getUser()
  const supabase = await createClient(true)
  if (userError || !user) {
    redirect('/auth/login')
  } else {
    // Helper to convert null/empty to undefined for optional fields
    const getValue = (key: string) => {
      const value = formData.get(key)
      return value === null || value === '' ? undefined : value.toString()
    }

    const validatedFields = businessProfileSchema.safeParse({
      name: formData.get('name')?.toString() || '',
      email: formData.get('email')?.toString() || '',
      phone: getValue('phone'),
      logo_url: getValue('logo_url'),
      address_line1: formData.get('address_line1')?.toString() || '',
      address_line2: getValue('address_line2'),
      city: formData.get('city')?.toString() || '',
      state: formData.get('state')?.toString() || '',
      zip: formData.get('zip')?.toString() || '',
      country: formData.get('country')?.toString() || '',
      id: getValue('id'),
    })
    if (!validatedFields.success) {
      console.error(validatedFields.error.flatten().fieldErrors)
      return { error: validatedFields.error.flatten().fieldErrors }
    }
    const response = await createOrUpdateOrganization(
      validatedFields.data.name,
      validatedFields.data.email,
      validatedFields.data.phone ?? '',
      validatedFields.data.logo_url ?? '',
      validatedFields.data.address_line1,
      validatedFields.data.address_line2 ?? '',
      validatedFields.data.city,
      validatedFields.data.state,
      validatedFields.data.zip,
      validatedFields.data.country,
      validatedFields.data.id
    )

    if (response.error) {
      console.error('Error creating or updating organization:', response.error)
      return { error: response.error }
    }
    if (!response.id) {
      console.error('Organization ID not found')
      return { error: 'Organization ID not found' }
    }
    //Associate user with organization if not already associated

    const { data: existingAssociation } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', response.id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (existingAssociation) {
      // Use organization from response if available, otherwise fetch it
      if (response.organization) {
        console.log('Organization updated successfully')
        console.log('Organization:', response.organization)
        console.log('creating user association if not already exists')
        return {
          success: 'Organization updated successfully',
          organization: response.organization,
        }
      }
      const orgData = response.organization
      return {
        success: 'Organization updated successfully',
        organization: orgData || undefined,
      }
    }
    const { error: associationError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: response.id,
        user_id: user.id,
        role: 'admin',
      })
    if (associationError) {
      console.error(
        'Error associating user with organization:',
        associationError
      )
      return { error: associationError.message }
    } else {
      console.log('User associated with organization successfully')
      return response
    }
  }
}

type Organization = {
  id: string
  name: string
  email: string | null
  phone: string | null
  logo_url: string | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  created_at: string
}

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
  error?: string
  success?: string
  id?: string
  organization?: Organization
}> {
  const supabase = await createClient(true)
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
  }
  if (id) {
    const { data: updatedOrg, error: updateError } = await supabase
      .from('organizations')
      .update(organizationData)
      .eq('id', id)
      .select()
      .single()
    if (updateError) {
      console.error('Error updating organization:', updateError)
      return { error: updateError?.message || 'Failed to update organization' }
    }
    return {
      success: 'Organization updated successfully',
      id: id,
      organization: updatedOrg,
    }
  }
  const { data: orgData, error } = await supabase
    .from('organizations')
    .insert(organizationData)
    .select()
    .single()
  if (error) {
    console.error('Error creating organization:', error)
    return { error: error?.message || 'Failed to create organization' }
  }
  return {
    success: 'Organization created successfully',
    id: orgData.id,
    organization: orgData,
  }
}
