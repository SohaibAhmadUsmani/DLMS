import { useState, useMemo, useEffect, useCallback } from 'react'
import toast from 'react-hot-toast'
import { Calendar, Plus, Trash2, Clock, MapPin, User, BookOpen, ChevronDown, ChevronUp, Edit3, Save, X } from 'lucide-react'
import { useGetAdminClassesQuery, useCreateClassMutation, useUpdateClassMutation, useDeleteClassMutation } from '../../features/core/coreApi'
import { useGetAdminUsersQuery, useGetAdminCoursesQuery } from '../../features/console/consoleApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]

const DAY_ABBR = { Monday: 'Mon', Tuesday: 'Tue', Wednesday: 'Wed', Thursday: 'Thu', Friday: 'Fri' }

function emptySlot() {
  return { day: 'Monday', room: '', start_time: '08:00', end_time: '08:50' }
}

const dayColors = {
  Monday: 'bg-blue-50 text-blue-700 border-blue-200',
  Tuesday: 'bg-purple-50 text-purple-700 border-purple-200',
  Wednesday: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Thursday: 'bg-amber-50 text-amber-700 border-amber-200',
  Friday: 'bg-rose-50 text-rose-700 border-rose-200',
}

export default function AdminClasses() {
  const { data: classesData, isLoading } = useGetAdminClassesQuery()
  const { data: usersData } = useGetAdminUsersQuery()
  const { data: coursesData } = useGetAdminCoursesQuery()
  const [createClass, { isLoading: creating }] = useCreateClassMutation()
  const [updateClass, { isLoading: updating }] = useUpdateClassMutation()
  const [deleteClass, { isLoading: deleting }] = useDeleteClassMutation()
  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [expanded, setExpanded] = useState(null)

  const [form, setForm] = useState({
    teacher_id: '', course_id: '', title: '', class_code: '', slots: [emptySlot()],
  })

  const classes = classesData?.items || []
  const teachers = useMemo(() => (usersData?.users || []).filter((u) => u.role === 'teacher'), [usersData])
  const courses = coursesData || []

  useEffect(() => {
    if (editTarget) {
      const slots = (editTarget.slots || []).length > 0 ? editTarget.slots : [emptySlot()]
      setForm({
        teacher_id: editTarget.teacher_id || '',
        course_id: editTarget.course_id || '',
        title: editTarget.title || '',
        class_code: editTarget.class_code || '',
        slots,
      })
    } else {
      setForm({ teacher_id: '', course_id: '', title: '', class_code: '', slots: [emptySlot()] })
    }
  }, [editTarget])

  const openCreate = () => { setEditTarget(null); setModalOpen(true) }
  const openEdit = (c) => { setEditTarget(c); setModalOpen(true) }
  const closeModal = () => { setModalOpen(false); setEditTarget(null) }

  const updateSlot = useCallback((idx, key, value) => {
    setForm((prev) => {
      const slots = prev.slots.map((s, i) => (i === idx ? { ...s, [key]: value } : s))
      return { ...prev, slots }
    })
  }, [])

  const addSlot = useCallback(() => {
    setForm((prev) => ({ ...prev, slots: [...prev.slots, emptySlot()] }))
  }, [])

  const removeSlot = useCallback((idx) => {
    setForm((prev) => {
      if (prev.slots.length <= 1) return prev
      return { ...prev, slots: prev.slots.filter((_, i) => i !== idx) }
    })
  }, [])

  const handleSave = async () => {
    const slots = form.slots.filter((s) => s.day && s.room && s.room.trim().length > 0)
    if (slots.length === 0) {
      toast.error('Add at least one slot with day and room')
      return
    }
    if (!form.teacher_id) {
      toast.error('Select a teacher')
      return
    }

    const body = {
      teacher_id: form.teacher_id,
      course_id: form.course_id || undefined,
      title: form.title,
      class_code: form.class_code,
      slots,
    }

    try {
      if (editTarget) {
        await updateClass({ id: editTarget.id, ...body }).unwrap()
        toast.success('Class updated')
      } else {
        await createClass(body).unwrap()
        toast.success('Class created')
      }
      closeModal()
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to save class')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this class?')) return
    try {
      await deleteClass(id).unwrap()
      toast.success('Class deleted')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Class Schedule</h1>
          <p className="text-sm text-slate-500 mt-0.5">Schedule classes with multiple day/room/time slots.</p>
        </div>
        <Button size="sm" onClick={openCreate}><Plus size={14} /> Schedule Class</Button>
      </div>

      <Modal open={modalOpen} onClose={closeModal} title={editTarget ? 'Edit Class' : 'Schedule a New Class'} size="lg">
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Teacher <span className="text-danger">*</span></label>
              <select value={form.teacher_id} onChange={(e) => setForm((p) => ({ ...p, teacher_id: e.target.value }))}
                className="w-full rounded-card border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">— Select teacher —</option>
                {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Course</label>
              <select value={form.course_id} onChange={(e) => setForm((p) => ({ ...p, course_id: e.target.value }))}
                className="w-full rounded-card border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="">— Optional —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Slots <span className="text-danger">*</span></label>
            <div className="space-y-3">
              {form.slots.map((slot, idx) => (
                <div key={idx} className="relative flex items-start gap-3 p-3 border border-slate-200 rounded-card bg-white">
                  {form.slots.length > 1 && (
                    <button type="button" onClick={() => removeSlot(idx)}
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-danger text-white flex items-center justify-center hover:bg-red-600 transition-colors cursor-pointer"
                      aria-label="Remove slot"
                    ><X size={14} /></button>
                  )}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Day</label>
                      <select value={slot.day} onChange={(e) => updateSlot(idx, 'day', e.target.value)}
                        className="w-full rounded-card border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                      >
                        {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Room</label>
                      <div className="flex items-center gap-1.5 border border-slate-300 rounded-card px-2.5 py-2 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary">
                        <MapPin size={14} className="text-slate-400 shrink-0" />
                        <input type="text" value={slot.room} onChange={(e) => updateSlot(idx, 'room', e.target.value)}
                          placeholder="Enter room" className="flex-1 text-sm text-slate-800 placeholder-slate-400 focus:outline-none bg-transparent" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Start Time</label>
                      <input type="time" value={slot.start_time} onChange={(e) => updateSlot(idx, 'start_time', e.target.value)}
                        className="w-full rounded-card border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">End Time</label>
                      <input type="time" value={slot.end_time} onChange={(e) => updateSlot(idx, 'end_time', e.target.value)}
                        className="w-full rounded-card border border-slate-300 px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <button type="button" onClick={addSlot}
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:text-amber-600 transition-colors cursor-pointer"
            ><Plus size={16} /> Add Slot</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Title</label>
              <input type="text" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                placeholder="e.g. UI/UX Design" className="w-full rounded-card border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Class Code</label>
              <input type="text" value={form.class_code} onChange={(e) => setForm((p) => ({ ...p, class_code: e.target.value }))}
                placeholder="e.g. CLASS01" className="w-full rounded-card border border-slate-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button onClick={handleSave} loading={creating || updating}>
              <Save size={14} /> {editTarget ? 'Update Class' : 'Schedule Class'}
            </Button>
          </div>
        </div>
      </Modal>

      {isLoading ? (
        <Spinner size={32} />
      ) : classes.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={Calendar} title="No classes scheduled" description="Schedule a class to get started." />
        </CardBody></Card>
      ) : (
        <div className="space-y-3">
          {classes.map((c) => {
            const slots = c.slots || []
            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-card overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <div className="p-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {[...new Set(slots.map((s) => s.day).filter(Boolean))].map((day) => {
                        const count = slots.filter((s) => s.day === day).length
                        const dc = dayColors[day] || 'bg-slate-50 text-slate-700 border-slate-200'
                        return (
                          <span key={day} className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${dc}`}>
                            {DAY_ABBR[day] || day.slice(0, 3)} ({count}sl)
                          </span>
                        )
                      })}
                      {c.course_name && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                          <BookOpen size={10} /> {c.course_name}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-semibold text-slate-800">{c.title || c.course_name || 'Scheduled Class'}</h3>
                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-xs text-slate-500">
                      <span className="flex items-center gap-1.5"><User size={13} className="text-slate-400" /><span className="font-medium text-slate-700">{c.teacher_name}</span></span>
                      <span className="flex items-center gap-1.5"><Clock size={13} className="text-slate-400" />{slots.length} slot{slots.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => setExpanded(expanded === c.id ? null : c.id)}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-card transition-colors cursor-pointer">
                      {expanded === c.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <button onClick={() => openEdit(c)}
                      className="p-2 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-card transition-colors cursor-pointer">
                      <Edit3 size={16} />
                    </button>
                    <button onClick={() => handleDelete(c.id)} disabled={deleting}
                      className="p-2 text-slate-400 hover:text-danger hover:bg-red-50 rounded-card transition-colors cursor-pointer disabled:opacity-50">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                {expanded === c.id && slots.length > 0 && (
                  <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {slots.map((s, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-card p-3 flex items-start gap-2">
                          <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${dayColors[s.day]?.split(' ')[1] || 'bg-slate-400'}`} />
                          <div className="text-xs text-slate-600 space-y-0.5">
                            <span className="font-semibold text-slate-700">{s.day}</span>
                            <div className="flex items-center gap-1.5"><MapPin size={10} className="text-slate-400" /> {s.room}</div>
                            <div className="flex items-center gap-1.5"><Clock size={10} className="text-slate-400" /> {s.start_time} — {s.end_time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
