import { z } from 'zod'
import { validState } from './tax'

export const billingDetailsSchema = z
  .object({
    name: z.string().trim().min(2, 'Enter your billing name.').max(120),
    email: z.email('Enter a valid billing email.'),
    phone: z.string().regex(/^\d{10}$/, 'Use a 10-digit Indian phone number.'),
    address: z
      .string()
      .trim()
      .min(10, 'Enter your complete billing address.')
      .max(1000),
    gstin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^$|^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/,
        'Enter a valid GSTIN or leave it blank.',
      )
      .default(''),
    stateCode: z
      .string()
      .refine(validState, 'Choose your Indian billing state.'),
  })
  .refine((value) => !value.gstin || value.gstin.startsWith(value.stateCode), {
    message: 'The billing state must match your GSTIN.',
    path: ['stateCode'],
  })
