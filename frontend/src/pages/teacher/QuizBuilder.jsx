import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit3, Clock, HelpCircle, ListChecks, Sparkles, FileText, Upload, Check, X, Pencil } from 'lucide-react'
import {
  useGetCourseQuizzesQuery,
  useCreateQuizMutation,
  useDeleteQuizMutation,
  useAddQuestionMutation,
  useGenerateAIQuizMutation,
} from '../../features/core/coreApi'
import { useGetCourseDetailQuery } from '../../features/console/consoleApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function AIGenerationModal({ courseId, open, onClose, onGenerated }) {
  const [generateAI] = useGenerateAIQuizMutation()
  const [mode, setMode] = useState('existing_materials')
  const [pdfFile, setPdfFile] = useState(null)
  const [difficulty, setDifficulty] = useState('medium')
  const [numMCQ, setNumMCQ] = useState(5)
  const [numTF, setNumTF] = useState(3)
  const [numShort, setNumShort] = useState(2)
  const [generating, setGenerating] = useState(false)

  const handleGenerate = async () => {
    if (mode === 'uploaded_pdf' && !pdfFile) {
      toast.error('Please upload a PDF file')
      return
    }
    setGenerating(true)
    try {
      const result = await generateAI({
        courseId,
        generation_mode: mode,
        uploaded_pdf: pdfFile,
        difficulty,
        number_of_mcqs: numMCQ,
        number_of_true_false: numTF,
        number_of_short: numShort,
      }).unwrap()
      onGenerated(result)
      toast.success('Questions generated successfully')
      onClose()
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to generate questions')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="✨ Generate with AI" className="max-w-lg">
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">Generation Source</label>
          <div className="flex gap-3">
            <label className={`flex-1 flex items-center justify-center gap-2 rounded-btn border-2 px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${mode === 'existing_materials' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
              <input type="radio" name="ai-mode" checked={mode === 'existing_materials'} onChange={() => setMode('existing_materials')} className="sr-only" />
              <FileText size={18} /> Course Materials
            </label>
            <label className={`flex-1 flex items-center justify-center gap-2 rounded-btn border-2 px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${mode === 'uploaded_pdf' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
              <input type="radio" name="ai-mode" checked={mode === 'uploaded_pdf'} onChange={() => setMode('uploaded_pdf')} className="sr-only" />
              <Upload size={18} /> Upload PDF
            </label>
          </div>
        </div>

        {mode === 'uploaded_pdf' && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Upload PDF</label>
            <div className="border-2 border-dashed border-slate-300 rounded-btn p-4 text-center hover:border-primary transition-colors cursor-pointer" onClick={() => document.getElementById('ai-pdf-input')?.click()}>
              <input id="ai-pdf-input" type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} />
              {pdfFile ? (
                <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                  <FileText size={16} /> {pdfFile.name}
                  <button onClick={(e) => { e.stopPropagation(); setPdfFile(null) }} className="text-slate-400 hover:text-danger cursor-pointer"><X size={14} /></button>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  <Upload size={20} className="mx-auto mb-1 text-slate-400" />
                  Click to upload a PDF file
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}
            className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <Input label="MCQs" type="number" min={0} max={20} value={numMCQ} onChange={(e) => setNumMCQ(Number(e.target.value))} />
          <Input label="True/False" type="number" min={0} max={20} value={numTF} onChange={(e) => setNumTF(Number(e.target.value))} />
          <Input label="Short Answer" type="number" min={0} max={20} value={numShort} onChange={(e) => setNumShort(Number(e.target.value))} />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleGenerate} loading={generating} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
            <Sparkles size={14} /> {generating ? 'Generating...' : 'Generate'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function AIQuestionCard({ question, type, index, onEdit, onDelete }) {
  const isMCQ = type === 'mcq'
  const isTF = type === 'true_false'
  const isShort = type === 'short'

  const typeColors = {
    mcq: 'bg-blue-50 text-blue-700 border-blue-200',
    true_false: 'bg-amber-50 text-amber-700 border-amber-200',
    short: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }

  const typeLabels = {
    mcq: 'MCQ',
    true_false: 'True/False',
    short: 'Short Answer',
  }

  return (
    <div className="bg-white border border-slate-200 rounded-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${typeColors[type]}`}>{typeLabels[type]}</span>
            {question.topic && <span className="text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{question.topic}</span>}
            <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
              question.difficulty === 'easy' ? 'bg-green-50 text-green-700' :
              question.difficulty === 'hard' ? 'bg-red-50 text-red-700' :
              'bg-amber-50 text-amber-700'
            }`}>{question.difficulty}</span>
          </div>
          <p className="text-sm font-semibold text-slate-800">
            <span className="text-slate-400 mr-1.5 font-normal">{index + 1}.</span> {question.question}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={() => onEdit(index)} className="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-card transition-colors cursor-pointer">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(index)} className="p-1.5 text-slate-400 hover:text-danger hover:bg-red-50 rounded-card transition-colors cursor-pointer">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {isMCQ && (
        <div className="mt-3 space-y-2">
          {question.options?.map((opt, oi) => (
            <div key={oi} className={`flex items-center gap-2.5 px-3 py-2 rounded-card border ${opt === question.correct_answer ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${opt === question.correct_answer ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              <span className={`text-sm ${opt === question.correct_answer ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>{opt}</span>
              {opt === question.correct_answer && <Check size={12} className="text-emerald-500 shrink-0 ml-auto" />}
            </div>
          ))}
        </div>
      )}

      {isTF && (
        <div className="mt-3 flex items-center gap-3">
          <span className={`text-xs font-semibold px-3 py-1 rounded-full ${question.answer ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {question.answer ? 'True' : 'False'}
          </span>
        </div>
      )}

      {isShort && (
        <div className="mt-3 bg-slate-50 rounded-card p-3 border border-slate-200">
          <p className="text-xs font-medium text-slate-500 mb-1">Answer ({question.marks} marks)</p>
          <p className="text-sm text-slate-700">{question.answer}</p>
        </div>
      )}

      {question.explanation && (
        <div className="mt-3 bg-indigo-50/50 rounded-card px-3 py-2 border border-indigo-100">
          <p className="text-xs font-medium text-indigo-600 mb-0.5">Explanation</p>
          <p className="text-xs text-indigo-800/70">{question.explanation}</p>
        </div>
      )}

      {question.estimated_time && (
        <p className="mt-2 text-[11px] text-slate-400">Estimated time: {question.estimated_time}s</p>
      )}
    </div>
  )
}

export default function QuizBuilder() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { data: course } = useGetCourseDetailQuery(courseId, { skip: !courseId })
  const { data: quizzes, isLoading, refetch } = useGetCourseQuizzesQuery(courseId, { skip: !courseId })
  const [createQuiz] = useCreateQuizMutation()
  const [deleteQuiz] = useDeleteQuizMutation()
  const [addQuestion] = useAddQuestionMutation()
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', time_limit_minutes: '' })
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiQuestions, setAiQuestions] = useState(null)
  const [publishing, setPublishing] = useState(false)

  if (!courseId) return <EmptyState icon={HelpCircle} title="Invalid course" description="Course ID is missing." />

  const openCreate = () => {
    setForm({ title: '', time_limit_minutes: '30' })
    setModalOpen(true)
  }

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.time_limit_minutes || Number(form.time_limit_minutes) < 1) { toast.error('Time limit must be at least 1 minute'); return }
    setSaving(true)
    try {
      await createQuiz({ courseId, title: form.title.trim(), time_limit_minutes: Number(form.time_limit_minutes) }).unwrap()
      toast.success('Quiz created')
      setModalOpen(false)
      refetch()
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to create quiz')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Delete quiz "${title}"? This cannot be undone.`)) return
    try {
      await deleteQuiz(id).unwrap()
      toast.success('Quiz deleted')
      refetch()
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete quiz')
    }
  }

  const handleAIGenerated = (result) => {
    const all = []
    if (result.mcqs) all.push(...result.mcqs.map(q => ({ ...q, _type: 'mcq' })))
    if (result.true_false) all.push(...result.true_false.map(q => ({ ...q, _type: 'true_false' })))
    if (result.short_questions) all.push(...result.short_questions.map(q => ({ ...q, _type: 'short' })))
    setAiQuestions(all)
  }

  const removeAIQuestion = (index) => {
    setAiQuestions(prev => prev.filter((_, i) => i !== index))
  }

  const editAIQuestion = (index) => {
    const q = aiQuestions[index]
    const newText = prompt('Edit question:', q.question)
    if (newText && newText.trim()) {
      setAiQuestions(prev => prev.map((item, i) => i === index ? { ...item, question: newText.trim() } : item))
    }
  }

  const handlePublishAI = async () => {
    if (!aiQuestions || aiQuestions.length === 0) {
      toast.error('No questions to publish')
      return
    }
    const quizTitle = prompt('Enter quiz title:', `AI Quiz - ${course?.title || ''}`)
    if (!quizTitle || !quizTitle.trim()) return
    setPublishing(true)
    try {
      const quiz = await createQuiz({
        courseId,
        title: quizTitle.trim(),
        time_limit_minutes: 30,
        difficulty_level: 'medium',
      }).unwrap()

      for (const q of aiQuestions) {
        if (q._type === 'mcq') {
          await addQuestion({
            quizId: quiz.id,
            question_text: q.question,
            options: q.options.map(opt => ({
              option_text: opt,
              is_correct: opt === q.correct_answer,
            })),
            marks: 1,
          }).unwrap()
        } else if (q._type === 'true_false') {
          await addQuestion({
            quizId: quiz.id,
            question_text: q.question,
            options: [
              { option_text: 'True', is_correct: q.answer === true },
              { option_text: 'False', is_correct: q.answer === false },
            ],
            marks: 1,
          }).unwrap()
        } else if (q._type === 'short') {
          await addQuestion({
            quizId: quiz.id,
            question_text: q.question,
            options: [
              { option_text: q.answer, is_correct: true },
              { option_text: '', is_correct: false },
            ],
            marks: q.marks || 5,
          }).unwrap()
        }
      }

      toast.success(`AI Quiz "${quizTitle}" published with ${aiQuestions.length} questions`)
      setAiQuestions(null)
      refetch()
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to publish quiz')
    } finally {
      setPublishing(false)
    }
  }

  const discardAIQuestions = () => {
    if (aiQuestions && aiQuestions.length > 0 && !window.confirm('Discard all generated questions?')) return
    setAiQuestions(null)
  }

  if (isLoading) return <Spinner size={32} />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Quiz</h1>
          {course && <p className="text-sm text-slate-500 mt-0.5">{course.title}</p>}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => setAiModalOpen(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
            <Sparkles size={14} /> Generate with AI
          </Button>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-white" onClick={openCreate}>
            <Plus size={14} /> Add Quiz
          </Button>
        </div>
      </div>

      <AIGenerationModal courseId={courseId} open={aiModalOpen} onClose={() => setAiModalOpen(false)} onGenerated={handleAIGenerated} />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Quiz" size="md">
        <div className="space-y-4">
          <Input label="Quiz Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Midterm Exam" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Time Limit (minutes)" type="number" value={form.time_limit_minutes} onChange={(e) => setForm((p) => ({ ...p, time_limit_minutes: e.target.value }))} placeholder="30" />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create</Button>
          </div>
        </div>
      </Modal>

      {quizzes && quizzes.length > 0 && (
        <div className="space-y-2">
          {quizzes.map((q) => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/teacher/quizzes/${q.id}`)}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{q.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <HelpCircle size={12} /> {q.question_count || 0} Questions
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <Clock size={12} /> {q.time_limit_minutes} Minutes
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => navigate(`/teacher/quizzes/${q.id}/results`)}
                    className="text-xs text-accent underline hover:text-accent/80 mr-2 cursor-pointer whitespace-nowrap">
                    View Results
                  </button>
                  <button onClick={() => navigate(`/teacher/quizzes/${q.id}`)}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-card transition-colors cursor-pointer">
                    <Edit3 size={14} />
                  </button>
                  <button onClick={() => handleDelete(q.id, q.title)}
                    className="p-1.5 text-slate-400 hover:text-danger hover:bg-red-50 rounded-card transition-colors cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && (!quizzes || quizzes.length === 0) && !aiQuestions && (
        <Card><CardBody>
          <EmptyState icon={ListChecks} title="No quizzes yet" description="Create a quiz or generate one with AI." />
          <div className="flex justify-center gap-2 -mt-6">
            <Button size="sm" onClick={() => setAiModalOpen(true)} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
              <Sparkles size={14} /> Generate with AI
            </Button>
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-white" onClick={openCreate}>
              <Plus size={14} /> Add Quiz
            </Button>
          </div>
        </CardBody></Card>
      )}

      {aiQuestions && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-500" /> AI Generated Questions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">{aiQuestions.length} question{aiQuestions.length !== 1 ? 's' : ''} — review and publish</p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={discardAIQuestions}>Discard</Button>
                <Button size="sm" onClick={handlePublishAI} loading={publishing} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
                  <Check size={14} /> Publish AI Quiz
                </Button>
              </div>
            </div>
            <div className="space-y-3">
              {aiQuestions.map((q, i) => (
                <AIQuestionCard key={i} question={q} type={q._type} index={i} onEdit={editAIQuestion} onDelete={removeAIQuestion} />
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  )
}