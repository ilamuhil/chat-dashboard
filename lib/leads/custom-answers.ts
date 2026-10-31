export type CustomAnswer = { label: string; value: string | number | boolean }
export function customAnswers(metadata: unknown): Record<string, CustomAnswer> {
  if (
    !metadata ||
    typeof metadata !== 'object' ||
    !('custom_fields' in metadata) ||
    !metadata.custom_fields ||
    typeof metadata.custom_fields !== 'object'
  )
    return {}
  return Object.fromEntries(
    Object.entries(metadata.custom_fields).filter(
      (entry): entry is [string, CustomAnswer] => {
        const value = entry[1]
        return (
          !!value &&
          typeof value === 'object' &&
          typeof value.label === 'string' &&
          ['string', 'number', 'boolean'].includes(typeof value.value)
        )
      },
    ),
  )
}
