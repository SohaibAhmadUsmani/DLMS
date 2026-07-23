import clsx from 'clsx'

export default function Card({ title, headerExtra, className, children, ...props }) {
  return (
    <div className={clsx('bg-white border border-slate-200 rounded-card shadow-sm overflow-hidden', className)} {...props}>
      {title && (
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-800">{title}</h3>
          {headerExtra && <div>{headerExtra}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }) {
  return (
    <div className={clsx('px-6 py-4 border-b border-slate-200', className)} {...props}>
      {children}
    </div>
  )
}

export function CardBody({ className, children, ...props }) {
  return (
    <div className={clsx('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
}
