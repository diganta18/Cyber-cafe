import Spinner from './Spinner'
import { SearchX } from 'lucide-react'

export default function Table({ columns, data, loading, emptyMessage = 'No data found.', keyField = 'id', onRowClick }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-16">
        <SearchX className="h-10 w-10 mx-auto mb-3 text-ink-muted opacity-40" />
        <p className="text-sm text-ink-muted">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="table-container">
      <table className="table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="th" style={col.width ? { width: col.width } : {}}>
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {data.map((row) => (
            <tr
              key={row[keyField]}
              className={`tr ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} className="td">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
