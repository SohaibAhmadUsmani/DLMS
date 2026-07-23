import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, XCircle, ArrowLeft, BarChart3, Clock } from 'lucide-react'
import { useGetAttemptResultQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function formatTime(seconds) {
  if (!seconds) return '--:--:--'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function QuizResult() {
  const { attemptId } = useParams()
  const navigate = useNavigate()
  const { data: result, isLoading, isError } = useGetAttemptResultQuery(attemptId, { skip: !attemptId })

  if (!attemptId) return <EmptyState icon={BarChart3} title="Invalid attempt" description="Attempt ID is missing." />

  if (isLoading) return <Spinner size={36} />
  if (isError || !result) return <p className="text-slate-500 text-center py-12">Failed to load result.</p>

  const questionsById = {}
  if (result.questions) {
    result.questions.forEach((q) => { questionsById[q.id] = q })
  }

  const answers = result.answers || []
  const scorePct = result.score_pct != null ? Math.round(result.score_pct) : null
  const passed = scorePct != null && scorePct >= 50
  const correctCount = answers.filter((a) => a.is_correct).length
  const totalQuestions = answers.length

  return (
    <div className="space-y-6">
      <div className={`rounded-card p-6 shadow-sm overflow-hidden ${passed ? 'bg-gradient-to-r from-emerald-500 to-teal-600' : 'bg-gradient-to-r from-red-500 to-rose-600'}`}>
        <div className="text-white text-center">
          <h1 className="text-2xl font-bold">{passed ? 'Congratulations!' : 'Quiz Complete'}</h1>
          <p className="text-white/80 mt-1">{passed ? 'You passed the quiz.' : "Keep practicing, you'll do better next time."}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card><CardBody className="text-center py-4">
          <p className="text-xs text-slate-500">Score</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{result.score != null ? Math.round(result.score) : '—'}</p>
        </CardBody></Card>
        <Card><CardBody className="text-center py-4">
          <p className="text-xs text-slate-500">Percentage</p>
          <div className="flex justify-center mt-1">
            <Badge variant={passed ? 'success' : 'danger'} className="text-sm">{scorePct != null ? `${scorePct}%` : '—'}</Badge>
          </div>
        </CardBody></Card>
        <Card><CardBody className="text-center py-4">
          <p className="text-xs text-slate-500">Correct</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{correctCount}/{totalQuestions}</p>
        </CardBody></Card>
        <Card><CardBody className="text-center py-4">
          <p className="text-xs text-slate-500">Time Taken</p>
          <p className="text-xl font-bold text-slate-800 mt-1 flex items-center justify-center gap-1">
            <Clock size={14} /> {formatTime(result.duration_seconds)}
          </p>
        </CardBody></Card>
      </div>

      <Card title="Question Breakdown">
        <CardBody className="space-y-4">
          {answers.length === 0 ? (
            <EmptyState icon={BarChart3} title="No answer data" />
          ) : (
            answers.map((a, idx) => {
              const q = questionsById[a.question_id]
              const questionText = q?.question_text || `Question ${idx + 1}`
              const marks = q?.marks ?? 1
              return (
                <div key={a.id || idx} className="border border-slate-200 rounded-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800 flex-1">
                      <span className="text-slate-400 mr-1">{idx + 1}.</span> {questionText}
                    </p>
                    {a.is_correct ? (
                      <CheckCircle size={20} className="text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle size={20} className="text-red-500 shrink-0" />
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-sm">
                    {q?.options && Array.isArray(q.options) ? (
                      q.options.map((opt, oi) => {
                        const isSelected = a.selected_option === oi
                        const isRight = opt.is_correct
                        return (
                          <div key={oi} className={`flex items-center gap-2 px-3 py-1.5 rounded-card ${isRight ? 'bg-emerald-50 text-emerald-700' : isSelected ? 'bg-red-50 text-red-700' : 'text-slate-600'}`}>
                            {isRight && <CheckCircle size={14} className="shrink-0" />}
                            {isSelected && !isRight && <XCircle size={14} className="shrink-0" />}
                            <span className={isSelected || isRight ? 'font-medium' : ''}>{opt.option_text}</span>
                            {isRight && <Badge variant="success">Correct</Badge>}
                            {isSelected && !isRight && <Badge variant="danger">Your answer</Badge>}
                          </div>
                        )
                      })
                    ) : (
                      <p className="text-slate-600">Your answer: option #{a.selected_option + 1}</p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">{a.is_correct ? `+${marks}` : '0'} / {marks} marks</p>
                  </div>
                </div>
              )
            })
          )}
        </CardBody>
      </Card>

      <div className="flex justify-center gap-3">
        <button onClick={() => navigate('/student/quizzes')} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer">
          <ArrowLeft size={16} /> Back to Quizzes
        </button>
      </div>
    </div>
  )
}
