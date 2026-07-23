import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import { Megaphone, Plus, Edit3, Trash2, SearchX } from 'lucide-react'
import { useGetAnnouncementsQuery, useCreateAnnouncementMutation, useUpdateAnnouncementMutation, useDeleteAnnouncementMutation } from '../../features/core/coreApi'
import { useAppSelector } from '../../app/hooks'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function AdminAnnouncements() {
  const searchTerm = useAppSelector((s) => s.search.term)
  const { data, isLoading } = useGetAnnouncementsQuery({ include_archived: true })
  const [createAnnouncement] = useCreateAnnouncementMutation()
  const [updateAnnouncement] = useUpdateAnnouncementMutation()
  const [deleteAnnouncement] = useDeleteAnnouncementMutation()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState({ title: '', description: '' })

  const announcements = data?.items || []

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return announcements
    const q = searchTerm.toLowerCase()
    return announcements.filter((a) =>
      a.title.toLowerCase().includes(q) || (a.description || '').toLowerCase().includes(q)
    )
  }, [announcements, searchTerm])

  const openCreate = () => {
    setEditTarget(null)
    setForm({ title: '', description: '' })
    setModalOpen(true)
  }

  const openEdit = (a) => {
    setEditTarget(a)
    setForm({ title: a.title || '', description: a.description || '' })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    try {
      const body = { title: form.title.trim(), description: form.description.trim() }
      if (editTarget) {
        await updateAnnouncement({ id: editTarget.id, ...body }).unwrap()
        toast.success('Announcement updated')
      } else {
        await createAnnouncement(body).unwrap()
        toast.success('Announcement created')
      }
      setModalOpen(false)
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to save')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement permanently?')) return
    try {
      await deleteAnnouncement(id).unwrap()
      toast.success('Announcement deleted')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete')
    }
  }

  if (isLoading) return <Spinner size={32} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Announcements</h1>
          <p className="text-sm text-slate-500 mt-0.5">Create and manage announcements for the platform.</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} /> New Announcement</Button>
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editTarget ? 'Edit Announcement' : 'New Announcement'}
        size="md"
      >
        <div className="space-y-4">
          <Input label="Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="Announcement title" />
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              rows={4} placeholder="Write the announcement content..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editTarget ? 'Update' : 'Publish'}</Button>
          </div>
        </div>
      </Modal>

      {announcements.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={Megaphone} title="No announcements" description="Create your first announcement." />
        </CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={SearchX} title="No results" description={`No announcements match "${searchTerm}".`} />
        </CardBody></Card>
      ) : (
        <div className="bg-white border border-slate-200 rounded-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Date</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Announcement</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((a) => (
                <tr key={a.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 py-3 text-slate-400 whitespace-nowrap text-xs">
                    {new Date(a.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{a.title}</p>
                    {a.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{a.description}</p>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(a)}
                        className="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-slate-400 hover:text-danger hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
