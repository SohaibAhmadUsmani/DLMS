import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { HelpCircle, BookOpen, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { useGetQuizQuery, useGetAttemptQuestionsQuery, useSubmitAttemptMutation } from '../../features/core/coreApi'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function formatTime(seconds) {
  if (!seconds || seconds < 0) return '00:00:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

export default function QuizAttempt() {
  const { quizId, attemptId } = useParams()
  const navigate = useNavigate()
  const { data: quiz } = useGetQuizQuery(quizId, { skip: !quizId })
  const { data: attemptData, isLoading, isError } = useGetAttemptQuestionsQuery({ quizId, attemptId }, { skip: !quizId || !attemptId })
  const [submitAttempt] = useSubmitAttemptMutation()

  const [answers, setAnswers] = useState({})
  const [currentQ, setCurrentQ] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const [elapsed, setElapsed] = useState(0)
  const submittedRef = useRef(false)
  const answersRef = useRef({})
  const questionsRef = useRef([])
  const doSubmitRef = useRef(null)

  if (!quizId || !attemptId) return <EmptyState icon={HelpCircle} title="Invalid attempt" description="Missing quiz or attempt ID." />

  const questions = attemptData?.questions || []
  const rawLimit = quiz?.time_limit_minutes || 1
  const timeLimit = Math.max(rawLimit, 1) * 60

  useEffect(() => { questionsRef.current = questions }, [questions])

  useEffect(() => {
    if (attemptData?.answers && attemptData.answers.length > 0) {
      const prefill = {}
      for (const a of attemptData.answers) {
        if (a.selected_option != null && a.selected_option >= 0) {
          prefill[a.question_id] = a.selected_option
        }
      }
      if (Object.keys(prefill).length > 0) {
        setAnswers(prefill)
        answersRef.current = { ...answersRef.current, ...prefill }
      }
    }
  }, [attemptData?.answers])

  const [timeExpired, setTimeExpired] = useState(false)

  useEffect(() => {
    const start = attemptData?.started_at
    if (!start || attemptData?.status !== 'in_progress') return
    const startStr = typeof start === 'string' && !/Z$/i.test(start) && !/[+\-]\d{2}:\d{2}$/.test(start) ? start + 'Z' : start
    const startMs = new Date(startStr).getTime()
    const initialElapsed = Math.floor((Date.now() - startMs) / 1000)
    setElapsed(initialElapsed)

    if (initialElapsed >= timeLimit) {
      setTimeExpired(true)
      return
    }

    let expired = false
    const tick = () => {
      if (expired || submittedRef.current) return
      const e = Math.floor((Date.now() - startMs) / 1000)
      setElapsed(e)
      if (e >= 10 && e >= timeLimit) {
        expired = true
        if (questionsRef.current.length > 0) {
          doSubmitRef.current()
        }
      }
    }

    const interval = setInterval(tick, 1000)
    return () => { clearInterval(interval); expired = true }
  }, [attemptData?.started_at, attemptData?.status, timeLimit])

  async function doSubmitFn() {
    if (submittedRef.current) return
    const currentQuestions = questionsRef.current
    if (currentQuestions.length === 0) return
    submittedRef.current = true
    setSubmitting(true)
    const currentAnswers = answersRef.current
    try {
      const ansList = currentQuestions.map((q) => ({
        question_id: q.id,
        selected_option: currentAnswers[q.id] != null ? currentAnswers[q.id] : -1,
      }))
      const res = await submitAttempt({ attemptId, answers: ansList }).unwrap()
      navigate(`/student/attempts/${attemptId}/result`, { replace: true })
    } catch (err) {
      if (err.status === 400 || (err.data?.detail && err.data.detail.includes('already been submitted'))) {
        navigate(`/student/attempts/${attemptId}/result`, { replace: true })
        return
      }
      toast.error(err.data?.detail || 'Failed to submit')
      submittedRef.current = false
      setSubmitting(false)
    }
  }
  doSubmitRef.current = doSubmitFn

  const handleSelect = (qid, oi) => {
    answersRef.current = { ...answersRef.current, [qid]: oi }
    setAnswers((prev) => ({ ...prev, [qid]: oi }))
  }

  const goNext = () => {
    if (submittedRef.current) return
    if (currentQ < questions.length - 1) setCurrentQ((p) => p + 1)
  }

  const goPrev = () => {
    if (submittedRef.current) return
    if (currentQ > 0) setCurrentQ((p) => p - 1)
  }

  const handleSubmit = () => {
    if (submittedRef.current) return
    doSubmitRef.current()
  }

  const answeredCount = questions.filter((q) => answers[q.id] != null).length
  const progress = questions.length > 0 ? ((currentQ + 1) / questions.length) * 100 : 0
  const remaining = Math.max(0, timeLimit - elapsed)
  const allAnswered = questions.length > 0 && answeredCount === questions.length

  if (isLoading) return <Spinner size={32} />
  if (isError) return <Card className="p-6"><EmptyState icon={HelpCircle} title="Failed to load attempt" description="Could not reach the server." /></Card>
  if (questions.length === 0) return <Card className="p-6"><EmptyState icon={HelpCircle} title="No questions" description="This quiz has no questions." /></Card>

  if (timeExpired && !submittedRef.current) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 pt-8">
        <Card className="p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-3">
            <AlertTriangle size={32} className="text-amber-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Time&rsquo;s Up!</h2>
          <p className="text-sm text-slate-500 mt-1">You have run out of time for this quiz.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="outline" onClick={() => navigate('/student/quizzes')}>Back to Quizzes</Button>
            <Button onClick={handleSubmit} loading={submitting} className="bg-accent hover:bg-accent/90 text-white">Submit Answers</Button>
          </div>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500 mb-3">Your answers so far:</p>
          <div className="space-y-2">
            {questions.map((q, idx) => (
              <div key={q.id} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-card">
                <span className="text-sm text-slate-700 truncate flex-1 mr-2">Q{idx + 1}: {q.question_text}</span>
                <span className={`text-xs font-medium shrink-0 px-2 py-0.5 rounded-full ${
                  answers[q.id] != null ? 'bg-accent/10 text-accent' : 'bg-slate-200 text-slate-500'
                }`}>
                  {answers[q.id] != null ? `Option ${answers[q.id] + 1}` : 'Not answered'}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    )
  }

  if (result) {
    return (
      <div className="max-w-xl mx-auto space-y-6 pt-8">
        <Card className="p-6 text-center">
          <div className="h-16 w-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-3">
            <CheckCircle size={32} className="text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Quiz Submitted!</h2>
          <div className="mt-6 grid grid-cols-2 gap-4 text-left">
            <div className="bg-slate-50 rounded-card p-3">
              <p className="text-xs text-slate-500">Score</p>
              <p className="text-lg font-bold text-slate-800">{result.score ?? '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-card p-3">
              <p className="text-xs text-slate-500">Percentage</p>
              <p className="text-lg font-bold text-emerald-600">{result.score_pct != null ? Math.round(result.score_pct) + '%' : '—'}</p>
            </div>
            <div className="bg-slate-50 rounded-card p-3">
              <p className="text-xs text-slate-500">Correct</p>
              <p className="text-lg font-bold text-slate-800">{result.correct_count}/{result.total_questions}</p>
            </div>
            <div className="bg-slate-50 rounded-card p-3">
              <p className="text-xs text-slate-500">Time Taken</p>
              <p className="text-lg font-bold text-slate-800">{formatTime(result.duration_seconds || 0)}</p>
            </div>
          </div>
          <div className="mt-6">
            <Button onClick={() => navigate(`/student/attempts/${attemptId}/result`)}>View Full Results</Button>
          </div>
        </Card>
      </div>
    )
  }

  const q = questions[currentQ]

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold text-slate-800">Quiz :{quiz?.title || attemptId?.slice(-4)}</h1>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-card bg-primary/10 flex items-center justify-center">
              <BookOpen size={16} className="text-primary" />
            </div>
            <span className="text-sm font-medium text-slate-700">{quiz?.title || 'Quiz'}</span>
          </div>
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
            remaining < 60 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'
          }`}>
            <Clock size={14} />
            {formatTime(remaining)} remaining
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-medium">Quiz Progress</span>
            <span>{answeredCount}/{questions.length} answered &middot; Question {currentQ + 1} of {questions.length}</span>
          </div>
          <div className="mt-1.5 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <p className="text-base font-semibold text-slate-800 pt-1">{q.question_text}</p>

        {q.image_url && (
          <div className="flex justify-center">
            <img src={q.image_url} alt="Question image" className="max-h-60 rounded-card border border-slate-200 object-contain" />
          </div>
        )}

        <div className="space-y-2.5">
          {q.options.map((opt, oi) => (
            <label key={oi}
              onClick={() => handleSelect(q.id, oi)}
              className={`flex items-center gap-3 px-4 py-3 rounded-card border cursor-pointer transition-all ${
                answers[q.id] === oi ? 'border-accent bg-accent/5' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <div className={`h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                answers[q.id] === oi ? 'border-accent' : 'border-slate-300'
              }`}>
                {answers[q.id] === oi && <div className="h-2 w-2 rounded-full bg-accent" />}
              </div>
              <span className={`text-sm ${answers[q.id] === oi ? 'font-medium text-accent' : 'text-slate-700'}`}>
                {opt.option_text}
              </span>
            </label>
          ))}
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          {currentQ > 0 && (
            <Button variant="outline" onClick={goPrev} disabled={submitting}>
              &lsaquo; Previous
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          {currentQ < questions.length - 1 ? (
            <Button onClick={goNext} disabled={submitting}>
              Next &rsaquo;
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} disabled={submitting}
              className="bg-accent hover:bg-accent/90 text-white">
              {allAnswered ? 'Submit All Answers' : 'Submit'}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
