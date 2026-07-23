import { useState, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { Plus, Pencil, Trash2, UserPlus, Upload, X } from 'lucide-react'
import { useAppSelector } from '../../app/hooks'
import { useGetAdminCoursesQuery, useGetAdminUsersQuery, useCreateCourseMutation, useUpdateCourseMutation, useDeleteCourseMutation, useUploadCourseCoverMutation } from '../../features/console/consoleApi'
import { useTeacherEnrollMutation, useApproveCourseMutation } from '../../features/core/coreApi'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import EmptyState from '../../components/ui/EmptyState'
import { format } from 'date-fns'

export default function AdminCourses() {
  const searchTerm = useAppSelector((s) => s.search.term)

  const { data: courses, isLoading, isError, refetch: refetchCourses } = useGetAdminCoursesQuery()
  const { data: usersResp } = useGetAdminUsersQuery()
  const [createCourse, { isLoading: creating }] = useCreateCourseMutation()
  const [updateCourse, { isLoading: updating }] = useUpdateCourseMutation()
  const [deleteCourse, { isLoading: deleting }] = useDeleteCourseMutation()

  const [modalMode, setModalMode] = useState(null)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [enrollTarget, setEnrollTarget] = useState(null)
  const [enrollEmail, setEnrollEmail] = useState('')
  const [form, setForm] = useState({ title: '', description: '', teacher_id: '' })
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const fileInputRef = useRef(null)
  const [pendingId, setPendingId] = useState(null)
  const [approvePendingId, setApprovePendingId] = useState(null)
  const [teacherEnroll, { isLoading: enrolling }] = useTeacherEnrollMutation()
  const [approveCourse, { isLoading: approving }] = useApproveCourseMutation()
  const [uploadCourseCover] = useUploadCourseCoverMutation()

  const teacherMap = useMemo(() => {
    const map = {}
    if (usersResp?.users) {
      usersResp.users.forEach((u) => { map[u.id] = u.name || u.email })
    }
    return map
  }, [usersResp])

  const teacherOpts = useMemo(() => {
    if (!usersResp?.users) return []
    return usersResp.users
      .filter((u) => u.role === 'teacher')
      .map((u) => ({ value: u.id, label: `${u.name} (${u.email})` }))
  }, [usersResp])

  const filteredCourses = useMemo(() => {
    if (!courses) return []
    if (!searchTerm) return courses
    const lower = searchTerm.toLowerCase()
    return courses.filter((c) =>
      c.title.toLowerCase().includes(lower) ||
      c.description?.toLowerCase().includes(lower) ||
      (teacherMap[c.teacher_id] || '').toLowerCase().includes(lower)
    )
  }, [courses, searchTerm, teacherMap])

  const openCreate = () => {
    setModalMode('create')
    setEditTarget(null)
    setCoverFile(null)
    setCoverPreview(null)
    setForm({ title: '', description: '', teacher_id: teacherOpts[0]?.value || '' })
  }

  const openEdit = (course) => {
    setModalMode('edit')
    setEditTarget(course)
    setCoverFile(null)
    setCoverPreview(null)
    setForm({ title: course.title, description: course.description || '', teacher_id: course.teacher_id })
  }

  const handleCoverSelect = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setCoverFile(file)
    setCoverPreview(URL.createObjectURL(file))
  }

  const clearCover = () => {
    setCoverFile(null)
    setCoverPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async (e) => {
    e.preventDefault()
    try {
      let courseId
      if (modalMode === 'create') {
        const created = await createCourse(form).unwrap()
        courseId = created.id
        toast.success('Course created')
      } else {
        await updateCourse({ id: editTarget.id, ...form }).unwrap()
        courseId = editTarget.id
        toast.success('Course updated')
      }
      if (coverFile) {
        const fd = new FormData()
        fd.append('file', coverFile)
        await uploadCourseCover({ id: courseId, formData: fd }).unwrap()
      }
      setModalMode(null)
      setEditTarget(null)
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to save course')
    }
  }

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!enrollEmail.trim()) return
    try {
      await teacherEnroll({ course_id: enrollTarget.id, student_email: enrollEmail.trim() }).unwrap()
      toast.success(`Student enrolled in ${enrollTarget.title}`)
      setEnrollTarget(null)
      setEnrollEmail('')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to enroll student')
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setPendingId(deleteTarget.id)
    try {
      await deleteCourse(deleteTarget.id).unwrap()
      toast.success('Course deleted')
      setDeleteTarget(null)
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete course')
    } finally {
      setPendingId(null)
    }
  }

  const handleApproveAction = async (courseId, action) => {
    setApprovePendingId(courseId)
    try {
      await approveCourse({ course_id: courseId, action }).unwrap()
      toast.success(action === 'approve' ? 'Course approved' : 'Course rejected')
      refetchCourses()
    } catch (err) {
      toast.error(err.data?.detail || `Failed to ${action} course`)
    } finally {
      setApprovePendingId(null)
    }
  }

  const columns = [
    { key: 'title', label: 'Title' },
    {
      key: 'teacher_id',
      label: 'Teacher',
      render: (val) => (
        <span className="text-sm text-slate-700">{teacherMap[val] || val}</span>
      ),
    },
    {
      key: 'is_published',
      label: 'Status',
      render: (val) => (
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ${
          val ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${val ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {val ? 'Published' : 'Draft'}
        </span>
      ),
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (val) => (
        <span className="text-slate-500 text-sm">
          {val ? format(new Date(val), 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, row) => {
        const isBusy = approvePendingId === row.id && approving
        return (
          <div className="flex items-center gap-2">
            {!row.is_published && (
              <>
                <Button size="sm" loading={isBusy} onClick={() => handleApproveAction(row.id, 'approve')}>
                  Approve
                </Button>
                <Button variant="outline" size="sm" loading={isBusy} onClick={() => handleApproveAction(row.id, 'reject')}>
                  Reject
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
              <Pencil size={14} /> Edit
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEnrollTarget(row)}>
              <UserPlus size={14} className="text-primary" />
            </Button>
            <Button variant="danger" size="sm" loading={pendingId === row.id && deleting} onClick={() => setDeleteTarget(row)}>
              <Trash2 size={14} /> Delete
            </Button>
          </div>
        )
      },
    },
  ]

  if (isError) {
    return (
      <Card><CardBody>
        <EmptyState title="Failed to load courses" description="Could not reach the server." />
      </CardBody></Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-lg font-semibold text-slate-800">All Courses</h2>
            <Button onClick={openCreate}>
              <Plus size={16} /> New Course
            </Button>
          </div>
        </CardHeader>
        <CardBody>
          <Table
            columns={columns}
            rows={filteredCourses}
            loading={isLoading}
            emptyTitle={searchTerm ? 'No matching courses' : 'No courses yet'}
            emptyDescription={searchTerm ? 'Try a different search term.' : 'No courses have been created.'}
          />
        </CardBody>
      </Card>

      <Modal
        open={modalMode !== null}
        onClose={() => { setModalMode(null); setEditTarget(null) }}
        title={modalMode === 'create' ? 'Create Course' : 'Edit Course'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              aria-label="Description"
            />
          </div>
          <Select
            label="Teacher"
            options={teacherOpts}
            value={form.teacher_id}
            onChange={(e) => setForm({ ...form, teacher_id: e.target.value })}
            placeholder="Select teacher"
          />
          {/* Cover image */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cover Image</label>
            {coverPreview ? (
              <div className="relative h-32 rounded-card overflow-hidden border border-slate-200 mb-2">
                <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={clearCover}
                  className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-slate-600 hover:bg-white transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            ) : editTarget && editTarget.cover_image ? (
              <div className="relative h-32 rounded-card overflow-hidden border border-slate-200 mb-2">
                <img src={editTarget.cover_image} alt="Current cover" className="w-full h-full object-cover" />
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full inline-flex items-center justify-center gap-2 rounded-btn border border-dashed border-slate-300 px-3 py-2 text-sm text-slate-500 hover:border-primary hover:text-primary transition-colors cursor-pointer"
            >
              <Upload size={14} />
              {coverPreview ? 'Change image' : 'Upload cover image'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverSelect}
              className="hidden"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setModalMode(null); setEditTarget(null) }}>Cancel</Button>
            <Button type="submit" loading={creating || updating}>
              {modalMode === 'create' ? 'Create' : 'Save'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Confirm Deletion"
      >
        <p className="text-sm text-slate-600 mb-6">
          Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" loading={pendingId === deleteTarget?.id && deleting} onClick={handleDelete}>
            Delete Course
          </Button>
        </div>
      </Modal>

      <Modal
        open={!!enrollTarget}
        onClose={() => { setEnrollTarget(null); setEnrollEmail('') }}
        title={`Enroll Student in ${enrollTarget?.title || ''}`}
      >
        <form onSubmit={handleEnroll} className="space-y-4">
          <Input
            label="Student Email"
            type="email"
            placeholder="student@example.com"
            value={enrollEmail}
            onChange={(e) => setEnrollEmail(e.target.value)}
            required
          />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" type="button" onClick={() => { setEnrollTarget(null); setEnrollEmail('') }}>Cancel</Button>
            <Button type="submit" loading={enrolling}>Enroll</Button>
          </div>
        </form>
      </Modal>
    </>
  )
}
