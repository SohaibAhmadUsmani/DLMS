import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { useAppSelector } from '../../app/hooks'
import { useSendMessageMutation, useGetMessagesQuery, useGetMyTeachersQuery, useGetMessageThreadQuery, useMarkMessageReadMutation, useReplyToMessageMutation } from '../../features/core/coreApi'
import ChatLayout from '../../components/messages/ChatLayout'
import ConversationList from '../../components/messages/ConversationList'
import ChatThread from '../../components/messages/ChatThread'
import Modal from '../../components/ui/Modal'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import toast from 'react-hot-toast'

export default function StudentMessages() {
  const currentUser = useAppSelector((s) => s.auth.user)
  const currentUserId = currentUser?.id || currentUser?.sub || ''

  const [selectedConv, setSelectedConv] = useState(null)
  const [search, setSearch] = useState('')
  const [showNewMessage, setShowNewMessage] = useState(false)
  const [sendToAdmin, setSendToAdmin] = useState(false)
  const [optimisticMessages, setOptimisticMessages] = useState([])

  const [sendMessage, { isLoading: sending }] = useSendMessageMutation()
  const [replyToMessage, { isLoading: replying }] = useReplyToMessageMutation()
  const [markRead] = useMarkMessageReadMutation()
  const { data, isLoading } = useGetMessagesQuery()
  const { data: teachersData, isLoading: loadingTeachers } = useGetMyTeachersQuery()
  const { data: threadData, isLoading: loadingThread } = useGetMessageThreadQuery(selectedConv?.id, { skip: !selectedConv?.id })

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm()

  const messages = data?.items || []
  const teachers = teachersData?.teachers || []

  const conversations = useMemo(() => {
    const map = {}
    for (const msg of messages) {
      const key = msg.parent_id || msg.id
      if (!map[key] || new Date(msg.created_at) > new Date(map[key].created_at)) {
        const isReceived = msg.recipient_id === currentUserId || (msg.parent_id && msg.sender_id !== currentUserId)
        const contactName = isReceived ? msg.sender_name : (msg.recipient_role === 'admin' ? 'Admin' : msg.recipient_role)
        const unreadCount = messages.filter(
          (m) => (m.parent_id === key || m.id === key) && !m.read && m.sender_id !== currentUserId
        ).length
        map[key] = {
          id: key,
          sender_id: msg.sender_id === currentUserId ? msg.recipient_id : msg.sender_id,
          sender_name: msg.sender_id === currentUserId
            ? (msg.recipient_role === 'admin' ? 'Admin' : msg.sender_name || msg.recipient_role)
            : msg.sender_name,
          subject: msg.subject,
          body: msg.body,
          created_at: msg.created_at,
          last_message_at: msg.created_at,
          unread_count: unreadCount,
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
    try { await markRead(conv.id) } catch {}
  }

  const handleNewMessage = async (form) => {
    try {
      const body = {
        recipient_role: sendToAdmin ? 'admin' : 'teacher',
        recipient_id: sendToAdmin ? '' : form.recipient_id,
        subject: form.subject || 'No subject',
        body: form.body,
      }
      const result = await sendMessage(body).unwrap()
      toast.success('Message sent!')
      setShowNewMessage(false)
      reset()
      setSendToAdmin(false)
      setSelectedConv({ id: result.id, sender_name: sendToAdmin ? 'Admin' : teachers.find(t => t.id === form.recipient_id)?.name || 'Teacher', subject: form.subject, body: form.body, created_at: new Date().toISOString(), unread_count: 0, online: false })
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to send message')
    }
  }

  const handleSendReply = async (text) => {
    if (!selectedConv) return
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_id: currentUserId,
      sender_name: 'You',
      sender_role: 'student',
      body: text,
      created_at: new Date().toISOString(),
      read: true,
    }
    setOptimisticMessages((prev) => [...prev, optimistic])
    try {
      await replyToMessage({ messageId: selectedConv.id, body: { body: text } }).unwrap()
    } catch {
      setOptimisticMessages((prev) => prev.filter((m) => m.id !== optimistic.id))
      toast.error('Failed to send reply')
    }
  }

  return (
    <>
      <ChatLayout
        leftPanel={
          <ConversationList
            conversations={conversations}
            selectedId={selectedConv?.id}
            onSelect={handleSelect}
            onNewMessage={() => { setSendToAdmin(false); setShowNewMessage(true); reset() }}
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
            onSend={handleSendReply}
            sending={sending}
            placeholder="Type your message here..."
          />
        }
      />

      <Modal open={showNewMessage} onClose={() => setShowNewMessage(false)} title="New Message">
        <div className="space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
            <button
              onClick={() => setSendToAdmin(false)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${!sendToAdmin ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Message Teacher
            </button>
            <button
              onClick={() => setSendToAdmin(true)}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors cursor-pointer ${sendToAdmin ? 'border-primary text-primary' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
              Message Admin
            </button>
          </div>

          {sendToAdmin ? (
            <form onSubmit={handleSubmit(handleNewMessage)} className="space-y-4">
              <Input
                label="Subject (optional)"
                placeholder="e.g. Question about account"
                {...register('subject')}
              />
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  {...register('body', { required: 'Message is required' })}
                  rows={4}
                  placeholder="Write your message here..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
                />
                {errors.body && <p className="text-xs text-danger mt-1">{errors.body.message}</p>}
              </div>
              <div className="flex justify-end pt-2">
                <Button type="submit" loading={sending}>
                  Send Message
                </Button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit(handleNewMessage)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select Teacher</label>
                {loadingTeachers ? (
                  <p className="text-sm text-slate-400">Loading teachers...</p>
                ) : teachers.length === 0 ? (
                  <p className="text-sm text-slate-500">No teachers available. You are not enrolled in any courses.</p>
                ) : (
                  <select
                    {...register('recipient_id', { required: 'Select a teacher' })}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  >
                    <option value="">— Select your teacher —</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                )}
                {errors.recipient_id && <p className="text-xs text-danger mt-1">{errors.recipient_id.message}</p>}
              </div>

              <Input
                label="Subject (optional)"
                placeholder="e.g. Question about assignment"
                {...register('subject')}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Message</label>
                <textarea
                  {...register('body', { required: 'Message is required' })}
                  rows={4}
                  placeholder="Write your message here..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
                />
                {errors.body && <p className="text-xs text-danger mt-1">{errors.body.message}</p>}
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" loading={sending}>
                  Send Message
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </>
  )
}
