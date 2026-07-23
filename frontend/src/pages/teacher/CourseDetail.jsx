import { useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Pencil, Trash2, FileText, Megaphone, ClipboardList, HelpCircle, Upload, File as FileIcon, Video, Link, BookOpen, Users, X } from 'lucide-react'
import {
  useGetCourseDetailQuery,
  useUpdateCourseMutation,
  useGetCourseAnnouncementsQuery,
  useCreateAnnouncementMutation,
  useGetCourseAssignmentsQuery,
  useCreateAssignmentMutation,
  useUpdateAssignmentMutation,
  useUploadAssignmentMaterialMutation,
} from '../../features/console/consoleApi'
import {
  useGetCourseQuizzesQuery,
  useGetCourseMaterialsQuery,
  useUploadCourseMaterialMutation,
  useDeleteMaterialMutation,
  useTeacherEnrollMutation,
  useGetCourseStudentsQuery,
} from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Modal from '../../components/ui/Modal'

const TABS = [
  { key: 'materials', label: 'Materials', icon: FileText },
  { key: 'announcements', label: 'Announcements', icon: Megaphone },
  { key: 'assignments', label: 'Assignments', icon: ClipboardList },
  { key: 'quizzes', label: 'Quizzes', icon: HelpCircle },
  { key: 'students', label: 'Students', icon: Users },
]

const MATERIAL_TYPE_OPTIONS = [
  { value: 'video', label: 'Video File', icon: Video },
  { value: 'youtube', label: 'YouTube Link', icon: Link },
  { value: 'reading', label: 'Reading Material', icon: BookOpen },
  { value: 'other', label: 'Other File', icon: FileIcon },
]

function MaterialsTab({ courseId }) {
  const { data: materials, isLoading } = useGetCourseMaterialsQuery(courseId)
  const [uploadMaterial, { isLoading: uploading }] = useUploadCourseMaterialMutation()
  const [deleteMaterial] = useDeleteMaterialMutation()

  const [showForm, setShowForm] = useState(false)
  const [materialType, setMaterialType] = useState('video')
  const [title, setTitle] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [readingContent, setReadingContent] = useState('')
  const fileRef = useRef()

  const resetForm = () => {
    setTitle('')
    setYoutubeUrl('')
    setReadingContent('')
    setMaterialType('video')
    if (fileRef.current) fileRef.current.value = ''
  }

  const handleUpload = async () => {
    if (!title.trim()) { toast.error('Title is required'); return }

    const formData = new FormData()
    formData.append('title', title.trim())
    formData.append('file_type', materialType)

    if (materialType === 'youtube') {
      if (!youtubeUrl.trim()) { toast.error('YouTube URL is required'); return }
      formData.append('youtube_url', youtubeUrl.trim())
    } else if (materialType === 'reading') {
      if (!readingContent.trim()) { toast.error('Reading content is required'); return }
      formData.append('content', readingContent.trim())
      const file = fileRef.current?.files?.[0]
      if (file) formData.append('file', file)
    } else {
      const file = fileRef.current?.files?.[0]
      if (!file) { toast.error('Please select a file'); return }
      formData.append('file', file)
    }

    try {
      await uploadMaterial({ courseId, formData }).unwrap()
      toast.success('Material uploaded')
      resetForm()
      setShowForm(false)
    } catch (err) {
      toast.error(err.data?.detail || 'Upload failed')
    }
  }

  const handleDelete = async (materialId, name) => {
    if (!window.confirm(`Delete "${name}"?`)) return
    try {
      await deleteMaterial(materialId).unwrap()
      toast.success('Material deleted')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete material')
    }
  }

  const materialIcon = (type) => {
    switch (type) {
      case 'video': return <Video size={16} className="text-indigo-500" />
      case 'youtube': return <Link size={16} className="text-red-500" />
      case 'reading': return <BookOpen size={16} className="text-emerald-500" />
      default: return <FileIcon size={16} className="text-slate-500" />
    }
  }

  const typeLabel = (type) => {
    const opt = MATERIAL_TYPE_OPTIONS.find(o => o.value === type)
    return opt?.label || type
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          {materials ? `${materials.length} material${materials.length !== 1 ? 's' : ''}` : ''}
        </p>
        {!showForm && (
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} /> Add Material
          </Button>
        )}
      </div>

      {showForm && (
        <div className="border border-indigo-200 rounded-card p-4 space-y-3 bg-indigo-50/50">
          <Input
            placeholder="Material title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">Type</label>
            <div className="flex flex-wrap gap-2">
              {MATERIAL_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setMaterialType(opt.value)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    materialType === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  <opt.icon size={13} />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {materialType === 'youtube' && (
            <Input
              placeholder="https://www.youtube.com/watch?v=..."
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
            />
          )}

          {materialType === 'reading' && (
            <div>
              <textarea
                value={readingContent}
                onChange={(e) => setReadingContent(e.target.value)}
                placeholder="Write your reading material content here..."
                rows={6}
                className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[120px] resize-y"
              />
              <div className="mt-2">
                <p className="text-xs text-slate-400 mb-1">Optional: attach a downloadable resource</p>
                <input
                  ref={fileRef}
                  type="file"
                  aria-label="Attach resource file"
                  className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-btn file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-primary hover:file:bg-indigo-100"
                />
              </div>
            </div>
          )}

          {(materialType === 'video' || materialType === 'other') && (
            <div>
              <p className="text-xs text-slate-400 mb-1">Select file</p>
              <input
                ref={fileRef}
                type="file"
                accept={materialType === 'video' ? 'video/*' : '*'}
                aria-label="Select material file"
                className="block w-full text-sm text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-btn file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-primary hover:file:bg-indigo-100"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" onClick={handleUpload} loading={uploading}>
              <Upload size={14} /> Upload
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { resetForm(); setShowForm(false) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Spinner size={28} />
      ) : !materials || materials.length === 0 ? (
        <EmptyState icon={FileText} title="No materials yet" description="Add video, YouTube links, or reading material for your course." />
      ) : (
        <div className="space-y-2">
          {materials.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-3 px-4 border border-slate-200 rounded-card">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {materialIcon(m.file_type)}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{m.title}</p>
                  <p className="text-xs text-slate-400">{typeLabel(m.file_type)}{m.file_type === 'reading' && m.content ? ' · ' + m.content.length + ' chars' : ''}</p>
                </div>
              </div>
              <button
                onClick={() => handleDelete(m.id, m.title)}
                aria-label={`Delete ${m.title}`}
                className="p-1.5 text-slate-400 hover:text-danger rounded hover:bg-red-50 transition-colors shrink-0 ml-2 cursor-pointer"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StudentsTab({ courseId }) {
  const { data: studentsData, isLoading } = useGetCourseStudentsQuery(courseId)
  const students = studentsData?.students || []

  if (isLoading) return <Spinner size={28} />

  return (
    <div className="space-y-3">
      {students.length === 0 ? (
        <EmptyState icon={Users} title="No enrolled students" description="Students need to enroll in this course first." />
      ) : (
        <div className="divide-y divide-slate-100 bg-white border border-slate-200 rounded-card">
          {students.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                  {s.name?.charAt(0) || 'S'}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.email}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="text-xs text-slate-400">{students.length} student{students.length !== 1 ? 's' : ''} enrolled</p>
    </div>
  )
}

function AnnouncementsTab({ courseId }) {
  const { data: announcements, isLoading } = useGetCourseAnnouncementsQuery(courseId)
  const [createAnnouncement] = useCreateAnnouncementMutation()
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      await createAnnouncement({ courseId, ...data }).unwrap()
      toast.success('Announcement posted')
      reset()
      setShowForm(false)
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to post announcement')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      {!showForm ? (
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus size={14} /> New Announcement
        </Button>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="border border-indigo-200 rounded-card p-4 space-y-3 bg-indigo-50/50">
          <Input
            placeholder="Announcement title"
            error={errors.title?.message}
            {...register('title', { required: 'Title is required' })}
          />
          <div className="w-full">
            <textarea
              className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[80px] resize-y"
              placeholder="Write your announcement..."
              aria-label="Announcement body"
              {...register('body', { required: 'Content is required' })}
            />
            {errors.body && <p className="mt-1 text-xs text-danger">{errors.body.message}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" loading={saving}>Post</Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => { reset(); setShowForm(false) }}>Cancel</Button>
          </div>
        </form>
      )}

      {isLoading ? (
        <Spinner size={28} />
      ) : !announcements || announcements.length === 0 ? (
        <EmptyState icon={Megaphone} title="No announcements yet" description="Post the first announcement for this course." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <div key={a.id} className="py-3 px-4 border border-slate-200 rounded-card">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-slate-800">{a.title}</p>
                {a.created_at && <span className="text-xs text-slate-400 shrink-0">{new Date(a.created_at).toLocaleDateString()}</span>}
              </div>
              {a.body && <p className="text-xs text-slate-500 mt-1">{a.body}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const SECTION_OPTIONS = ['A', 'B']

function AssignmentsTab({ courseId }) {
  const navigate = useNavigate()
  const { data: assignments, isLoading } = useGetCourseAssignmentsQuery(courseId)
  const [createAssignment, { isLoading: creating }] = useCreateAssignmentMutation()
  const [updateAssignment, { isLoading: updating }] = useUpdateAssignmentMutation()
  const [uploadMaterial] = useUploadAssignmentMaterialMutation()

  const [modalOpen, setModalOpen] = useState(false)
  const [editAssignment, setEditAssignment] = useState(null)
  const fileRef = useRef()

  const [section, setSection] = useState('')
  const [assignmentNo, setAssignmentNo] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [status, setStatus] = useState('draft')
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})

  const resetForm = () => {
    setSection('')
    setAssignmentNo('')
    setTitle('')
    setDescription('')
    setInstructions('')
    setDueDate('')
    setStatus('draft')
    setFile(null)
    setErrors({})
    setEditAssignment(null)
  }

  const openCreate = () => {
    resetForm()
    setModalOpen(true)
  }

  const openEdit = (a) => {
    setEditAssignment(a)
    setSection(a.section || '')
    setAssignmentNo(a.assignment_no || '')
    setTitle(a.title || '')
    setDescription(a.description || '')
    setInstructions(a.instructions || '')
    setDueDate(a.due_date ? a.due_date.slice(0, 10) : '')
    setStatus(a.status || 'draft')
    setFile(null)
    setErrors({})
    setModalOpen(true)
  }

  const closeModal = () => {
    resetForm()
    setModalOpen(false)
  }

  const validate = () => {
    const errs = {}
    if (!section) errs.section = 'Section is required'
    if (!assignmentNo) errs.assignmentNo = 'Assignment No is required'
    if (!title.trim()) errs.title = 'Title is required'
    if (!instructions.trim()) errs.instructions = 'Instructions are required'
    if (!dueDate) errs.dueDate = 'Due date is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    const body = {
      title: title.trim(),
      description: description.trim(),
      instructions: instructions.trim(),
      due_date: new Date(dueDate).toISOString(),
      max_score: 100,
      section,
      assignment_no: assignmentNo.trim(),
      status,
    }

    try {
      let result
      if (editAssignment) {
        result = await updateAssignment({ id: editAssignment.id, ...body }).unwrap()
        toast.success('Assignment updated')
      } else {
        result = await createAssignment({ courseId, ...body }).unwrap()
        toast.success('Assignment created')
      }
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        await uploadMaterial({ id: result.id || result._id, formData }).unwrap()
      }
      closeModal()
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to save assignment')
    }
  }

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date()

  return (
    <div className="space-y-4">
      <div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={14} /> Create Assignment
        </Button>
      </div>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editAssignment ? 'Edit Assignment' : 'Create Assignment'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Section <span className="text-danger">*</span>
              </label>
              <select
                value={section}
                onChange={(e) => { setSection(e.target.value); setErrors((p) => ({ ...p, section: '' })) }}
              className={`w-full rounded-btn border ${errors.section ? 'border-danger' : 'border-slate-300'} px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary`}
            >
              <option value="">Select section</option>
              {SECTION_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {errors.section && <p className="mt-1 text-xs text-danger">{errors.section}</p>}
          </div>
          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assignment No <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={assignmentNo}
              onChange={(e) => { setAssignmentNo(e.target.value); setErrors((p) => ({ ...p, assignmentNo: '' })) }}
              placeholder="e.g. Assignment 01"
              className={`w-full rounded-btn border ${errors.assignmentNo ? 'border-danger' : 'border-slate-300'} px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary`}
              />
              {errors.assignmentNo && <p className="mt-1 text-xs text-danger">{errors.assignmentNo}</p>}
            </div>
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Assignment Title <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: '' })) }}
              placeholder="Enter assignment title"
              className={`w-full rounded-btn border ${errors.title ? 'border-danger' : 'border-slate-300'} px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary`}
            />
            {errors.title && <p className="mt-1 text-xs text-danger">{errors.title}</p>}
          </div>

          <div className="w-full">
            <label htmlFor="c-assign-desc" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              id="c-assign-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[80px] resize-y"
              placeholder="Assignment description (optional)..."
            />
          </div>

          <div className="w-full">
            <label htmlFor="c-assign-instructions" className="block text-sm font-medium text-slate-700 mb-1">
              Instructions <span className="text-danger">*</span>
            </label>
            <textarea
              id="c-assign-instructions"
              value={instructions}
              onChange={(e) => { setInstructions(e.target.value); setErrors((p) => ({ ...p, instructions: '' })) }}
              className={`w-full rounded-btn border ${errors.instructions ? 'border-danger' : 'border-slate-300'} px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[100px] resize-y`}
              placeholder="Provide detailed instructions for students..."
            />
            {errors.instructions && <p className="mt-1 text-xs text-danger">{errors.instructions}</p>}
          </div>

          <div className="w-full">
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload Assignment Material</label>
            {!file ? (
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-btn p-4 text-center cursor-pointer hover:border-primary/40 hover:bg-indigo-50/20 transition-colors"
              >
                <Upload size={20} className="mx-auto text-slate-400 mb-1" />
                <p className="text-xs text-slate-500">Click to upload (PDF, DOCX, PPT, images, zip)</p>
              </div>
            ) : (
              <div className="flex items-center justify-between border border-slate-300 rounded-btn px-3 py-2 bg-slate-50">
                <span className="text-sm text-slate-700 truncate">{file.name}</span>
                <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = '' }} className="p-1 text-slate-400 hover:text-danger cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.docx,.ppt,.pptx,.png,.jpg,.jpeg,.zip"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Last Date <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => { setDueDate(e.target.value); setErrors((p) => ({ ...p, dueDate: '' })) }}
                className={`w-full rounded-btn border ${errors.dueDate ? 'border-danger' : 'border-slate-300'} px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary`}
              />
              {errors.dueDate && <p className="mt-1 text-xs text-danger">{errors.dueDate}</p>}
            </div>
            <div className="w-full">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Status <span className="text-danger">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={creating || updating}>Submit</Button>
          </div>
        </form>
      </Modal>

      {isLoading ? (
        <Spinner size={28} />
      ) : !assignments || assignments.length === 0 ? (
        <EmptyState icon={ClipboardList} title="No assignments yet" description="Create the first assignment for this course." />
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div key={a.id} className="flex items-center justify-between py-3 px-4 border border-slate-200 rounded-card text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-800 truncate">{a.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {a.section && <span className="text-xs text-slate-400">Sec: {a.section}</span>}
                  {a.assignment_no && <span className="text-xs text-slate-400">{a.assignment_no}</span>}
                  {a.due_date && (
                    <Badge variant={isOverdue(a.due_date) ? 'danger' : 'neutral'}>
                      Due: {new Date(a.due_date).toLocaleDateString()}
                    </Badge>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-3">
                <button
                  onClick={() => openEdit(a)}
                  aria-label="Edit assignment"
                  className="p-1.5 text-slate-400 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded cursor-pointer"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => navigate(`/teacher/assignments/${a.id}/submissions`)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  View Submissions
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TabPanel({ active, children }) {
  if (!active) return null
  return <div className="pt-4">{children}</div>
}

export default function CourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab') || 'materials'
  const defaultTab = TABS.some((t) => t.key === tabParam) ? tabParam : 'materials'
  const [activeTab, setActiveTab] = useState(defaultTab)
  const [enrollModal, setEnrollModal] = useState(false)
  const [enrollEmail, setEnrollEmail] = useState('')
  const [teacherEnroll, { isLoading: enrolling }] = useTeacherEnrollMutation()

  const { data: course, isLoading: courseLoading } = useGetCourseDetailQuery(courseId)
  const [updateCourse, { isLoading: publishing }] = useUpdateCourseMutation()
  const { data: quizzes } = useGetCourseQuizzesQuery(courseId, { skip: activeTab !== 'quizzes' })

  const handleEnroll = async (e) => {
    e.preventDefault()
    if (!enrollEmail.trim()) return
    try {
      await teacherEnroll({ course_id: courseId, student_email: enrollEmail.trim() }).unwrap()
      toast.success('Student enrolled')
      setEnrollModal(false)
      setEnrollEmail('')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to enroll student')
    }
  }

  if (courseLoading) return <Spinner size={32} />
  if (!course) return <EmptyState title="Course not found" description="This course may have been deleted." />

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/teacher/courses')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Courses
      </button>

      <div className="bg-white rounded-card border border-slate-200 p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{course.title}</h1>
            {course.description && (
              <p className="text-sm text-slate-500 mt-1">{course.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => setEnrollModal(true)}>
              <Plus size={14} /> Enroll Student
            </Button>
            <Badge variant={course.is_published ? 'success' : 'warning'}>
              {course.is_published ? 'Published' : 'Draft'}
            </Badge>
            <Button
              size="sm"
              variant={course.is_published ? 'outline' : 'primary'}
              loading={publishing}
              onClick={async () => {
                try {
                  await updateCourse({ id: courseId, is_published: !course.is_published }).unwrap()
                  toast.success(course.is_published ? 'Course set to Draft' : 'Course Published!')
                } catch (err) {
                  toast.error(err.data?.detail || 'Failed to update course status')
                }
              }}
            >
              {course.is_published ? 'Unpublish' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 pb-3 px-1 text-sm font-medium border-b-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-sm cursor-pointer ${
                activeTab === t.key
                  ? 'border-primary text-primary'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <t.icon size={16} />
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      <TabPanel active={activeTab === 'materials'}>
        <Card title="Materials">
          <CardBody>
            <MaterialsTab courseId={courseId} />
          </CardBody>
        </Card>
      </TabPanel>

      <TabPanel active={activeTab === 'announcements'}>
        <Card title="Announcements">
          <CardBody>
            <AnnouncementsTab courseId={courseId} />
          </CardBody>
        </Card>
      </TabPanel>

      <TabPanel active={activeTab === 'assignments'}>
        <Card title="Assignments">
          <CardBody>
            <AssignmentsTab courseId={courseId} />
          </CardBody>
        </Card>
      </TabPanel>

      <TabPanel active={activeTab === 'quizzes'}>
        <Card title="Quizzes">
          <CardBody>
            {!quizzes ? (
              <Spinner size={28} />
            ) : quizzes.length === 0 ? (
              <EmptyState icon={HelpCircle} title="No quizzes yet" description="Create quizzes to test student knowledge." />
            ) : (
              <div className="space-y-2">
                {quizzes.map((q) => (
                  <div key={q.id} className="flex items-center justify-between py-2 px-3 border border-slate-200 rounded-card text-sm">
                    <span className="text-slate-700 font-medium">{q.title}</span>
                    <div className="flex items-center gap-2">
                      {q.time_limit_minutes && <Badge variant="neutral">{q.time_limit_minutes} min</Badge>}
                      <Badge variant={q.is_active !== false ? 'success' : 'neutral'}>
                        {q.is_active !== false ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-4">
              <Button size="sm" onClick={() => navigate(`/teacher/courses/${courseId}/quizzes`)}>
                <Plus size={14} /> Manage Quizzes
              </Button>
            </div>
          </CardBody>
        </Card>
      </TabPanel>

      <TabPanel active={activeTab === 'students'}>
        <Card title="Enrolled Students">
          <CardBody>
            <StudentsTab courseId={courseId} />
          </CardBody>
        </Card>
      </TabPanel>

      <Modal open={enrollModal} onClose={() => setEnrollModal(false)} title="Enroll Student">
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
            <Button type="button" variant="outline" onClick={() => setEnrollModal(false)}>Cancel</Button>
            <Button type="submit" loading={enrolling}>Enroll</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
