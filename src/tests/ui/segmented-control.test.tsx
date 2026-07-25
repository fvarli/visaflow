import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SegmentedControl } from '@/components/ui/segmented-control'

function Harness() {
  const [value, setValue] = useState<'a' | 'b' | 'c'>('a')
  return (
    <SegmentedControl
      ariaLabel="View"
      value={value}
      onValueChange={setValue}
      options={[
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' },
        { value: 'c', label: 'Gamma' },
      ]}
    />
  )
}

describe('SegmentedControl', () => {
  it('exposes a radiogroup with the selected option checked', () => {
    render(<Harness />)
    expect(screen.getByRole('radiogroup', { name: 'View' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Alpha' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Beta' })).not.toBeChecked()
  })

  it('selects on click', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByRole('radio', { name: 'Gamma' }))
    expect(screen.getByRole('radio', { name: 'Gamma' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Alpha' })).not.toBeChecked()
  })

  it('moves selection with arrow keys (roving focus)', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    const alpha = screen.getByRole('radio', { name: 'Alpha' })
    alpha.focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('radio', { name: 'Beta' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Beta' })).toHaveFocus()
  })
})
