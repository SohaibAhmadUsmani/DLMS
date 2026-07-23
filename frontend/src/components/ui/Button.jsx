import { forwardRef } from 'react'
import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

const variants = {
  primary: 'bg-primary text-white hover:bg-indigo-700',
  accent: 'bg-accent text-white hover:bg-amber-600',
  danger: 'bg-danger text-white hover:bg-red-600',
  outline: 'border border-slate-300 text-slate-700 hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
}

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
}

const Button = forwardRef(({ variant = 'primary', size = 'md', loading, disabled, className, children, ...props }, ref) => (
  <button
    ref={ref}
    disabled={disabled || loading}
    className={clsx(
      'inline-flex items-center justify-center gap-2 font-medium rounded-btn transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
      variants[variant],
      sizes[size],
      className,
    )}
    {...props}
  >
    {loading && <Loader2 size={16} className="animate-spin" />}
    {children}
  </button>
))

Button.displayName = 'Button'
export default Button
