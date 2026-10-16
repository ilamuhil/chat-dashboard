import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'

export const work = resolve(
  process.env.BILLING_TEST_WORK_DIR || '.billing-test/work',
)
export const output = resolve(
  process.env.BILLING_TEST_OUTPUT_DIR || '.billing-test/outputs',
)
export const fixturePath = resolve(
  process.env.BILLING_TEST_FIXTURES || `${work}/sandbox-fixtures.json`,
)
export const browserPath = process.env.BILLING_TEST_BROWSER || undefined
for (const path of [work, output])
  mkdirSync(path, { recursive: true, mode: 0o700 })
