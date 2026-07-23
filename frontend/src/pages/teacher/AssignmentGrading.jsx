import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { ArrowLeft, Download, Save } from 'lucide-react'
import {
  useGetAssignmentSubmissionsQuery,
  useGradeSubmissionMutation,
} from '../../features/console/consoleApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Table from '../../components/ui/Table'

function GradingRow({ submission, onGrade }) {
  const [editing, setEditing] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()
  const [saving, setSaving] = useState(false)

  const startEdit = () => {
    reset({ score: submission.score ?? '', feedback: submission.feedback ?? '' })
    setEditing(true)
  }

  const onSubmit = async (data) => {
    setSaving(true)
    try {
      await onGrade(submission.id, {
        score: Number(data.score),
        feedback: data.feedback,
      })
      toast.success('Grade saved')
      setEditing(false)
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to save grade')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-slate-200 rounded-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-800 truncate">
            {submission.student_name || submission.student_id || 'Unknown'}
          </p>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
            <span>Submitted: {submission.submitted_at ? new Date(submission.submitted_at).toLocaleString() : '—'}</span>
            {submission.filename && (
              <a
                href={submission.file_url || '#'}
                download
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <Download size={12} />
                {submission.filename}
              </a>
            )}
          </div>
        </div>
        {submission.score != null && (
          <Badge variant={submission.score != null ? 'success' : 'neutral'}>
            Score: {submission.score}
          </Badge>
        )}
      </div>

      {editing ? (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex items-start gap-3">
            <div className="w-24 shrink-0">
              <Input
                type="number"
                placeholder="Score"
                error={errors.score?.message}
                {...register('score', { required: 'Required', min: { value: 0, message: 'Min 0' } })}
              />
            </div>
            <div className="flex-1">
              <textarea
                className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary min-h-[60px] resize-y"
                placeholder="Feedback (optional)"
                aria-label="Feedback"
                {...register('feedback')}
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" loading={saving}>
              <Save size={14} /> Save
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <div className="pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <div className="text-xs text-slate-500">
              {submission.feedback ? (
                <span>Feedback: <span className="text-slate-700">{submission.feedback}</span></span>
              ) : (
                <span className="italic">No feedback yet</span>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={startEdit}>
              {submission.score != null ? 'Update Grade' : 'Grade'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function AssignmentGrading() {
  const { assignmentId } = useParams()
  const navigate = useNavigate()
  const { data: submissions, isLoading, isError } = useGetAssignmentSubmissionsQuery(assignmentId, { skip: !assignmentId })

  if (!assignmentId) return <EmptyState icon={ArrowLeft} title="Invalid assignment" description="Assignment ID is missing." />
  const [gradeSubmission] = useGradeSubmissionMutation()

  const handleGrade = async (submissionId, data) => {
    await gradeSubmission({ submissionId, ...data }).unwrap()
  }

  const columns = [
    { key: 'student', label: 'Student', render: (_, row) => row.student_name || row.student_id || 'Unknown' },
    {
      key: 'submitted_at',
      label: 'Submitted',
      render: (v) => v ? new Date(v).toLocaleDateString() : '—',
    },
    {
      key: 'file',
      label: 'File',
      render: (_, row) =>
        row.file_url ? (
          <a href={row.file_url} download={row.filename} className="flex items-center gap-1 text-primary hover:underline text-xs">
            <Download size={12} />
            {row.filename || 'Download'}
          </a>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
    {
      key: 'score',
      label: 'Score',
      render: (v) => (v != null ? <Badge variant="success">{v}</Badge> : <Badge variant="neutral">Ungraded</Badge>),
    },
  ]

  return (
    <div className="space-y-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded cursor-pointer"
        >
          <ArrowLeft size={16} /> Back
        </button>

      <div className="bg-white rounded-card border border-slate-200 p-6 shadow-sm">
        <h1 className="text-xl font-bold text-slate-800">Assignment Submissions</h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and grade student submissions.</p>
      </div>

      <Card title="Submissions">
        <CardBody>
          {isError ? (
            <EmptyState title="Failed to load submissions" description="Could not reach the server." />
          ) : isLoading ? (
            <Spinner size={28} />
          ) : !submissions || submissions.length === 0 ? (
            <EmptyState title="No submissions yet" description="No students have submitted this assignment." />
          ) : (
            <div className="space-y-4">
              <Table columns={columns} rows={submissions} />
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-700">Grading Panel</h3>
                {submissions.map((s) => (
                  <GradingRow key={s.id} submission={s} onGrade={handleGrade} />
                ))}
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
