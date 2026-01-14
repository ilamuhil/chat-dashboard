export type ApiKey = {
  id: string
  organization_id: string
  bot_id: string
  name: string
  key_hash: string
  is_active: boolean
  last_used_at: string | null
  created_at: string
}

export type ApiKeyResult = {
  error: string | null
  success: string | null
  apiKey: string | null
  nonce: string | null
}

export type LauncherProps = {
  bots: { id: string; name: string }[]
}