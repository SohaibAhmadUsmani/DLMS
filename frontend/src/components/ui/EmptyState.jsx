import { Inbox } from 'lucide-react'

export default function EmptyState({ icon: Icon = Inbox, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Icon size={48} className="text-slate-300 mb-4" />
      <h3 className="text-lg font-medium text-slate-700">{title || 'No data'}</h3>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
  )
}
