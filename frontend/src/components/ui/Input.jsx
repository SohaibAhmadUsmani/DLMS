import { forwardRef } from 'react'
import clsx from 'clsx'

const Input = forwardRef(({ label, error, className, ...props }, ref) => (
  <div className="w-full">
    {label && (
      <label className="block text-sm font-medium text-slate-700 mb-1">
        {label}
      </label>
    )}
    <input
      ref={ref}
      className={clsx(
        'w-full rounded-btn border px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
        error ? 'border-danger' : 'border-slate-300',
        className,
      )}
      {...props}
    />
    {error && <p className="mt-1 text-xs text-danger">{error}</p>}
  </div>
))

Input.displayName = 'Input'
export default Input
