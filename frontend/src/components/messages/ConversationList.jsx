import { useMemo } from 'react'
import { Search, Check, CheckCheck, Plus } from 'lucide-react'
import clsx from 'clsx'

function getInitials(name) {
  return (name || '?').charAt(0).toUpperCase()
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const diffMs = now - d
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just Now'
  if (diffMins < 60) return `${diffMins}m ago`
  const isToday = d.toDateString() === now.toDateString()
  if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  const isThisYear = d.getFullYear() === now.getFullYear()
  if (isThisYear) return d.toLocaleDateString([], { day: '2-digit', month: 'short' })
  return d.toLocaleDateString([], { day: '2-digit', month: 'short', year: '2-digit' })
}

export default function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewMessage,
  search,
  onSearchChange,
  loading,
}) {
  const filtered = useMemo(() => {
    if (!search.trim()) return conversations || []
    const q = search.toLowerCase().trim()
    return (conversations || []).filter((c) =>
      c.sender_name?.toLowerCase().includes(q) ||
      c.subject?.toLowerCase().includes(q) ||
      c.body?.toLowerCase().includes(q)
    )
  }, [conversations, search])

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-l-xl overflow-hidden">
      <div className="p-3 border-b border-slate-200 bg-white">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search"
            aria-label="Search conversations"
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-slate-50"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-12">
            {search ? 'No conversations found' : 'No messages yet'}
          </p>
        ) : (
          filtered.map((conv) => {
            const isSelected = conv.id === selectedId
            const unreadCount = conv.unread_count || 0
            const lastMsgTime = conv.last_message_at || conv.created_at
            const allRead = unreadCount === 0
            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv)}
                className={clsx(
                  'w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-card transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-primary/10 ring-1 ring-primary/30'
                    : 'bg-white hover:bg-slate-50 border border-slate-200/60 shadow-sm'
                )}
              >
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                    {conv.avatar_url ? (
                      <img src={conv.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
                    ) : (
                      getInitials(conv.sender_name)
                    )}
                  </div>
                  {conv.online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-white" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm font-semibold text-slate-800 truncate">
                      {conv.sender_name || 'Unknown'}
                    </span>
                    <span className="text-[11px] text-slate-400 shrink-0">
                      {formatTime(lastMsgTime)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1 mt-0.5">
                    <p className="text-xs text-slate-500 truncate">{conv.body || conv.subject || ''}</p>
                    <div className="flex items-center gap-1 shrink-0">
                      {unreadCount > 0 ? (
                        <>
                          <span className="flex items-center justify-center h-5 min-w-[20px] rounded-full bg-red-500 text-white text-[10px] font-bold px-1">
                            {unreadCount}
                          </span>
                          <Check size={12} className="text-slate-400" />
                        </>
                      ) : (
                        <CheckCheck size={14} className="text-green-500" />
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {onNewMessage && (
        <div className="p-3 border-t border-slate-200 bg-white">
          <button
            onClick={onNewMessage}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary text-white py-2 text-sm font-medium hover:bg-indigo-600 transition-colors cursor-pointer"
          >
            <Plus size={16} /> New Message
          </button>
        </div>
      )}
    </div>
  )
}
