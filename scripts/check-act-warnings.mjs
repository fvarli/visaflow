#!/usr/bin/env node
/**
 * Fails if the test suite emits any React `act(...)` warning.
 *
 * Why this exists: Vitest's default reporter hides console output from
 * *passing* tests, so 360 of these warnings sat in the suite unnoticed until a
 * verbose run was tried. Green tests were not evidence of a quiet suite.
 *
 * Why it is keyed on this string: `was not wrapped in act(` is React's own
 * message, not Vitest's presentation of it. A reporter format change can
 * therefore not make this guard silently pass — which is the failure mode that
 * matters for a regression guard.
 *
 * Node built-ins only; no dependency. Usable locally as `node
 * scripts/check-act-warnings.mjs`.
 */
import { spawn } from 'node:child_process'

const SIGNATURE = 'was not wrapped in act('

const child = spawn(
  'pnpm',
  ['vitest', 'run', '--reporter=verbose'],
  { stdio: ['ignore', 'pipe', 'pipe'], shell: false }
)

let output = ''
for (const stream of [child.stdout, child.stderr]) {
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    output += chunk
    process.stdout.write(chunk)
  })
}

const exitCode = await new Promise((resolve) => child.on('close', resolve))

const offenders = output.split('\n').filter((line) => line.includes(SIGNATURE))

if (exitCode !== 0) {
  console.error(
    `\nact-warning guard: test run itself failed (exit ${exitCode}); not reporting a warning count.`
  )
  process.exit(exitCode)
}

if (offenders.length > 0) {
  console.error(
    `\nact-warning guard: FAILED — ${offenders.length} React act(...) warning(s).\n`
  )
  // Cap the echo so a large regression cannot bury the summary line.
  for (const line of offenders.slice(0, 20)) console.error(`  ${line.trim()}`)
  if (offenders.length > 20) {
    console.error(`  … and ${offenders.length - 20} more`)
  }
  console.error(
    '\nA state update escaped act(). This is usually a test-harness ordering bug —\n' +
      'see the note in src/tests/i18n/i18n.test.tsx. Do not silence it by suppressing\n' +
      'console output or by reordering Vitest hooks globally.'
  )
  process.exit(1)
}

console.log('\nact-warning guard: OK — 0 React act(...) warnings.')
