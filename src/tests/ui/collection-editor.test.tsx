import { useState } from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CollectionEditor } from '@/components/ui/collection-editor'
import { Input } from '@/components/ui/input'

type Row = { label: string }

const LABELS = {
  add: 'Add',
  addTitle: 'Add row',
  editTitle: 'Edit row',
  save: 'Save',
  cancel: 'Cancel',
  edit: 'Edit',
  remove: 'Remove',
}

function Harness() {
  const [items, setItems] = useState<Row[]>([])
  return (
    <CollectionEditor<Row>
      items={items}
      onChange={setItems}
      createEmpty={() => ({ label: '' })}
      validate={(d) => d.label.trim().length > 0}
      emptyTitle="Nothing yet"
      labels={LABELS}
      renderSummary={(r) => <span>{r.label}</span>}
      renderForm={({ draft, setDraft }) => (
        <Input
          aria-label="Label"
          value={draft.label}
          onChange={(e) => setDraft({ label: e.target.value })}
        />
      )}
    />
  )
}

describe('CollectionEditor', () => {
  it('walks empty → add → edit → remove', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByText('Nothing yet')).toBeInTheDocument()

    // Add
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.type(screen.getByLabelText('Label'), 'Alpha')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Alpha')).toBeInTheDocument()
    expect(screen.queryByText('Nothing yet')).toBeNull()

    // Edit
    await user.click(screen.getByRole('button', { name: 'Edit' }))
    const input = screen.getByLabelText('Label')
    await user.clear(input)
    await user.type(input, 'Beta')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Beta')).toBeInTheDocument()

    // Remove
    await user.click(screen.getByRole('button', { name: 'Remove' }))
    expect(await screen.findByText('Nothing yet')).toBeInTheDocument()
  })

  it('keeps save disabled until the draft is valid', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByRole('button', { name: 'Add' }))
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    await user.type(screen.getByLabelText('Label'), 'x')
    expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled()
  })
})
