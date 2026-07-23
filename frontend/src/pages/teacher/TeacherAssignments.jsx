import { useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus, Pencil, SearchX, Upload, X } from 'lucide-react'
import { useGetMyCoursesQuery, useGetMyAssignmentsQuery, useCreateAssignmentMutation, useUpdateAssignmentMutation, useUploadAssignmentMaterialMutation, useGetAssignmentSubmissionsQuery } from '../../features/console/consoleApi'
import { useAppDispatch, useAppSelector } from '../../app/hooks'
import { setSearchTerm } from '../../features/search/searchSlice'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const SECTION_OPTIONS = ['A', 'B']

function SubmissionCount({ assignmentId }) {
  const { data } = useGetAssignmentSubmissionsQuery(assignmentId, { skip: !assignmentId })
  return <span>{data?.length ?? '—'}</span>
}

function AssignmentFormModal({ open, onClose, assignment, courseId, courseTitle }) {
  const [createAssignment, { isLoading: creating }] = useCreateAssignmentMutation()
  const [updateAssignment, { isLoading: updating }] = useUpdateAssignmentMutation()
  const [uploadMaterial] = useUploadAssignmentMaterialMutation()

  const [section, setSection] = useState(assignment?.section || '')
  const [assignmentNo, setAssignmentNo] = useState(assignment?.assignment_no || '')
  const [title, setTitle] = useState(assignment?.title || '')
  const [description, setDescription] = useState(assignment?.description || '')
  const [instructions, setInstructions] = useState(assignment?.instructions || '')
  const [dueDate, setDueDate] = useState(assignment?.due_date ? assignment.due_date.slice(0, 10) : '')
  const [status, setStatus] = useState(assignment?.status || 'draft')
  const [file, setFile] = useState(null)
  const [errors, setErrors] = useState({})
  const fileRef = useRef()

  const handleRemoveFile = () => {
    setFile(null)
    if (fileRef.current) fileRef.current.value = ''
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
      if (assignment) {
        result = await updateAssignment({ id: assignment.id, ...body }).unwrap()
      } else {
        result = await createAssignment({ courseId, ...body }).unwrap()
      }
      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        await uploadMaterial({ id: result.id || result._id, formData }).unwrap()
      }
      onClose()
    } catch (err) {
      const detail = err.data?.detail || 'Failed to save assignment'
      if (detail.includes('section')) setErrors((p) => ({ ...p, section: detail }))
      else if (detail.includes('assignment_no')) setErrors((p) => ({ ...p, assignmentNo: detail }))
      else setErrors((p) => ({ ...p, form: detail }))
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={assignment ? 'Edit Assignment' : 'Create Assignment'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!assignment && courseTitle && (
          <p className="text-xs text-slate-500">Course: <span className="font-medium text-slate-700">{courseTitle}</span></p>
        )}

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
          <Input
            label="Assignment No"
            placeholder="e.g. Assignment 01"
            value={assignmentNo}
            onChange={(e) => { setAssignmentNo(e.target.value); setErrors((p) => ({ ...p, assignmentNo: '' })) }}
            error={errors.assignmentNo}
            required
          />
        </div>

        <Input
          label="Assignment Title"
          placeholder="Enter assignment title"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: '' })) }}
          error={errors.title}
          required
        />

        <div className="w-full">
          <label htmlFor="assign-desc" className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            id="assign-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[80px] resize-y"
            placeholder="Assignment description (optional)..."
          />
        </div>

        <div className="w-full">
          <label htmlFor="assign-instructions" className="block text-sm font-medium text-slate-700 mb-1">
            Instructions <span className="text-danger">*</span>
          </label>
          <textarea
            id="assign-instructions"
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
              <button type="button" onClick={handleRemoveFile} className="p-1 text-slate-400 hover:text-danger cursor-pointer">
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
          <Input
            label="Last Date"
            type="date"
            value={dueDate}
            onChange={(e) => { setDueDate(e.target.value); setErrors((p) => ({ ...p, dueDate: '' })) }}
            error={errors.dueDate}
            required
          />
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

        {errors.form && <p className="text-xs text-danger">{errors.form}</p>}

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={creating || updating}>Submit</Button>
        </div>
      </form>
    </Modal>
  )
}

export default function TeacherAssignments() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const searchTerm = useAppSelector((s) => s.search.term)
  const { data: courses, isLoading: coursesLoading, error: coursesError } = useGetMyCoursesQuery()
  const { data: allAssignments, isLoading: assignmentsLoading, error: assignmentsError } = useGetMyAssignmentsQuery()

  const [courseModal, setCourseModal] = useState(false)
  const [createModalCourse, setCreateModalCourse] = useState(null)
  const [editAssignment, setEditAssignment] = useState(null)

  const courseTitles = useMemo(() => {
    if (!courses) return {}
    return Object.fromEntries(courses.map((c) => [c.id, c.title]))
  }, [courses])

  const filteredAssignments = useMemo(() => {
    if (!allAssignments) return []
    if (!searchTerm.trim()) return allAssignments
    const q = searchTerm.toLowerCase()
    return allAssignments.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        (courseTitles[a.course_id] || '').toLowerCase().includes(q) ||
        (a.assignment_no || '').toLowerCase().includes(q)
    )
  }, [allAssignments, searchTerm, courseTitles])

  const handleCreateClick = () => {
    setCourseModal(true)
  }

  const handleCourseSelect = (course) => {
    setCourseModal(false)
    setCreateModalCourse(course)
  }

  const handleEditClick = (assignment) => {
    setEditAssignment(assignment)
  }

  const handleModalClose = () => {
    setCreateModalCourse(null)
    setEditAssignment(null)
  }

  const isLoading = coursesLoading || (courses && assignmentsLoading)
  const fatalError = coursesError

  if (isLoading && !courses) {
    return (
      <div className="flex justify-center py-24"><Spinner size={32} /></div>
    )
  }

  if (fatalError) {
    return (
      <EmptyState icon={ClipboardList} title="Failed to load" description="Could not load data. Please try again." />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Assignments</h1>
          <p className="text-sm text-slate-500 mt-0.5">View, grade, and manage assignments across your courses.</p>
        </div>
        {courses && courses.length > 0 && (
          <Button size="sm" onClick={handleCreateClick}>
            <Plus size={14} /> Add Assignment
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search assignments..."
            value={searchTerm}
            onChange={(e) => dispatch(setSearchTerm(e.target.value))}
            className="w-full rounded-full border border-slate-300 pl-9 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
          />
        </div>
      </div>

      <Card>
        <CardBody className="p-0">
          {assignmentsError ? (
            <div className="p-6">
              <EmptyState icon={ClipboardList} title="Could not load assignments" description="The assignments server may need to be restarted. Please try again." />
            </div>
          ) : assignmentsLoading ? (
            <div className="flex justify-center py-12"><Spinner size={24} /></div>
          ) : !courses || courses.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ClipboardList}
                title="No courses yet"
                description="Create a course first, then add assignments to it."
              />
            </div>
          ) : filteredAssignments.length === 0 && searchTerm.trim() ? (
            <div className="p-6">
              <EmptyState icon={SearchX} title="No results" description={`No assignments match "${searchTerm}".`} />
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={ClipboardList}
                title="No assignments yet"
                description="Click 'Add Assignment' to create one."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left font-semibold text-slate-600 py-3.5 px-4">Assignment Name</th>
                    <th className="text-left font-semibold text-slate-600 py-3.5 px-4 w-28">Total Marks</th>
                    <th className="text-left font-semibold text-slate-600 py-3.5 px-4 w-28">Total Submit</th>
                    <th className="w-16 py-3.5 px-4" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignments.map((a) => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-medium text-slate-800 truncate max-w-xs">{a.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{courseTitles[a.course_id] || 'Unknown Course'}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-700">{a.max_score ?? '—'}</td>
                      <td className="py-3 px-4 text-slate-700">
                        <SubmissionCount assignmentId={a.id} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/teacher/assignments/${a.id}/submissions`)}
                            aria-label="View submissions"
                            className="px-2.5 py-1 text-xs font-medium text-primary bg-indigo-50 hover:bg-indigo-100 rounded-full transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                          >
                            Submissions
                          </button>
                          <button
                            onClick={() => handleEditClick(a)}
                            aria-label="Edit assignment"
                            className="p-1.5 text-slate-400 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded cursor-pointer"
                          >
                            <Pencil size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={courseModal} onClose={() => setCourseModal(false)} title="Select a Course">
        <div className="space-y-2 max-h-72 overflow-y-auto">
          {courses.map((c) => (
            <button
              key={c.id}
              onClick={() => handleCourseSelect(c)}
              className="w-full text-left px-4 py-3 border border-slate-200 rounded-card hover:border-primary/30 hover:bg-indigo-50/30 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <p className="text-sm font-medium text-slate-800">{c.title}</p>
              {c.description && <p className="text-xs text-slate-500 mt-0.5 truncate">{c.description}</p>}
            </button>
          ))}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="outline" size="sm" onClick={() => setCourseModal(false)}>Cancel</Button>
        </div>
      </Modal>

      {createModalCourse && (
        <AssignmentFormModal
          open={!!createModalCourse}
          onClose={handleModalClose}
          courseId={createModalCourse.id}
          courseTitle={createModalCourse.title}
        />
      )}

      {editAssignment && (
        <AssignmentFormModal
          open={!!editAssignment}
          onClose={handleModalClose}
          assignment={editAssignment}
          courseId={editAssignment.course_id}
          courseTitle={courseTitles[editAssignment.course_id]}
        />
      )}
    </div>
  )
}