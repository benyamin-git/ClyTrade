import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type Column } from './DataTable'

interface Row {
  id: string
  symbol: string
}

const columns: readonly Column<Row>[] = [
  { key: 'symbol', header: 'Symbol', render: (row) => row.symbol },
  {
    key: 'actions',
    header: '',
    render: (row) => (
      <button type="button" onClick={(event) => event.stopPropagation()}>
        Edit {row.symbol}
      </button>
    ),
  },
]

const rows: readonly Row[] = [
  { id: '1', symbol: 'AAPL' },
  { id: '2', symbol: 'MSFT' },
]

function bodyRows() {
  return screen.getAllByRole('row').slice(1)
}

describe('DataTable', () => {
  it('renders headers and rows', () => {
    render(<DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} />)

    expect(screen.getByRole('columnheader', { name: 'Symbol' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'AAPL' })).toBeInTheDocument()
    expect(screen.getByRole('cell', { name: 'MSFT' })).toBeInTheDocument()
  })

  it('renders the empty state instead of the table', () => {
    render(
      <DataTable columns={columns} rows={[]} getRowKey={(row) => row.id} empty={<p>No rows</p>} />,
    )

    expect(screen.getByText('No rows')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('reports a row click', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    )

    await user.click(screen.getByRole('cell', { name: 'AAPL' }))
    expect(onRowClick).toHaveBeenCalledWith(rows[0])
  })

  it('activates a focused row with Enter and Space', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    )

    await user.tab()
    expect(bodyRows()[0]).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onRowClick).toHaveBeenCalledWith(rows[0])

    await user.keyboard(' ')
    expect(onRowClick).toHaveBeenCalledTimes(2)
  })

  it('does not activate the row when an in-cell control handles the key', async () => {
    const user = userEvent.setup()
    const onRowClick = vi.fn()
    render(
      <DataTable
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    )

    await user.tab()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Edit AAPL' })).toHaveFocus()

    await user.keyboard('{Enter}')
    expect(onRowClick).not.toHaveBeenCalled()
  })

  it('leaves rows out of the tab order without a row action', async () => {
    const user = userEvent.setup()
    render(<DataTable columns={columns} rows={rows} getRowKey={(row) => row.id} />)

    await user.tab()
    expect(bodyRows()[0]).not.toHaveFocus()
  })
})
