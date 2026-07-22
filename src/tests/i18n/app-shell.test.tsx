import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import i18n, {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
} from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { ThemeProvider } from '@/app/providers/ThemeProvider'
import { DossierProvider } from '@/app/providers/DossierProvider'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sidebar } from '@/components/layout/Sidebar'
import { navGroups, secondaryNavItems } from '@/config/navigation'
import { dynamicT } from '@/lib/i18n-dynamic'

/**
 * Substitute for browser visual verification: the Chrome extension is not
 * available in this environment. These tests assert that the shell renders
 * fully in each locale and that the longest Turkish labels are present and
 * wrap-safe (no truncation utility on nav items).
 */

function renderShell() {
  return render(
    <LocaleProvider>
      <ThemeProvider>
        <DossierProvider>
          <TooltipProvider>
            <MemoryRouter initialEntries={['/dashboard']}>
              <Sidebar />
            </MemoryRouter>
          </TooltipProvider>
        </DossierProvider>
      </ThemeProvider>
    </LocaleProvider>
  )
}

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

afterEach(async () => {
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('app shell renders in both locales', () => {
  it.each([...SUPPORTED_LOCALES])(
    'renders every navigation destination in "%s"',
    async (locale) => {
      await i18n.changeLanguage(locale)
      renderShell()

      const td = dynamicT(i18n.t)
      const allItems = [
        ...navGroups.flatMap((g) => g.items),
        ...secondaryNavItems,
      ]
      for (const item of allItems) {
        expect(
          screen.getByRole('link', { name: td(item.labelKey) }),
          `${item.to} missing in ${locale}`
        ).toBeInTheDocument()
      }
    }
  )

  it('renders the longest Turkish nav label without a truncation class', async () => {
    await i18n.changeLanguage('tr')
    renderShell()

    // "Tutarlılık kontrolleri" is the longest sidebar label.
    const link = screen.getByRole('link', {
      name: i18n.t('navigation:items.consistencyChecks'),
    })
    const label = within(link).getByText(
      i18n.t('navigation:items.consistencyChecks')
    )
    // The label span must allow wrapping, not clip — guards against a `truncate`
    // regression that would hide the tail of long Turkish strings.
    expect(label.className).toContain('break-words')
    expect(label.className).not.toContain('truncate')
  })

  it('marks the active route with aria-current in Turkish', async () => {
    await i18n.changeLanguage('tr')
    renderShell()
    const active = screen.getByRole('link', {
      name: i18n.t('navigation:items.dashboard'),
    })
    expect(active).toHaveAttribute('aria-current', 'page')
  })
})
