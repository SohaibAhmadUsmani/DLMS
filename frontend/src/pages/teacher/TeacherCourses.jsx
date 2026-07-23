import { useState, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Plus, BookOpen, SearchX, Upload, X, LayoutGrid, List,
  Users, Clock, Star, Eye, Pencil, Trash2
} from 'lucide-react'
import {
  useGetMyCoursesQuery,
  useCreateCourseMutation,
  useUpdateCourseMutation,
  useDeleteCourseMutation,
  useUploadCourseCoverMutation,
} from '../../features/console/consoleApi'
import { useAppSelector } from '../../app/hooks'
import Card, { CardBody } from '../../components/ui/Card'
import CourseCard from '../../components/course/CourseCard'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Select from '../../components/ui/Select'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
const VIEW_OPTIONS = ['grid', 'list']

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="bg-white border border-slate-200 rounded-card p-4 flex items-center gap-3">
      <div className={`flex h-11 w-11 items-center justify-center rounded-card ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value ?? 0}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    Published: { bg: 'bg-emerald-100 text-emerald-700', label: 'Published' },
    Draft: { bg: 'bg-purple-100 text-purple-700', label: 'Draft' },
    Pending: { bg: 'bg-blue-100 text-blue-700', label: 'Pending' },
  }
  const s = config[status] || config.Draft
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.bg}`}>
      {s.label}
    </span>
  )
}

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star key={s} size={12} className={s <= Math.round(rating || 0) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
      ))}
    </div>
  )
}

function TeacherAvatar({ name }) {
  const initial = (name || 'T').charAt(0).toUpperCase()
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
      {initial}
    </div>
  )
}

export default function TeacherCourses() {
  const navigate = useNavigate()
  const { data: courses, isLoading, isError } = useGetMyCoursesQuery()
  const searchTerm = useAppSelector((s) => s.search.term)
  const [view, setView] = useState('grid')
  const [statusFilter, setStatusFilter] = useState('all')

  const [createCourse] = useCreateCourseMutation()
  const [updateCourse] = useUpdateCourseMutation()
  const [deleteCourse] = useDeleteCourseMutation()
  const [uploadCourseCover] = useUploadCourseCoverMutation()

  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const fileInputRef = useRef(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm()

  const stats = useMemo(() => {
    if (!courses) return { active: 0, draft: 0, pending: 0, free: 0, paid: 0 }
    return {
      active: courses.filter((c) => c.is_published).length,
      draft: courses.filter((c) => !c.is_published).length,
      pending: courses.filter((c) => !c.is_published).length,
      free: courses.filter((c) => c.is_published).length,
      paid: 0,
    }
  }, [courses])

  const filtered = useMemo(() => {
    if (!courses) return []
    let list = [...courses]
    const q = searchTerm.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) => c.title.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q)
      )
    }
    if (statusFilter === 'published') list = list.filter((c) => c.is_published)
    else if (statusFilter === 'draft') list = list.filter((c) => !c.is_published)
    return list
  }, [courses, searchTerm, statusFilter])

  const openCreate = () => {
    setEditing(null)
    setCoverFile(null)
    setCoverPreview(null)
    reset({ title: '', description: '', is_published: false, price: 0 })
    setModalOpen(true)
  }

  const openEdit = (course) => {
    setEditing(course)
    setCoverFile(null)
    setCoverPreview(null)
    reset({ title: course.title, description: course.description || '', is_published: course.is_published || false, price: course.price || 0 })
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditing(null)
    setCoverFile(null)
    setCoverPreview(null)
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

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      let courseId
      if (editing) {
        await updateCourse({ id: editing.id, ...data }).unwrap()
        courseId = editing.id
        toast.success('Course updated')
      } else {
        const created = await createCourse(data).unwrap()
        courseId = created.id
        toast.success('Course created')
      }
      if (coverFile) {
        const formData = new FormData()
        formData.append('file', coverFile)
        await uploadCourseCover({ id: courseId, formData }).unwrap()
      }
      closeModal()
    } catch (err) {
      toast.error(err.data?.detail || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete "${title}"? This cannot be undone.`)) return
    try {
      await deleteCourse(id).unwrap()
      toast.success('Course deleted')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete course')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">My Courses</h1>
          <p className="text-sm text-slate-500 mt-0.5">Manage your courses and their content.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus size={16} />
          Create Course
        </Button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard icon={BookOpen} label="Active Courses" value={stats.active} color="bg-emerald-500" />
        <StatCard icon={Clock} label="Pending Courses" value={stats.pending} color="bg-blue-500" />
        <StatCard icon={BookOpen} label="Draft Courses" value={stats.draft} color="bg-purple-500" />
        <StatCard icon={Users} label="Free Courses" value={stats.free} color="bg-amber-500" />
        <StatCard icon={Users} label="Paid Courses" value={stats.paid} color="bg-primary" />
      </div>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'published', label: 'Published' },
              { value: 'draft', label: 'Draft' },
            ]}
            className="w-36"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border border-slate-200 rounded-card overflow-hidden">
            {VIEW_OPTIONS.map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`p-2 transition-colors cursor-pointer ${
                  view === v ? 'bg-primary text-white' : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
                title={`${v} view`}
              >
                {v === 'grid' ? <LayoutGrid size={16} /> : <List size={16} />}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      {isError ? (
        <Card><CardBody>
          <EmptyState icon={BookOpen} title="Failed to load courses" description="Could not reach the server." />
        </CardBody></Card>
      ) : isLoading ? (
        <Spinner size={32} />
      ) : !courses || courses.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState icon={BookOpen} title="No courses yet" description="Create your first course to get started." />
          </CardBody>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState icon={SearchX} title="No results" description={searchTerm ? `No courses match "${searchTerm}".` : 'No courses match this filter.'} />
          </CardBody>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <CourseCard
              key={c.id}
              course={c}
              variant="teacher"
              coverImage={c.cover_image}
              onView={() => navigate(`/teacher/courses/${c.id}`)}
              onEdit={() => openEdit(c)}
              onDelete={() => handleDelete(c.id, c.title)}
            />
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white border border-slate-200 rounded-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="px-4 py-3">Course Name</th>
                  <th className="px-4 py-3">Students</th>
                  <th className="px-4 py-3">Ratings</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/teacher/courses/${c.id}`)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {c.cover_image ? (
                          <img src={c.cover_image} alt="" className="h-10 w-14 rounded-card object-cover shrink-0" />
                        ) : (
                          <div className="h-10 w-14 rounded-card bg-slate-100 flex items-center justify-center shrink-0">
                            <BookOpen size={16} className="text-slate-300" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{c.title}</p>
                          {c.description && (
                            <p className="text-xs text-slate-400 truncate max-w-[200px]">{c.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">—</td>
                    <td className="px-4 py-3">
                      <StarRating rating={0} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={c.is_published ? 'Published' : 'Draft'} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => navigate(`/teacher/courses/${c.id}`)}
                          className="p-1.5 rounded-card text-slate-400 hover:text-primary hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="View"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded-card text-slate-400 hover:text-accent hover:bg-amber-50 transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id, c.title)}
                          className="p-1.5 rounded-card text-slate-400 hover:text-danger hover:bg-red-50 transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create/Edit Modal (unchanged) */}
      <Modal open={modalOpen} onClose={closeModal} title={editing ? 'Edit Course' : 'Create Course'}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title"
            placeholder="e.g. Introduction to Computer Science"
            error={errors.title?.message}
            {...register('title', { required: 'Title is required' })}
          />
          <div className="w-full">
            <label htmlFor="course-desc" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <textarea
              id="course-desc"
              className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[80px] resize-y"
              placeholder="Course description..."
              {...register('description')}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Cover Image</label>
            {coverPreview ? (
              <div className="relative h-32 rounded-card overflow-hidden border border-slate-200 mb-2">
                <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover" />
                <button type="button" onClick={clearCover} className="absolute top-2 right-2 bg-white/80 rounded-full p-1 text-slate-600 hover:bg-white transition-colors cursor-pointer">
                  <X size={14} />
                </button>
              </div>
            ) : editing && editing.cover_image ? (
              <div className="relative h-32 rounded-card overflow-hidden border border-slate-200 mb-2">
                <img src={editing.cover_image} alt="Current cover" className="w-full h-full object-cover" />
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
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleCoverSelect} className="hidden" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Price (USD)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="0.00 for free, e.g. 49.99 for paid"
              {...register('price', { valueAsNumber: true })}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
              {...register('is_published')}
            />
            <span className="text-sm text-slate-700">Publish immediately</span>
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Save Changes' : 'Create'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
