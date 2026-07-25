import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18n, { DEFAULT_LOCALE, LOCALE_STORAGE_KEY } from '@/i18n'
import { LocaleProvider } from '@/app/providers/LocaleProvider'
import { RouteBuilder } from '@/components/trip/RouteBuilder'
import type { RouteStop } from '@/domain/schemas/trip.schema'

const ATHENS: RouteStop = {
  city: 'Athens',
  country: 'GR',
  arrivalDate: '2025-04-01',
  departureDate: '2025-04-05',
  nights: 4,
}
const SANTORINI: RouteStop = {
  city: 'Santorini',
  country: 'GR',
  arrivalDate: '2025-04-05',
  departureDate: '2025-04-10',
  nights: 5,
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>
}

beforeEach(async () => {
  window.localStorage.removeItem(LOCALE_STORAGE_KEY)
  await i18n.changeLanguage(DEFAULT_LOCALE)
})

describe('RouteBuilder', () => {
  it('shows an empty state and adds a stop with computed nights', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(
      <Wrap>
        <RouteBuilder stops={[]} onChange={onChange} />
      </Wrap>
    )

    expect(
      screen.getByText(i18n.t('trip:route.empty.title'))
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: i18n.t('trip:route.add') })
    )

    fireEvent.change(
      screen.getByLabelText(i18n.t('trip:route.fields.city'), { exact: false }),
      { target: { value: 'Nafplio' } }
    )
    // Country is a searchable combobox: open, filter by code, select.
    await user.click(
      screen.getByRole('button', { name: i18n.t('trip:route.fields.country') })
    )
    await user.type(
      await screen.findByRole('combobox', {
        name: i18n.t('common:countryCombobox.search'),
      }),
      'GR{Enter}'
    )
    fireEvent.change(
      screen.getByLabelText(i18n.t('trip:route.fields.arrival'), {
        exact: false,
      }),
      { target: { value: '2025-04-03' } }
    )
    fireEvent.change(
      screen.getByLabelText(i18n.t('trip:route.fields.departure'), {
        exact: false,
      }),
      { target: { value: '2025-04-05' } }
    )

    await user.click(
      screen.getByRole('button', { name: i18n.t('trip:collection.save') })
    )

    expect(onChange).toHaveBeenCalledTimes(1)
    const next = (onChange.mock.calls[0]?.[0] ?? []) as RouteStop[]
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({
      city: 'Nafplio',
      country: 'GR',
      arrivalDate: '2025-04-03',
      departureDate: '2025-04-05',
      nights: 2,
    })
  })

  it('reorders stops with the move-down control', () => {
    const onChange = vi.fn()
    render(
      <Wrap>
        <RouteBuilder
          stops={[ATHENS, SANTORINI]}
          mainDestinationCountry="GR"
          onChange={onChange}
        />
      </Wrap>
    )

    const downButtons = screen.getAllByRole('button', {
      name: i18n.t('trip:route.moveDown'),
    })
    fireEvent.click(downButtons[0] as HTMLElement)

    expect(onChange).toHaveBeenCalledWith([SANTORINI, ATHENS])
  })

  it('removes a stop', () => {
    const onChange = vi.fn()
    render(
      <Wrap>
        <RouteBuilder
          stops={[ATHENS, SANTORINI]}
          mainDestinationCountry="GR"
          onChange={onChange}
        />
      </Wrap>
    )

    const removeButtons = screen.getAllByRole('button', {
      name: i18n.t('trip:collection.remove'),
    })
    fireEvent.click(removeButtons[0] as HTMLElement)

    expect(onChange).toHaveBeenCalledWith([SANTORINI])
  })
})
