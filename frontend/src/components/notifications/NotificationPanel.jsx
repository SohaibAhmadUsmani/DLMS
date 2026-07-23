import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, X, Loader, ExternalLink } from 'lucide-react'
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} from '../../features/core/coreApi'
import { useAppSelector } from '../../app/hooks'

export default function NotificationPanel() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const role = useAppSelector((s) => s.auth.role)

  const { data: unreadData } = useGetUnreadCountQuery(undefined, { pollingInterval: 5000 })
  const { data: notifsData, isLoading } = useGetNotificationsQuery({ limit: 10 }, { skip: !open })
  const [markRead] = useMarkNotificationReadMutation()
  const [markAllRead] = useMarkAllNotificationsReadMutation()

  const unread = unreadData?.count ?? 0

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleItemClick = useCallback(async (n) => {
    if (!n.read) await markRead(n.id)
    setOpen(false)
    if (n.link) {
      const link = n.link.startsWith('/messages')
        ? `${getDashboardBase()}/messages`
        : `${getDashboardBase()}${n.link}`
      navigate(link)
    }
  }, [markRead, navigate])

  const handleMarkAll = useCallback(async () => {
    await markAllRead()
  }, [markAllRead])

  const getDashboardBase = () => {
    if (role === 'admin') return '/admin'
    if (role === 'teacher') return '/teacher'
    return '/student'
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        className="relative text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-full p-2 bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white border border-slate-200 rounded-card shadow-lg z-50 max-h-96 flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unread > 0 && (
              <button
                onClick={handleMarkAll}
                className="text-xs text-primary hover:text-indigo-700 flex items-center gap-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader size={20} className="text-slate-400 animate-spin" />
              </div>
            ) : !notifsData?.items?.length ? (
              <div className="py-8 text-center text-sm text-slate-400">
                <Bell size={24} className="mx-auto mb-2 text-slate-300" />
                No notifications yet
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {notifsData.items.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleItemClick(n)}
                    className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${
                      !n.read ? 'bg-indigo-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${n.read ? 'bg-transparent' : 'bg-primary'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-800 truncate">{n.title}</p>
                        {n.message && (
                          <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-slate-400">
                            {n.created_at ? new Date(n.created_at).toLocaleDateString() : ''}
                          </span>
                          {n.link && (
                            <span className="text-[10px] text-primary flex items-center gap-0.5">
                              <ExternalLink size={10} /> View
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 px-4 py-2 shrink-0">
            <button
              onClick={() => { setOpen(false); navigate(`${getDashboardBase()}`) }}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-700 py-1 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
