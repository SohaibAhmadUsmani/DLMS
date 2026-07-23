import { useState, useMemo } from 'react'
import { useAppSelector } from '../../app/hooks'
import { useGetMessagesQuery, useGetMessageThreadQuery, useMarkMessageReadMutation, useReplyToMessageMutation } from '../../features/core/coreApi'
import ChatLayout from '../../components/messages/ChatLayout'
import ConversationList from '../../components/messages/ConversationList'
import ChatThread from '../../components/messages/ChatThread'
import toast from 'react-hot-toast'

export default function TeacherMessages() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const currentUserId = currentUser?.id || currentUser?.sub || ''

  const { data, isLoading } = useGetMessagesQuery()
  const [selectedConv, setSelectedConv] = useState(null)
  const [search, setSearch] = useState('')
  const [markRead] = useMarkMessageReadMutation()
  const [replyToMessage, { isLoading: replying }] = useReplyToMessageMutation()
  const [optimisticMessages, setOptimisticMessages] = useState([])

  const { data: threadData, isLoading: loadingThread } = useGetMessageThreadQuery(selectedConv?.id, { skip: !selectedConv?.id })

  const messages = data?.items || []

  const conversations = useMemo(() => {
    const map = {}
    for (const msg of messages) {
      if (!msg.parent_id) {
        const unreadCount = messages.filter(
          (m) => (m.parent_id === msg.id || m.id === msg.id) && !m.read && m.sender_id !== currentUserId
        ).length
        map[msg.id] = {
          ...msg,
          unread_count: unreadCount,
          last_message_at: msg.created_at,
          online: false,
        }
      }
    }
    return Object.values(map).sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at))
  }, [messages, currentUserId])

  const threadMessages = useMemo(() => {
    const base = threadData?.thread || []
    return [...base, ...optimisticMessages]
  }, [threadData, optimisticMessages])

  const handleSelect = async (conv) => {
    setSelectedConv(conv)
    setOptimisticMessages([])
    if (!conv.read) {
      try { await markRead(conv.id) } catch {}
    }
  }

  const handleSend = async (text) => {
    if (!selectedConv) return
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: currentUserId,
      sender_name: 'You',
      sender_role: 'teacher',
      body: text,
      created_at: new Date().toISOString(),
      read: true,
    }
    setOptimisticMessages((prev) => [...prev, optimistic])
    try {
      await replyToMessage({ messageId: selectedConv.id, body: { body: text } }).unwrap()
    } catch (err) {
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      toast.error(err.data?.detail || 'Failed to send reply')
    }
  }

  return (
    <ChatLayout
      leftPanel={
        <ConversationList
          conversations={conversations}
          selectedId={selectedConv?.id}
          onSelect={handleSelect}
          search={search}
          onSearchChange={setSearch}
          loading={isLoading}
        />
      }
      rightPanel={
        <ChatThread
          contact={selectedConv}
          messages={threadMessages}
          currentUserId={currentUserId}
          onSend={handleSend}
          sending={replying}
          placeholder="Type your reply here..."
        />
      }
    />
  )
}
