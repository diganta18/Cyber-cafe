import Spinner from './Spinner'
import { SearchX } from 'lucide-react'

export default function Table({ columns, data, loading, emptyMessage = 'No data found.', keyField = 'id', onRowClick }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-20 px-6">
        <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-[#ECE4A9] border-2 border-[#2A2407] shadow-[2px_2px_0px_#2A2407] mb-4">
          <SearchX className="h-6 w-6 text-ink" />
        </div>
        <p className="text-sm font-bold text-ink-muted">{emptyMessage}</p>
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
        <tbody>
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
