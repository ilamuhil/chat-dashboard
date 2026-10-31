import { can } from '../organization/permissions'

export function canEditLeadNote(
  role: unknown,
  userId: string,
  authorId: string | null,
) {
  return can(role, 'operate') && (authorId === userId || can(role, 'configure'))
}

export function noteEditVersion(details: Record<string, unknown>): number {
  return typeof details.editVersion === 'number' &&
    Number.isSafeInteger(details.editVersion) &&
    details.editVersion >= 0
    ? details.editVersion
    : 0
}
