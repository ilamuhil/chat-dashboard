import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OrganizationRole,
  organizationRoles,
  isOrganizationRole,
} from '../../lib/organization/roles'
import {
  can,
  canManageRole,
  type Permission,
} from '../../lib/organization/permissions'
import { requestPermission } from '../../lib/organization/access-policy'
import { csvCell, toCsv } from '../../lib/leads/csv'
import {
  captureConfigSchema,
  readCaptureConfig,
  publicCaptureSettings,
} from '../../lib/widget/capture-config'

test('canonical role contract and fail-closed parsing', () => {
  assert.deepEqual(organizationRoles, [
    'owner',
    'admin',
    'counsellor',
    'viewer',
  ])
  for (const invalid of [
    'editor',
    'Owner',
    'support_agent',
    'user',
    null,
    undefined,
    {},
    '',
  ])
    assert.equal(isOrganizationRole(invalid), false)
})
test('complete role/capability matrix', () => {
  const permissions: Permission[] = [
    'read',
    'operate',
    'configure',
    'members',
    'export',
    'billing',
  ]
  const expected = {
    owner: [true, true, true, true, true, true],
    admin: [true, true, true, true, true, false],
    counsellor: [true, true, false, false, false, false],
    viewer: [true, false, false, false, false, false],
  }
  for (const role of organizationRoles)
    assert.deepEqual(
      permissions.map((p) => can(role, p)),
      expected[role],
    )
  for (const p of permissions) assert.equal(can('editor', p), false)
})
test('Admins cannot create or alter privileged memberships', () => {
  for (const target of organizationRoles)
    for (const next of organizationRoles) {
      assert.equal(canManageRole(OrganizationRole.Owner, target, next), true)
      assert.equal(
        canManageRole(OrganizationRole.Admin, target, next),
        [OrganizationRole.Counsellor, OrganizationRole.Viewer].some(
          (r) => r === target,
        ) &&
          [OrganizationRole.Counsellor, OrganizationRole.Viewer].some(
            (r) => r === next,
          ),
      )
    }
  assert.equal(
    canManageRole(OrganizationRole.Viewer, OrganizationRole.Viewer),
    false,
  )
})
test('sensitive route families require explicit capabilities', () => {
  assert.equal(
    requestPermission('/api/dashboard/leads/export', 'POST'),
    'export',
  )
  assert.equal(
    requestPermission('/api/training-source/file/upload', 'POST'),
    'configure',
  )
  assert.equal(requestPermission('/api/auth/agent/token', 'POST'), 'operate')
  assert.equal(requestPermission('/api/billing/export', 'GET'), 'billing')
  assert.equal(requestPermission('/api/billing/webhook', 'POST'), null)
  assert.equal(
    requestPermission('/dashboard/users/org-members', 'GET'),
    'members',
  )
})
test('CSV handles formulas, quotes, multiline Unicode and empty values', () => {
  for (const value of ['=1+1', ' +SUM(A1)', '@cmd', '-2', '\tvalue', '\n=1'])
    assert.equal(csvCell(value).slice(0, 2), String.fromCharCode(34, 39))
  assert.equal(csvCell('A,"B"\nகல்வி'), '"A,""B""\nகல்வி"')
  assert.equal(csvCell(null), '""')
  assert.ok(toCsv(['Name'], [['ஒரு பெயர்']]).startsWith('\uFEFF"Name"\r\n'))
})
test('capture policy rejects duplicate IDs/options and bounds question count', () => {
  const q = {
    id: 'field_1',
    label: 'Qualification',
    type: 'select',
    required: true,
    options: ['UG', 'PG'],
  }
  assert.equal(captureConfigSchema.safeParse({ questions: [q] }).success, true)
  assert.equal(
    captureConfigSchema.safeParse({ questions: [q, q] }).success,
    false,
  )
  assert.equal(
    captureConfigSchema.safeParse({
      questions: [{ ...q, options: ['UG', 'UG'] }],
    }).success,
    false,
  )
  assert.equal(
    captureConfigSchema.safeParse({ questions: [{ ...q, id: '__proto__' }] })
      .success,
    false,
  )
  assert.equal(
    captureConfigSchema.safeParse({
      questions: Array.from({ length: 4 }, (_, i) => ({
        ...q,
        id: `field_${i}`,
      })),
    }).success,
    false,
  )
  const threeQuestions = Array.from({ length: 3 }, (_, i) => ({
    ...q,
    id: `field_${i}`,
  }))
  assert.equal(
    captureConfigSchema.safeParse({ questions: threeQuestions }).success,
    true,
  )
  const legacy = readCaptureConfig({
    required: { name: false, email: false, phone: true },
    hostedEnabled: true,
    questions: [...threeQuestions, { ...q, id: 'field_old' }],
    conversationStarters: { enabled: true, questions: ['How do I apply?'] },
  })
  assert.equal(legacy.questions.length, 3)
  assert.equal(legacy.hostedEnabled, true)
  assert.equal(legacy.required.phone, true)
  assert.equal(legacy.conversationStarters.enabled, true)
  const policy = publicCaptureSettings({
    captureLeads: true,
    captureName: false,
    captureEmail: false,
    capturePhone: true,
    leadCaptureConfig: { required: { name: true, email: true, phone: true } },
  })
  assert.deepEqual(policy.required, { name: false, email: false, phone: true })
})
