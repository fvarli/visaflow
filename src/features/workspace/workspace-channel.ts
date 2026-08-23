/**
 * Cross-tab notification for the saved-dossier workspace.
 *
 * Strictly a **hint layer**. IndexedDB is the source of truth and the
 * compare-and-swap in `DossierRepository.put` is what actually prevents one tab
 * overwriting another (ADR-037). Nothing here is required for correctness: if
 * `BroadcastChannel` is unsupported, if a message is dropped, duplicated, or
 * arrives out of order, the worst outcome is that a tab notices a change when it
 * next tries to save instead of immediately.
 *
 * That property is deliberate. Designing the safety around message delivery
 * would make correctness depend on the least reliable part of the system.
 *
 * **Privacy:** messages carry ids and revisions only — never dossier payload.
 * Passport numbers and financial data have no reason to cross a channel when an
 * id and a number say everything a listening tab needs to know.
 */

const CHANNEL_NAME = 'visaflow-workspace'

export type WorkspaceEvent =
  | { type: 'updated'; dossierId: string; revision: number; tabId: string }
  | { type: 'deleted'; dossierId: string; tabId: string }
  | { type: 'created'; dossierId: string; revision: number; tabId: string }

/**
 * What a caller supplies; the channel stamps `tabId`. Spelled out rather than
 * `Omit<WorkspaceEvent, 'tabId'>` because `Omit` collapses a discriminated
 * union into one loose object type and stops narrowing.
 */
export type WorkspaceEventInput =
  | { type: 'updated'; dossierId: string; revision: number }
  | { type: 'deleted'; dossierId: string }
  | { type: 'created'; dossierId: string; revision: number }

export interface WorkspaceChannel {
  post(event: WorkspaceEventInput): void
  subscribe(listener: (event: WorkspaceEvent) => void): () => void
  readonly tabId: string
  close(): void
}

/** Identifies this tab so it can ignore the echo of its own writes. */
function createTabId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `tab-${Math.random().toString(36).slice(2)}`
  )
}

/** A channel that does nothing, for browsers without `BroadcastChannel`. */
function inertChannel(tabId: string): WorkspaceChannel {
  return {
    tabId,
    post: () => {},
    subscribe: () => () => {},
    close: () => {},
  }
}

export function createWorkspaceChannel(): WorkspaceChannel {
  const tabId = createTabId()

  if (typeof BroadcastChannel === 'undefined') return inertChannel(tabId)

  let channel: BroadcastChannel
  try {
    channel = new BroadcastChannel(CHANNEL_NAME)
  } catch {
    // Some privacy modes expose the constructor but refuse to construct it.
    return inertChannel(tabId)
  }

  const listeners = new Set<(event: WorkspaceEvent) => void>()

  channel.onmessage = (message: MessageEvent<unknown>) => {
    const event = message.data as WorkspaceEvent | null
    if (!event || typeof event !== 'object' || typeof event.tabId !== 'string')
      return
    // Our own writes are not news.
    if (event.tabId === tabId) return
    for (const listener of listeners) listener(event)
  }

  return {
    tabId,
    post: (event) => {
      try {
        channel.postMessage({ ...event, tabId })
      } catch {
        // A failed notification must never fail the write that triggered it.
      }
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    close: () => {
      listeners.clear()
      try {
        channel.close()
      } catch {
        // Already closed.
      }
    },
  }
}
