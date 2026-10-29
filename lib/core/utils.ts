import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { nanoid } from 'nanoid'
import { createHash } from 'crypto'
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function createApiKey(): string {
  return `bot_${nanoid(24)}`
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

