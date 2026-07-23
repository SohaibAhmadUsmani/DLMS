import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { BookOpen, Clock, Calendar, HelpCircle, ArrowRight, Award } from 'lucide-react'
import { useGetMyQuizzesQuery, useStartQuizAttemptMutation } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const difficultyConfig = {
  easy: { label: 'Easy', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' },
  medium: { label: 'Medium', bg: 'bg-purple-50', text: 'text-purple-600', dot: 'bg-purple-500' },
  hard: { label: 'Hard', bg: 'bg-red-50', text: 'text-red-600', dot: 'bg-red-500' },
}

const courseColors = ['#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#06b6d4', '#f97316']

function stringToColor(s) {
  let hash = 0
  for (let i = 0; i < (s || '').length; i++) hash = s.charCodeAt(i) + ((hash << 5) - hash)
  return courseColors[Math.abs(hash) % courseColors.length]
}

export default function StudentQuizzes() {
  const navigate = useNavigate()
  const { data: quizzes, isLoading, isError, refetch } = useGetMyQuizzesQuery()
  const [startQuiz] = useStartQuizAttemptMutation()
  const [starting, setStarting] = useState(null)
  const [tab, setTab] = useState('available')

  const grouped = useMemo(() => {
    if (!quizzes) return { available: [], inProgress: [], completed: [] }
    const av = [], ip = [], co = []
    for (const q of quizzes) {
      if (q.attempt_status === 'in_progress') ip.push(q)
      else if (q.attempt_status === 'completed') co.push(q)
      else av.push(q)
    }
    return { available: av, inProgress: ip, completed: co }
  }, [quizzes])

  const currentList = grouped[tab] || []

  const handleStart = async (q) => {
    if (q.attempt_status === 'completed') {
      navigate(`/student/attempts/${q.attempt_id}/result`)
      return
    }
    if (q.attempt_status === 'in_progress' && q.attempt_id) {
      navigate(`/student/quizzes/${q.id}/attempt/${q.attempt_id}`)
      return
    }
    setStarting(q.id)
    try {
      const attempt = await startQuiz(q.id).unwrap()
      const attemptId = attempt.id || attempt._id || attempt.attempt_id
      navigate(`/student/quizzes/${q.id}/attempt/${attemptId}`)
    } catch (err) {
      if (err.status === 409) {
        refetch()
        toast.error('You already have an active attempt. Please use "Resume Quiz".')
      } else {
        toast.error(err.data?.detail || 'Failed to start quiz')
      }
    } finally {
      setStarting(null)
    }
  }

  const getButtonLabel = (q) => {
    if (q.attempt_status === 'completed') return 'View Result'
    if (q.attempt_status === 'in_progress') return 'Resume Quiz'
    return 'Start Quiz'
  }

  const tabs = [
    { key: 'available', label: 'Available', count: grouped.available.length },
    { key: 'inProgress', label: 'In Progress', count: grouped.inProgress.length },
    { key: 'completed', label: 'Completed', count: grouped.completed.length },
  ]

  if (isLoading) return <Spinner size={32} />
  if (isError) return <Card><CardBody><EmptyState icon={HelpCircle} title="Failed to load quizzes" description="Could not reach the server." /></CardBody></Card>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-800">Quizzes</h1>
        <div className="flex bg-slate-100 rounded-full p-0.5">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                tab === t.key ? 'bg-accent text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>
              {t.label} ({t.count})
            </button>
          ))}
        </div>
      </div>

      {currentList.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={BookOpen} title={`No ${tab === 'available' ? 'available' : tab === 'inProgress' ? 'in-progress' : 'completed'} quizzes`} description={
            tab === 'available' ? 'All quizzes have been attempted.' :
            tab === 'inProgress' ? 'You have no quizzes in progress.' :
            'You have not completed any quizzes yet.'
          } />
        </CardBody></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {currentList.map((q) => {
            const dc = difficultyConfig[q.difficulty_level] || difficultyConfig.medium
            const tagColor = stringToColor(q.course_name)
            return (
              <div key={q.id} className="bg-white border border-slate-200 rounded-card p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="inline-block text-[10px] font-medium px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: tagColor }}
                  >
                    {q.course_name ? q.course_name.substring(0, 20) : 'Course'}
                  </span>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${dc.bg} ${dc.text}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${dc.dot}`} />
                    {dc.label}
                  </span>
                </div>
                <p className="font-semibold text-slate-800 mt-2">{q.title}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><BookOpen size={12} /> {q.question_count} Questions</span>
                  <span className="inline-flex items-center gap-1"><Clock size={12} /> {q.time_limit_minutes} Min</span>
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                  <span className="inline-flex items-center gap-1"><Calendar size={12} /> Due: {q.due_date ? new Date(q.due_date).toLocaleDateString() : 'No due date'}</span>
                  {q.attempt_score != null && (
                    <span className="inline-flex items-center gap-1 font-medium text-emerald-600"><Award size={12} /> {Math.round(q.attempt_score)}%</span>
                  )}
                </div>
                <div className="mt-auto pt-3">
                  <button onClick={() => handleStart(q)} disabled={starting === q.id}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-card border border-slate-300 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:border-primary/30 transition-colors cursor-pointer disabled:opacity-50">
                    {getButtonLabel(q)} <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
