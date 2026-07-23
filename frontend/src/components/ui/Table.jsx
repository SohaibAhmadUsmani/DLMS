import { Loader2 } from 'lucide-react'
import clsx from 'clsx'
import EmptyState from './EmptyState'

function SkeletonRow({ columns }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3 border-t border-slate-200">
          <div className="h-4 bg-slate-200 rounded animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  )
}

export default function Table({ columns = [], rows = [], loading, emptyTitle, emptyDescription, className, onRowClick }) {
  if (loading) {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-medium">{col.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonRow key={i} columns={columns.length} />
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (!rows.length) {
    return <EmptyState title={emptyTitle || 'No data'} description={emptyDescription} />
  }

  return (
    <div className="overflow-x-auto">
      <table className={clsx('w-full text-sm text-left', className)}>
        <thead className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
          <tr>
            {columns.map((col) => (
              <th key={col.key} className="px-4 py-3 font-medium">{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(e) => { if (onRowClick && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onRowClick(row) } }}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              className={clsx(
                onRowClick && 'cursor-pointer hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-inset',
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 border-t border-slate-200">
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