import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, BarChart3, Clock, Award } from 'lucide-react'
import { useGetQuizQuery, useGetQuizResultsQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function QuizResults() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { data: quiz } = useGetQuizQuery(quizId, { skip: !quizId })
  const { data: results, isLoading, isError } = useGetQuizResultsQuery(quizId, { skip: !quizId })

  if (!quizId) return <EmptyState icon={BarChart3} title="Invalid quiz" description="Quiz ID is missing." />

  const attempts = results?.attempts || []
  const totalParticipants = attempts.length
  const completedAttempts = attempts.filter((a) => a.score_pct != null)
  const avgScore = completedAttempts.length > 0
    ? Math.round(completedAttempts.reduce((s, a) => s + (a.score_pct || 0), 0) / completedAttempts.length)
    : 0
  const submitted = attempts.filter((a) => a.status === 'submitted')
  const avgDuration = submitted.length > 0
    ? submitted.reduce((s, a) => s + (a.duration_seconds || 0), 0) / submitted.length
    : 0
  const avgTimeStr = avgDuration > 0
    ? `${String(Math.floor(avgDuration / 3600)).padStart(2, '0')}:${String(Math.floor((avgDuration % 3600) / 60)).padStart(2, '0')}:${String(Math.floor(avgDuration % 60)).padStart(2, '0')}`
    : '--:--:--'

  const columns = [
    {
      key: 'student_name',
      label: 'Student',
      render: (v, row) => (
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {(v || row.student_id || '?')[0].toUpperCase()}
          </div>
          <span className="text-sm font-medium text-primary hover:underline cursor-pointer">{v || row.student_id || 'Unknown'}</span>
        </div>
      ),
    },
    {
      key: 'score_pct',
      label: 'Score',
      render: (v, row) => {
        if (v == null) return <Badge variant="neutral">—</Badge>
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{row.score != null ? Math.round(row.score) : '—'}</span>
            <Badge variant={v >= 50 ? 'success' : 'danger'}>{Math.round(v)}%</Badge>
          </div>
        )
      },
    },
    {
      key: 'attempt_number',
      label: 'Attempts',
      render: (v) => <span className="text-sm text-slate-600">{v || 1}</span>,
    },
    {
      key: 'submitted_at',
      label: 'Finish Time',
      render: (v) => (
        <span className="text-sm text-slate-500">
          {v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(`/teacher/courses/${quiz?.course_id}/quizzes`)}
          className="text-slate-400 hover:text-slate-600 cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quiz Results</h1>
          {quiz && <p className="text-sm text-slate-500">{quiz.title}</p>}
        </div>
      </div>

      {isLoading ? <Spinner size={32} /> : isError ? (
        <Card><CardBody><EmptyState icon={BarChart3} title="Failed to load results" /></CardBody></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-card p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Participants</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{totalParticipants}</p>
              </div>
              <div className="h-10 w-10 rounded-card bg-pink-50 flex items-center justify-center">
                <Users size={20} className="text-pink-500" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-card p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Scores</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{completedAttempts.length}</p>
              </div>
              <div className="h-10 w-10 rounded-card bg-purple-50 flex items-center justify-center">
                <Award size={20} className="text-purple-500" />
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-card p-4 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Average Time</p>
                <p className="text-2xl font-bold text-slate-800 mt-1">{avgTimeStr}</p>
              </div>
              <div className="h-10 w-10 rounded-card bg-indigo-50 flex items-center justify-center">
                <Clock size={20} className="text-indigo-500" />
              </div>
            </div>
          </div>

          {attempts.length === 0 ? (
            <Card><CardBody>
              <EmptyState icon={BarChart3} title="No attempts yet" description="Results will appear once students take this quiz." />
            </CardBody></Card>
          ) : (
            <Card title="Student Results">
              <CardBody className="!p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/50">
                      {columns.map((col) => (
                        <th key={col.key} className="text-left px-4 py-3 font-semibold text-slate-500 text-xs uppercase tracking-wider">{col.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 transition-colors">
                        {columns.map((col) => (
                          <td key={col.key} className="px-4 py-3">{col.render ? col.render(row[col.key], row) : <span className="text-sm text-slate-600">{row[col.key]}</span>}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardBody>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
