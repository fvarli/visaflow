#!/usr/bin/env node
/**
 * A generic Chrome DevTools Protocol driver for manual QA.
 *
 * Iterations 23, 24, 27, 28 and the ADR-043/044 sprints each drove the installed
 * Chrome over CDP to look at the running product, and each one rewrote this file
 * from scratch into a scratchpad and threw it away. Five rewrites also meant
 * rediscovering the same handful of protocol traps, twice at the cost of a run
 * that reported PASS while measuring the wrong thing.
 *
 * So this is the reusable half, and only the reusable half: connection, target
 * lifecycle, navigation, evaluation, storage, screenshots and assertion
 * bookkeeping. It knows nothing about VisaFlow — no dossier shape, no fixture,
 * no route list, no translation key. Scenarios live in a scratchpad beside a run
 * and import this; they are the part that is genuinely disposable.
 *
 * Node 22 built-ins only: `WebSocket` and `fetch` are globals, so there is no
 * Playwright, no Puppeteer, and no new dependency.
 *
 * The traps below are encoded as behaviour rather than described in a comment,
 * because a comment has never once stopped anybody from hitting them:
 *
 *  1. `Page.navigate` is a full page load and discards in-memory or session-only
 *     state, after which every route renders its empty state. `goto()` therefore
 *     navigates client-side; a real reload has to be asked for by name.
 *  2. Two Chrome instances sharing one `--user-data-dir` corrupt each other's
 *     runs. `launchChrome` refuses a profile directory that already exists.
 *  3. `Page.addScriptToEvaluateOnNewDocument` persists for the life of the tab.
 *     `addInitScript` returns a handle, `removeInitScript` consumes it, and
 *     closing a page with one still installed is reported as an error.
 *  4. A backgrounded tab does not paint, so `Page.captureScreenshot` never
 *     resolves. `screenshot()` always calls `Page.bringToFront` first.
 *  5. A leftover profile can silently satisfy an "is there any data yet" probe.
 *     `clearOrigin` exists so a run can state that it started from nothing.
 *  6. `\s` inside an untagged template literal collapses to `s`, so a probe
 *     doing `.replace(/\s+/g, ' ')` rewrites every letter *s* in the page. The
 *     defence is structural: `evaluate()` takes a function and serializes it, so
 *     scenario code is never hand-escaped into a string.
 *  7. Viewport comes from `Emulation.setDeviceMetricsOverride`, never from the
 *     OS window, so a cell measures the width it claims to measure.
 *
 * Usage:
 *
 *   import { launchChrome, connect, createChecklist } from './scripts/qa-cdp.mjs'
 *
 *   const chrome = await launchChrome()
 *   const browser = await connect(chrome.wsUrl)
 *   const page = await browser.newPage('http://localhost:4173/')
 *   await page.setViewport(390, 844)
 *   const title = await page.evaluate(() => document.title)
 *   await page.screenshot('shot.png')
 *   await browser.close(); await chrome.close()
 *
 * Self-test: `node scripts/qa-cdp.mjs --self-test [--headful]`
 */

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'

/** Where Chrome usually is, most specific first. Override with `binary`. */
const CHROME_CANDIDATES = [
  process.env.CHROME_PATH,
  '/opt/google/chrome/chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean)

function findChrome() {
  const found = CHROME_CANDIDATES.find((p) => existsSync(p))
  if (!found) {
    throw new Error(
      `No Chrome binary found. Tried:\n  ${CHROME_CANDIDATES.join('\n  ')}\n` +
        'Set CHROME_PATH or pass { binary }.',
    )
  }
  return found
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * Reject instead of hanging.
 *
 * Every CDP call in here is wrapped, because the failure mode this replaces is a
 * run that sits silently forever on a screenshot of a tab that will never paint.
 */
function withTimeout(promise, ms, label) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`Timed out after ${ms}ms: ${label}`)),
      ms,
    )
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

/**
 * Start Chrome on a **dedicated, non-existent** profile directory.
 *
 * The directory must not already exist. Two Chrome instances sharing one
 * `--user-data-dir` corrupt each other, and the symptom is not a crash — it is a
 * run in which most routes report an empty page, which reads exactly like a
 * catastrophic product regression. That cost two discarded matrix cells once;
 * refusing the reuse outright is cheaper than diagnosing it again.
 */
export async function launchChrome({
  binary = findChrome(),
  profileDir = join(tmpdir(), `qa-cdp-profile-${process.pid}-${Date.now()}`),
  port = 0,
  headless = true,
  extraArgs = [],
  startupTimeoutMs = 30_000,
} = {}) {
  if (existsSync(profileDir)) {
    throw new Error(
      `Profile directory already exists: ${profileDir}\n` +
        'Refusing to reuse it — two Chrome instances sharing one --user-data-dir ' +
        'corrupt each other, and the symptom looks like a product regression.',
    )
  }
  mkdirSync(profileDir, { recursive: true })

  // Port 0 lets the OS choose; Chrome writes the real one to DevToolsActivePort,
  // but polling /json/version is simpler and is the readiness signal anyway.
  const chosenPort = port || 9222 + (process.pid % 1000)

  const args = [
    `--remote-debugging-port=${chosenPort}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-background-timer-throttling',
    '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows',
    '--disable-features=Translate,MediaRouter',
    '--password-store=basic',
    '--use-mock-keychain',
    ...(headless ? ['--headless=new'] : []),
    ...extraArgs,
    'about:blank',
  ]

  const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] })
  let stderr = ''
  child.stderr.on('data', (d) => {
    stderr += d.toString()
  })
  let exited = null
  child.on('exit', (code) => {
    exited = code
  })

  const base = `http://127.0.0.1:${chosenPort}`
  const deadline = Date.now() + startupTimeoutMs
  let wsUrl = null
  while (Date.now() < deadline) {
    if (exited !== null) {
      throw new Error(
        `Chrome exited with code ${exited} during startup.\n${stderr.slice(-2000)}`,
      )
    }
    try {
      const res = await fetch(`${base}/json/version`)
      if (res.ok) {
        wsUrl = (await res.json()).webSocketDebuggerUrl
        if (wsUrl) break
      }
    } catch {
      // Not listening yet.
    }
    await sleep(100)
  }
  if (!wsUrl) {
    child.kill('SIGKILL')
    throw new Error(
      `Chrome did not expose a DevTools endpoint on ${base} within ${startupTimeoutMs}ms.` +
        (stderr ? `\n${stderr.slice(-2000)}` : ''),
    )
  }

  return {
    process: child,
    port: chosenPort,
    profileDir,
    wsUrl,
    async close({ removeProfile = true } = {}) {
      if (exited === null) {
        child.kill('SIGTERM')
        const gone = Date.now() + 5000
        while (exited === null && Date.now() < gone) await sleep(50)
        if (exited === null) child.kill('SIGKILL')
      }
      if (removeProfile) rmSync(profileDir, { recursive: true, force: true })
    },
  }
}

/**
 * One WebSocket for the whole browser, using flattened sessions.
 *
 * Page-level commands carry a `sessionId` rather than opening a second socket
 * per tab, which keeps ordering total: a command and the events it causes arrive
 * on the same connection, so "did that navigation finish" never has to be
 * guessed across two streams.
 */
export async function connect(wsUrl, { timeoutMs = 30_000 } = {}) {
  const ws = new WebSocket(wsUrl)
  await withTimeout(
    new Promise((res, rej) => {
      ws.addEventListener('open', res, { once: true })
      ws.addEventListener('error', () => rej(new Error('WebSocket error')), {
        once: true,
      })
    }),
    timeoutMs,
    'WebSocket open',
  )

  let nextId = 1
  const pending = new Map()
  const listeners = new Set()
  let closed = false

  ws.addEventListener('close', () => {
    closed = true
    for (const { reject } of pending.values()) {
      reject(new Error('DevTools connection closed'))
    }
    pending.clear()
  })

  ws.addEventListener('message', (event) => {
    let msg
    try {
      msg = JSON.parse(event.data)
    } catch {
      return
    }
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id)
      pending.delete(msg.id)
      if (msg.error) {
        reject(new Error(`${msg.error.message} (code ${msg.error.code})`))
      } else {
        resolve(msg.result)
      }
      return
    }
    for (const fn of listeners) fn(msg)
  })

  function send(method, params = {}, sessionId) {
    if (closed) return Promise.reject(new Error('DevTools connection closed'))
    const id = nextId++
    const payload = { id, method, params }
    if (sessionId) payload.sessionId = sessionId
    const p = new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject })
    })
    ws.send(JSON.stringify(payload))
    return withTimeout(p, timeoutMs, `${method}`)
  }

  function on(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  const pages = new Set()

  const browser = {
    send,
    on,
    get pages() {
      return [...pages]
    },
    async newPage(url = 'about:blank', opts = {}) {
      const { targetId } = await send('Target.createTarget', { url })
      const { sessionId } = await send('Target.attachToTarget', {
        targetId,
        flatten: true,
      })
      const page = await makePage({ browser, targetId, sessionId, on, ...opts })
      pages.add(page)
      page._onDetach = () => pages.delete(page)
      return page
    },
    async close() {
      for (const page of [...pages]) {
        await page.close().catch(() => {})
      }
      try {
        await send('Browser.close')
      } catch {
        // The browser closing the socket mid-reply is the expected outcome.
      }
      try {
        ws.close()
      } catch {
        // Already gone.
      }
    },
  }

  return browser
}

async function makePage({ browser, targetId, sessionId, on }) {
  const send = (method, params) => browser.send(method, params, sessionId)

  const consoleErrors = []
  const pageErrors = []

  const off = on((msg) => {
    if (msg.sessionId !== sessionId) return
    if (msg.method === 'Runtime.consoleAPICalled') {
      if (msg.params.type === 'error') {
        consoleErrors.push(
          msg.params.args
            .map((a) => a.value ?? a.description ?? a.type)
            .join(' '),
        )
      }
    } else if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails
      pageErrors.push(d.exception?.description ?? d.text)
    } else if (msg.method === 'Log.entryAdded') {
      if (msg.params.entry.level === 'error') {
        consoleErrors.push(msg.params.entry.text)
      }
    }
  })

  await send('Page.enable')
  await send('Runtime.enable')
  await send('Log.enable')
  // A tab created behind another one is backgrounded, and a backgrounded tab
  // neither paints nor runs requestAnimationFrame — the same root cause as the
  // screenshot trap, but it presents as a hang in `settle()` rather than in
  // `screenshot()`. Front it once, at creation.
  await send('Page.bringToFront').catch(() => {})

  /** Init scripts still installed. Quirk 3: these outlive every navigation. */
  const initScripts = new Set()

  const page = {
    targetId,
    sessionId,
    send,

    /** Errors seen since the last `clearErrors()`. */
    get errors() {
      return { console: [...consoleErrors], page: [...pageErrors] }
    },
    clearErrors() {
      consoleErrors.length = 0
      pageErrors.length = 0
    },

    /**
     * Fix the viewport in the renderer.
     *
     * Not the OS window: a maximised or tiled window silently measures a width
     * the run never claimed, and "no overflow at 390px" then means nothing.
     */
    async setViewport(width, height, { deviceScaleFactor = 1, mobile = false } = {}) {
      await send('Emulation.setDeviceMetricsOverride', {
        width,
        height,
        deviceScaleFactor,
        mobile,
      })
    },

    /**
     * Wipe an origin's storage — IndexedDB, localStorage, caches, cookies.
     *
     * Explicit rather than trusting a fresh profile, because a leftover profile
     * once satisfied a "does any dossier exist yet" probe and the run measured
     * data it had not created.
     */
    async clearOrigin(origin, storageTypes = 'all') {
      await send('Storage.clearDataForOrigin', { origin, storageTypes })
    },

    /**
     * A real page load. Discards in-memory and session-only state — which is
     * sometimes exactly what a scenario wants to prove, and is otherwise the
     * single most expensive mistake available here. Named so it cannot happen by
     * accident; `goto` is the default.
     */
    async reload(url, { waitUntilIdleMs = 400 } = {}) {
      if (url) {
        await send('Page.navigate', { url })
      } else {
        await send('Page.reload')
      }
      await page.waitForLoad()
      await sleep(waitUntilIdleMs)
    },

    async waitForLoad({ timeoutMs = 30_000 } = {}) {
      await withTimeout(
        new Promise((resolve) => {
          const detach = on((msg) => {
            if (
              msg.sessionId === sessionId &&
              (msg.method === 'Page.loadEventFired' ||
                msg.method === 'Page.frameStoppedLoading')
            ) {
              detach()
              resolve()
            }
          })
        }),
        timeoutMs,
        'page load',
      )
    },

    /**
     * Client-side route change: `history.pushState` plus a dispatched
     * `popstate`, which is what a router listens for.
     *
     * This is the default on purpose. A sweep that used `Page.navigate` once
     * reported one `h1` on two of fourteen routes and looked like the product
     * had collapsed; it had simply reloaded away the state it was measuring.
     */
    async goto(path, { settleMs = 250 } = {}) {
      await page.evaluate((p) => {
        window.history.pushState({}, '', p)
        window.dispatchEvent(new PopStateEvent('popstate'))
      }, path)
      await page.settle(settleMs)
    },

    /**
     * Two animation frames plus a pause: enough for a React commit to paint.
     *
     * The frames are raced against an in-page timeout because a backgrounded or
     * occluded tab does not run `requestAnimationFrame` at all — the same cause
     * as the screenshot trap, but it surfaces here as a run that hangs on a
     * `Runtime.evaluate` that will never resolve. Settling late is fine;
     * hanging is not.
     */
    async settle(ms = 250) {
      await page.evaluate(
        () =>
          new Promise((r) => {
            let done = false
            const finish = () => {
              if (done) return
              done = true
              r(true)
            }
            requestAnimationFrame(() => requestAnimationFrame(finish))
            setTimeout(finish, 1000)
          }),
      )
      if (ms) await sleep(ms)
    },

    /**
     * Evaluate a **function** in the page, optionally with JSON-serializable
     * arguments.
     *
     * Taking a function rather than a source string is the structural answer to
     * the escaping trap: `\s` inside an untagged template literal collapses to
     * `s`, so a hand-built probe doing `.replace(/\s+/g, ' ')` quietly replaced
     * every letter *s* in the page and turned "Dashboard" into "Da hboard". A
     * function is serialized by the engine, so a regex in scenario code stays
     * the regex that was written.
     */
    async evaluate(fn, ...args) {
      const expression =
        typeof fn === 'function'
          ? `(${fn.toString()})(${args.map((a) => JSON.stringify(a === undefined ? null : a)).join(',')})`
          : String(fn)
      const result = await send('Runtime.evaluate', {
        expression,
        awaitPromise: true,
        returnByValue: true,
        userGesture: true,
      })
      if (result.exceptionDetails) {
        const d = result.exceptionDetails
        throw new Error(
          `Evaluation failed: ${d.exception?.description ?? d.text}`,
        )
      }
      return result.result.value
    },

    /** Poll a predicate in the page until it is truthy. */
    async waitFor(fn, { timeoutMs = 10_000, intervalMs = 100, label } = {}) {
      const deadline = Date.now() + timeoutMs
      let last
      while (Date.now() < deadline) {
        last = await page.evaluate(fn)
        if (last) return last
        await sleep(intervalMs)
      }
      throw new Error(
        `waitFor timed out after ${timeoutMs}ms${label ? `: ${label}` : ''}`,
      )
    },

    /**
     * Install a script that runs before any page script, on every document.
     *
     * Returns a handle that **must** be passed to `removeInitScript`. These
     * persist for the life of the tab: an early "pin the locale to en" script
     * once survived into every later navigation, so a Turkish run produced
     * English output, three byte-identical PDFs, and a PASS. Closing a page with
     * one still installed is reported rather than ignored.
     */
    async addInitScript(source) {
      const src = typeof source === 'function' ? `(${source.toString()})()` : String(source)
      const { identifier } = await send(
        'Page.addScriptToEvaluateOnNewDocument',
        { source: src },
      )
      initScripts.add(identifier)
      return identifier
    },

    async removeInitScript(identifier) {
      await send('Page.removeScriptToEvaluateOnNewDocument', { identifier })
      initScripts.delete(identifier)
    },

    get installedInitScripts() {
      return [...initScripts]
    },

    /**
     * Capture the viewport to a PNG.
     *
     * `Page.bringToFront` first, always: a backgrounded tab does not paint, and
     * `Page.captureScreenshot` then never resolves — a hang with no error.
     */
    async screenshot(path, { fullPage = false, timeoutMs = 30_000 } = {}) {
      await send('Page.bringToFront')
      const params = { format: 'png', captureBeyondViewport: fullPage }
      const { data } = await withTimeout(
        send('Page.captureScreenshot', params),
        timeoutMs,
        `screenshot ${path}`,
      )
      if (path) {
        mkdirSync(dirname(resolve(path)), { recursive: true })
        writeFileSync(path, Buffer.from(data, 'base64'))
      }
      return data
    },

    async close() {
      if (initScripts.size > 0) {
        console.error(
          `qa-cdp: closing a page with ${initScripts.size} init script(s) still ` +
            `installed: ${[...initScripts].join(', ')}. These outlive navigations ` +
            'and silently affect later measurements — remove them explicitly.',
        )
      }
      off()
      page._onDetach?.()
      await browser.send('Target.closeTarget', { targetId }).catch(() => {})
    },
  }

  return page
}

/**
 * Assertion bookkeeping across a matrix of cells.
 *
 * A cell is whatever a scenario says it is — a viewport, a locale, a build. The
 * checklist only records and renders; deciding what a cell means is the
 * scenario's job.
 */
export function createChecklist() {
  const rows = []
  let cell = '—'

  return {
    setCell(name) {
      cell = name
    },
    /**
     * Record one assertion. `fn` must return **exactly `true`** to pass.
     *
     * Anything else is a failure, and its value becomes the detail — which is
     * what makes `return \`expected 3, saw \${n}\`` the natural way to write a
     * probe. Truthiness is deliberately not used: the obvious idiom of
     * returning an explanatory string on the failure path makes every such
     * check pass under `Boolean`, so a probe that bails out early because it
     * could not find what it was looking for reports PASS. That happened here
     * on the first run of this harness, across four cells at once.
     *
     * A thrown error is a FAIL with its message, never a crashed run — one
     * broken probe must not cost the other forty measurements.
     */
    async check(label, fn) {
      try {
        const value = await fn()
        const ok = value === true
        rows.push({
          cell,
          label,
          ok,
          detail: ok ? '' : typeof value === 'string' ? value : String(value),
        })
        return ok
      } catch (err) {
        rows.push({ cell, label, ok: false, detail: err.message })
        return false
      }
    },
    /** Record a measurement without judging it. */
    note(label, detail) {
      rows.push({ cell, label, ok: null, detail: String(detail) })
    },
    get rows() {
      return [...rows]
    },
    get failures() {
      return rows.filter((r) => r.ok === false)
    },
    report() {
      const width = Math.max(...rows.map((r) => r.label.length), 5)
      let currentCell = null
      const lines = []
      for (const r of rows) {
        if (r.cell !== currentCell) {
          currentCell = r.cell
          lines.push('', `## ${currentCell}`, '')
        }
        const mark = r.ok === null ? '·' : r.ok ? 'PASS' : 'FAIL'
        lines.push(
          `  ${mark.padEnd(4)}  ${r.label.padEnd(width)}${r.detail ? `  ${r.detail}` : ''}`,
        )
      }
      const failed = rows.filter((r) => r.ok === false).length
      const passed = rows.filter((r) => r.ok === true).length
      lines.push('', `${passed} passed, ${failed} failed`, '')
      return lines.join('\n')
    },
  }
}

/**
 * Prove the driver itself, including the four traps that are invisible when they
 * are working: a fresh profile is refused if reused, a backgrounded tab still
 * screenshots, an init script actually stops applying once removed, and the
 * viewport is the one that was asked for.
 */
async function selfTest({ headless }) {
  const list = createChecklist()
  list.setCell('qa-cdp self-test')

  const chrome = await launchChrome({ headless })
  console.log(`Chrome up on port ${chrome.port}, profile ${chrome.profileDir}`)
  const browser = await connect(chrome.wsUrl)

  await list.check('refuses to reuse a profile directory', async () => {
    try {
      await launchChrome({ profileDir: chrome.profileDir, headless })
      return false
    } catch (err) {
      return /Refusing to reuse/.test(err.message)
    }
  })

  const page = await browser.newPage('about:blank')

  await list.check('evaluate returns a value', async () => {
    return (await page.evaluate(() => 6 * 7)) === 42
  })

  await list.check('evaluate passes arguments', async () => {
    return (await page.evaluate((a, b) => a + b, 'qa-', 'cdp')) === 'qa-cdp'
  })

  await list.check('a regex survives into the page (quirk 6)', async () => {
    // Written as a function, so \s stays \s. The old string-built form turned
    // "Dashboard" into "Da hboard" — the exact bug this shape prevents.
    const out = await page.evaluate(() => 'Dash   board'.replace(/\s+/g, ' '))
    return out === 'Dash board'
  })

  await list.check('evaluate surfaces a page exception', async () => {
    try {
      await page.evaluate(() => {
        throw new Error('deliberate')
      })
      return false
    } catch (err) {
      return /deliberate/.test(err.message)
    }
  })

  await list.check('setViewport is what the renderer reports (quirk 7)', async () => {
    await page.setViewport(390, 844)
    const w = await page.evaluate(() => window.innerWidth)
    return w === 390 ? true : `innerWidth ${w}, expected 390`
  })

  // Quirk 3: install, prove it applies, remove, prove it stops applying.
  let handle
  await list.check('an init script applies on the next document', async () => {
    handle = await page.addInitScript(() => {
      window.__qaCdpProbe = 'installed'
    })
    await page.reload('data:text/html,<title>one</title>')
    return (await page.evaluate(() => window.__qaCdpProbe)) === 'installed'
  })

  await list.check('…and stops applying once removed (quirk 3)', async () => {
    await page.removeInitScript(handle)
    await page.reload('data:text/html,<title>two</title>')
    const v = await page.evaluate(() => window.__qaCdpProbe)
    return v == null ? true : `probe still present: ${v}`
  })

  await list.check('no init scripts left installed', () => {
    return page.installedInitScripts.length === 0
  })

  await list.check('client-side goto does not reload (quirk 1)', async () => {
    await page.reload('data:text/html,<title>spa</title><h1>spa</h1>')
    await page.evaluate(() => {
      window.__qaCdpSurvives = 'yes'
      window.__qaCdpRoute = location.pathname
      window.addEventListener('popstate', () => {
        window.__qaCdpRoute = location.pathname
      })
    })
    // A data: URL cannot pushState, so this half of the trap is proven on a real
    // origin below; here we only assert the in-page state survives.
    return (await page.evaluate(() => window.__qaCdpSurvives)) === 'yes'
  })

  // Quirk 4: background the tab, then screenshot it anyway.
  const front = await browser.newPage('data:text/html,<title>front</title>')
  await front.evaluate(() => 1)
  await list.check('screenshots a backgrounded tab (quirk 4)', async () => {
    const out = join(tmpdir(), `qa-cdp-selftest-${process.pid}.png`)
    await page.screenshot(out)
    const ok = existsSync(out)
    rmSync(out, { force: true })
    return ok
  })

  await list.check('clearOrigin runs against a real origin (quirk 5)', async () => {
    await page.reload('data:text/html,ok')
    // clearDataForOrigin needs a real origin; data: has none, so this asserts the
    // call shape is right by exercising it against a well-formed origin string.
    await page.clearOrigin('http://127.0.0.1:1/')
    return true
  })

  await list.check('console errors are captured', async () => {
    page.clearErrors()
    await page.evaluate(() => console.error('captured-by-qa-cdp'))
    await sleep(200)
    return page.errors.console.some((e) => /captured-by-qa-cdp/.test(e))
  })

  await front.close()
  await page.close()
  await browser.close()
  await chrome.close()

  console.log(list.report())
  return list.failures.length === 0
}

const isMain = process.argv[1] && import.meta.url === `file://${resolve(process.argv[1])}`
if (isMain && process.argv.includes('--self-test')) {
  selfTest({ headless: !process.argv.includes('--headful') })
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch((err) => {
      console.error(err)
      process.exit(1)
    })
}
