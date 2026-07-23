import { useState, useMemo } from 'react'
import { Megaphone, X } from 'lucide-react'
import { useGetAnnouncementsQuery, useDismissAnnouncementMutation } from '../../features/core/coreApi'
import Spinner from '../ui/Spinner'

export default function AnnouncementWidget() {
  const { data, isLoading } = useGetAnnouncementsQuery({ limit: 20 })
  const [dismissAnnouncement] = useDismissAnnouncementMutation()
  const [dismissed, setDismissed] = useState(new Set())

  const announcements = useMemo(() => {
    if (!data?.items) return []
    return data.items.filter((a) => !dismissed.has(a.id))
  }, [data, dismissed])

  const handleDismiss = async (id) => {
    setDismissed((prev) => new Set([...prev, id]))
    try {
      await dismissAnnouncement(id).unwrap()
    } catch {
      setDismissed((prev) => { const n = new Set(prev); n.delete(id); return n })
    }
  }

  if (isLoading) return <Spinner size={24} />
  if (announcements.length === 0) return null

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
        <Megaphone size={16} className="text-primary" /> Announcements
      </h2>
      <div className="space-y-2">
        {announcements.map((a) => (
          <div key={a.id} className="relative rounded-card border border-slate-200 bg-white p-3.5 transition-all group">
            <button
              onClick={() => handleDismiss(a.id)}
              className="absolute top-2 right-2 p-1 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
            <div className="flex items-start gap-2.5 pr-6">
              <Megaphone size={16} className="shrink-0 mt-0.5 text-primary" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{a.title}</p>
                <p className="text-xs text-slate-600 whitespace-pre-wrap mt-0.5">{a.description}</p>
                <p className="text-[10px] text-slate-400 mt-1">{new Date(a.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
