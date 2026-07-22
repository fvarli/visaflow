import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { SkipLink } from '@/components/layout/SkipLink'
import { Field } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'

/** Mirrors the real provider stack in src/App.tsx. */
function renderInApp(ui: React.ReactNode, route = '/documents') {
  return render(
    <ThemeProvider>
      <DossierProvider>
        <TooltipProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </TooltipProvider>
      </DossierProvider>
    </ThemeProvider>
  )
}

describe('Field', () => {
  it('associates its label with the control', () => {
    render(
      <Field label="Passport number">
        <Input />
      </Field>
    )
    expect(screen.getByLabelText(/passport number/i)).toBeInTheDocument()
  })

  it('marks the control invalid and announces the error', () => {
    render(
      <Field label="Entry date" error="Entry date is required">
        <Input />
      </Field>
    )

    const input = screen.getByLabelText(/entry date/i)
    const alert = screen.getByRole('alert')

    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(alert).toHaveTextContent('Entry date is required')
    // The whole point: the message is reachable from the input.
    expect(input.getAttribute('aria-describedby')).toContain(alert.id)
  })

  it('wires description text without an error present', () => {
    render(
      <Field label="Nationality" description="Two-letter country code">
        <Input />
      </Field>
    )
    const input = screen.getByLabelText(/nationality/i)
    expect(input).not.toHaveAttribute('aria-invalid')
    expect(input.getAttribute('aria-describedby')).toBeTruthy()
  })

  it('supports the render-prop form for controls that cannot take a cloned id', () => {
    render(
      <Field label="Marital status" htmlFor="marital">
        <select id="marital">
          <option>Single</option>
        </select>
      </Field>
    )
    expect(screen.getByLabelText(/marital status/i)).toBeInTheDocument()
  })
})

describe('Navigation', () => {
  it('marks the active route with aria-current', () => {
    renderInApp(<Sidebar />, '/documents')
    const active = screen.getByRole('link', { name: /documents/i })
    expect(active).toHaveAttribute('aria-current', 'page')
  })

  it('renders every destination exactly once (no duplicated nav arrays)', () => {
    renderInApp(<Sidebar />)
    for (const label of ['Dashboard', 'Applicant', 'Documents', 'Settings']) {
      expect(screen.getAllByRole('link', { name: label })).toHaveLength(1)
    }
  })
})

describe('SkipLink', () => {
  it('targets the main landmark', () => {
    render(<SkipLink />)
    expect(
      screen.getByRole('link', { name: /skip to content/i })
    ).toHaveAttribute('href', '#main')
  })
})

describe('PageHeader', () => {
  it('renders the page title as the h1', () => {
    render(<PageHeader title="Documents" description="Track them" />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Documents' })
    ).toBeInTheDocument()
  })
})

describe('StatusBadge', () => {
  it('exposes its tone for styling and assertions', () => {
    render(<StatusBadge tone="success">Ready</StatusBadge>)
    expect(screen.getByText('Ready')).toHaveAttribute('data-tone', 'success')
  })
})

describe('Playground', () => {
  // Renders every primitive at once, so a crash in any of them fails here
  // rather than being discovered by eye.
  it('renders all primitive sections without throwing', async () => {
    const { default: PlaygroundPage } = await import('@/pages/PlaygroundPage')
    renderInApp(<PlaygroundPage />, '/playground')

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /design system playground/i,
      })
    ).toBeInTheDocument()

    for (const section of [
      'Foundations',
      'Typography',
      'Buttons',
      'Badges & status',
      'Forms',
      'Feedback',
      'Data display',
      'Overlays',
      'Composition',
    ]) {
      expect(
        screen.getByRole('heading', { level: 2, name: section })
      ).toBeInTheDocument()
    }
  })

  it('exercises the Field error path it documents', async () => {
    const { default: PlaygroundPage } = await import('@/pages/PlaygroundPage')
    renderInApp(<PlaygroundPage />, '/playground')

    const invalid = screen.getByLabelText(/entry date/i)
    expect(invalid).toHaveAttribute('aria-invalid', 'true')
  })
})
