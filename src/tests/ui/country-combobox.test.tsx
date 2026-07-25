import { useState } from 'react'
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { CountryCombobox } from '@/components/ui/country-combobox'

function Harness({ initial = '' }: { initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <LocaleProvider>
      <CountryCombobox
        ariaLabel="Country"
        value={value}
        onValueChange={setValue}
      />
      <span data-testid="value">{value}</span>
    </LocaleProvider>
  )
}

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('CountryCombobox', () => {
  it('shows the localized name for the stored ISO code', async () => {
    await i18n.changeLanguage('en')
    render(<Harness initial="GR" />)
    expect(screen.getByRole('button', { name: 'Country' })).toHaveTextContent(
      'Greece'
    )
  })

  it('renders localized names per locale', async () => {
    await i18n.changeLanguage('tr')
    render(<Harness initial="GR" />)
    expect(screen.getByRole('button', { name: 'Country' })).toHaveTextContent(
      'Yunanistan'
    )
  })

  it('stores the ISO code (not the label) when a country is chosen', async () => {
    await i18n.changeLanguage('en')
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Country' }))
    const search = await screen.findByRole('combobox', {
      name: i18n.t('common:countryCombobox.search'),
    })
    await user.type(search, 'France')
    await user.click(screen.getByRole('option', { name: 'France' }))

    expect(screen.getByTestId('value')).toHaveTextContent('FR')
  })

  it('selects with the keyboard (type + Enter)', async () => {
    await i18n.changeLanguage('en')
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Country' }))
    await user.type(
      await screen.findByRole('combobox', {
        name: i18n.t('common:countryCombobox.search'),
      }),
      'GR{Enter}'
    )
    expect(screen.getByTestId('value')).toHaveTextContent('GR')
  })

  it('shows a translated empty state when nothing matches', async () => {
    await i18n.changeLanguage('en')
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Country' }))
    await user.type(
      await screen.findByRole('combobox', {
        name: i18n.t('common:countryCombobox.search'),
      }),
      'zzzzzz'
    )
    expect(
      screen.getByText(i18n.t('common:countryCombobox.empty'))
    ).toBeInTheDocument()
  })
})
