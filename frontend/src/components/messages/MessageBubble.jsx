function getInitials(name) {
  return (name || '?').charAt(0).toUpperCase()
}

function formatTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function formatDateTime(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const now = new Date()
  const isToday = d.toDateString() === now.toDateString()
  const datePart = isToday
    ? ''
    : d.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' '
  return datePart + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export default function MessageBubble({ message, isOwn, userAvatar }) {
  return (
    <div className={`flex items-end gap-2 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <div className="shrink-0 h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-semibold text-primary">
        {userAvatar ? (
          <img src={userAvatar} alt="" className="h-full w-full rounded-full object-cover" />
        ) : (
          getInitials(message.sender_name)
        )}
      </div>

      <div className={`max-w-[70%] ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
        <div className="flex items-center gap-2 mb-0.5">
          {!isOwn && (
            <>
              <span className="text-[11px] font-medium text-slate-500">{message.sender_name}</span>
              <span className="text-[10px] text-slate-400">{formatDateTime(message.created_at)}</span>
            </>
          )}
          {isOwn && (
            <>
              <span className="text-[10px] text-slate-400">{formatDateTime(message.created_at)}</span>
              <span className="text-[11px] font-medium text-slate-500">You</span>
            </>
          )}
        </div>

        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
            isOwn
              ? 'bg-[#4F46E5] text-white rounded-br-md'
              : 'bg-slate-100 text-slate-800 rounded-bl-md'
          }`}
        >
          {message.body}
        </div>
      </div>
    </div>
  )
}
