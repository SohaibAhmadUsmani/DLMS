import { useState, useRef, useEffect } from 'react'
import { Search, MoreHorizontal } from 'lucide-react'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'

function getInitials(name) {
  return (name || '?').charAt(0).toUpperCase()
}

export default function ChatThread({
  contact,
  messages,
  currentUserId,
  onSend,
  sending,
  placeholder,
}) {
  const scrollRef = useRef(null)
  const [searchOpen, setSearchOpen] = useState(false)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full bg-white rounded-r-xl">
        <p className="text-sm text-slate-400">Select a conversation to start chatting</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white rounded-r-xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
              {contact.avatar_url ? (
                <img src={contact.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
              ) : (
                getInitials(contact.sender_name)
              )}
            </div>
            {contact.online && (
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 border-2 border-white" />
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-800">{contact.sender_name || 'Unknown'}</p>
            {contact.subject && (
              <p className="text-xs text-slate-400">{contact.subject}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setSearchOpen(!searchOpen)}
            aria-label="Search in conversation"
            className="flex items-center justify-center h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <Search size={18} />
          </button>
          <button
            aria-label="More options"
            className="flex items-center justify-center h-8 w-8 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-slate-400">No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.sender_id === currentUserId}
            />
          ))
        )}
      </div>

      <MessageInput onSend={onSend} loading={sending} placeholder={placeholder} />
    </div>
  )
}
