import clsx from 'clsx'

const badgeVariants = {
  neutral: 'bg-slate-100 text-slate-700',
  success: 'bg-teal-50 text-teal-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
}

export default function Badge({ variant = 'neutral', className, children }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        badgeVariants[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}
