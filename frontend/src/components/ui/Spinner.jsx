import { Loader2 } from 'lucide-react'
import clsx from 'clsx'

export default function Spinner({ size = 24, className }) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 size={size} className={clsx('animate-spin text-primary', className)} />
    </div>
  )
}

export function InlineSpinner({ size = 16, className }) {
  return <Loader2 size={size} className={clsx('animate-spin text-primary', className)} />
}
