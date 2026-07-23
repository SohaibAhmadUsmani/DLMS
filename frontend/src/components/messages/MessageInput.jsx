import { useState } from 'react'
import { Send, Smile, MoreHorizontal, Mic } from 'lucide-react'

export default function MessageInput({ onSend, loading, placeholder }) {
  const [text, setText] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim() || loading) return
    onSend(text.trim())
    setText('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 p-3 border-t border-slate-200 bg-white rounded-br-xl">
      <button
        type="button"
        aria-label="More options"
        className="flex items-center justify-center h-9 w-9 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <MoreHorizontal size={20} />
      </button>
      <button
        type="button"
        aria-label="Emoji"
        className="flex items-center justify-center h-9 w-9 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <Smile size={20} />
      </button>
      <button
        type="button"
        aria-label="Voice message"
        className="flex items-center justify-center h-9 w-9 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
      >
        <Mic size={20} />
      </button>

      <div className="flex-1">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder || 'Type your message here...'}
          aria-label="Message input"
          className="w-full rounded-full border border-slate-300 px-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-slate-50"
        />
      </div>

      <button
        type="submit"
        aria-label="Send message"
        disabled={!text.trim() || loading}
        className="flex items-center justify-center h-10 w-10 rounded-full bg-[#4F46E5] text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shrink-0"
      >
        <Send size={18} />
      </button>
    </form>
  )
}
