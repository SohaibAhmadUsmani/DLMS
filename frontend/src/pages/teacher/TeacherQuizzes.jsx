import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Plus, Trash2, Edit3, Clock, HelpCircle, ListChecks, BookOpen, Sparkles, FileText, Upload, X } from 'lucide-react'
import { useGetMyQuizzesTeacherQuery, useCreateQuizMutation, useDeleteQuizMutation, useGenerateAIQuizMutation, useAddQuestionMutation } from '../../features/core/coreApi'
import { useGetCoursesQuery } from '../../features/console/consoleApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

export default function TeacherQuizzes() {
  const navigate = useNavigate()
  const { data: quizzes, isLoading, isError, refetch } = useGetMyQuizzesTeacherQuery()
  const { data: coursesData } = useGetCoursesQuery()
  const [createQuiz] = useCreateQuizMutation()
  const [deleteQuiz] = useDeleteQuizMutation()
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ courseId: '', title: '', time_limit_minutes: '30' })
  const [aiModalOpen, setAiModalOpen] = useState(false)
  const [aiCourseId, setAiCourseId] = useState('')
  const [aiMode, setAiMode] = useState('existing_materials')
  const [aiPdfFile, setAiPdfFile] = useState(null)
  const [aiDifficulty, setAiDifficulty] = useState('medium')
  const [aiNumMCQ, setAiNumMCQ] = useState(5)
  const [aiNumTF, setAiNumTF] = useState(3)
  const [aiNumShort, setAiNumShort] = useState(2)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [generateAI] = useGenerateAIQuizMutation()
  const [addQuestion] = useAddQuestionMutation()

  const courses = coursesData?.courses || coursesData || []

  const openCreate = () => {
    setForm({ courseId: courses.length === 1 ? courses[0].id : '', title: '', time_limit_minutes: '30' })
    setModalOpen(true)
  }

  const handleCreate = async () => {
    if (!form.courseId) { toast.error('Select a course'); return }
    if (!form.title.trim()) { toast.error('Title is required'); return }
    if (!form.time_limit_minutes || Number(form.time_limit_minutes) < 1) { toast.error('Time limit must be at least 1 minute'); return }
    setSaving(true)
    try {
      await createQuiz({ courseId: form.courseId, title: form.title.trim(), time_limit_minutes: Number(form.time_limit_minutes) }).unwrap()
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

  const handleAIGenerate = async () => {
    if (!aiCourseId) { toast.error('Select a course'); return }
    if (aiMode === 'uploaded_pdf' && !aiPdfFile) { toast.error('Please upload a PDF file'); return }
    setAiGenerating(true)
    try {
      const result = await generateAI({
        courseId: aiCourseId,
        generation_mode: aiMode,
        uploaded_pdf: aiPdfFile,
        difficulty: aiDifficulty,
        number_of_mcqs: aiNumMCQ,
        number_of_true_false: aiNumTF,
        number_of_short: aiNumShort,
      }).unwrap()
      const quizTitle = prompt('Enter quiz title:', `AI Quiz - ${courses.find(c => c.id === aiCourseId)?.title || ''}`)
      if (!quizTitle || !quizTitle.trim()) { setAiGenerating(false); return }
      const quiz = await createQuiz({
        courseId: aiCourseId,
        title: quizTitle.trim(),
        time_limit_minutes: 30,
        difficulty_level: 'medium',
      }).unwrap()
      const allQuestions = []
      if (result.mcqs) allQuestions.push(...result.mcqs.map(q => ({ ...q, _type: 'mcq' })))
      if (result.true_false) allQuestions.push(...result.true_false.map(q => ({ ...q, _type: 'true_false' })))
      if (result.short_questions) allQuestions.push(...result.short_questions.map(q => ({ ...q, _type: 'short' })))
      for (const q of allQuestions) {
        if (q._type === 'mcq') {
          await addQuestion({
            quizId: quiz.id, question_text: q.question,
            options: q.options.map(opt => ({ option_text: opt, is_correct: opt === q.correct_answer })), marks: 1,
          }).unwrap()
        } else if (q._type === 'true_false') {
          await addQuestion({ quizId: quiz.id, question_text: q.question,
            options: [{ option_text: 'True', is_correct: q.answer === true }, { option_text: 'False', is_correct: q.answer === false }], marks: 1,
          }).unwrap()
        } else {
          await addQuestion({ quizId: quiz.id, question_text: q.question,
            options: [{ option_text: q.answer, is_correct: true }, { option_text: '', is_correct: false }], marks: q.marks || 5,
          }).unwrap()
        }
      }
      toast.success(`AI Quiz created with ${allQuestions.length} questions`)
      setAiModalOpen(false)
      refetch()
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to generate AI quiz')
    } finally {
      setAiGenerating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-xl font-bold text-slate-800">Quiz</h1>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => { setAiCourseId(courses.length === 1 ? courses[0].id : ''); setAiModalOpen(true) }}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
            <Sparkles size={14} /> Generate with AI
          </Button>
          <Button size="sm" className="bg-accent hover:bg-accent/90 text-white" onClick={openCreate}>
            <Plus size={14} /> Add Quiz
          </Button>
        </div>
      </div>

      <Modal open={aiModalOpen} onClose={() => setAiModalOpen(false)} title="✨ Generate with AI" className="max-w-lg">
        <div className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Course</label>
            <select value={aiCourseId} onChange={(e) => setAiCourseId(e.target.value)}
              className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
              <option value="">Select a course</option>
              {courses.map((c) => (<option key={c.id} value={c.id}>{c.title}</option>))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Source</label>
            <div className="flex gap-3">
              <label className={`flex-1 flex items-center justify-center gap-2 rounded-btn border-2 px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${aiMode === 'existing_materials' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
                <input type="radio" name="ai-mode" checked={aiMode === 'existing_materials'} onChange={() => setAiMode('existing_materials')} className="sr-only" />
                <FileText size={18} /> Course Materials
              </label>
              <label className={`flex-1 flex items-center justify-center gap-2 rounded-btn border-2 px-4 py-3 text-sm font-medium cursor-pointer transition-colors ${aiMode === 'uploaded_pdf' ? 'border-primary bg-primary/5 text-primary' : 'border-slate-300 text-slate-600 hover:border-slate-400'}`}>
                <input type="radio" name="ai-mode" checked={aiMode === 'uploaded_pdf'} onChange={() => setAiMode('uploaded_pdf')} className="sr-only" />
                <Upload size={18} /> Upload PDF
              </label>
            </div>
          </div>
          {aiMode === 'uploaded_pdf' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Upload PDF</label>
              <div className="border-2 border-dashed border-slate-300 rounded-btn p-4 text-center hover:border-primary transition-colors cursor-pointer" onClick={() => document.getElementById('ai-pdf')?.click()}>
                <input id="ai-pdf" type="file" accept=".pdf" className="hidden" onChange={(e) => setAiPdfFile(e.target.files?.[0] || null)} />
                {aiPdfFile ? (
                  <div className="flex items-center justify-center gap-2 text-sm text-primary font-medium">
                    <FileText size={16} /> {aiPdfFile.name}
                    <button onClick={(e) => { e.stopPropagation(); setAiPdfFile(null) }} className="text-slate-400 hover:text-danger cursor-pointer"><X size={14} /></button>
                  </div>
                ) : (
                  <div className="text-sm text-slate-500"><Upload size={20} className="mx-auto mb-1 text-slate-400" />Click to upload a PDF file</div>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
            <select value={aiDifficulty} onChange={(e) => setAiDifficulty(e.target.value)}
              className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="MCQs" type="number" min={0} max={20} value={aiNumMCQ} onChange={(e) => setAiNumMCQ(Number(e.target.value))} />
            <Input label="True/False" type="number" min={0} max={20} value={aiNumTF} onChange={(e) => setAiNumTF(Number(e.target.value))} />
            <Input label="Short Answer" type="number" min={0} max={20} value={aiNumShort} onChange={(e) => setAiNumShort(Number(e.target.value))} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setAiModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAIGenerate} loading={aiGenerating} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700">
              <Sparkles size={14} /> {aiGenerating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Quiz" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Course</label>
            <select
              value={form.courseId}
              onChange={(e) => setForm((p) => ({ ...p, courseId: e.target.value }))}
              className="w-full rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            >
              <option value="">Select a course</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </div>
          <Input label="Quiz Title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Midterm Exam" />
          <Input label="Time Limit (minutes)" type="number" value={form.time_limit_minutes} onChange={(e) => setForm((p) => ({ ...p, time_limit_minutes: e.target.value }))} placeholder="30" />
          <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} loading={saving}>Create</Button>
          </div>
        </div>
      </Modal>

      {isLoading ? <Spinner size={32} /> : isError ? (
        <Card><CardBody>
          <EmptyState icon={HelpCircle} title="Failed to load quizzes" description="Could not reach the server." />
        </CardBody></Card>
      ) : quizzes && quizzes.length > 0 ? (
        <div className="space-y-2">
          {quizzes.map((q) => (
            <div key={q.id} className="bg-white border border-slate-200 rounded-card p-4 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => navigate(`/teacher/quizzes/${q.id}`)}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800">{q.title}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <BookOpen size={12} /> {q.question_count || 0} Questions
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
      ) : (
        <Card><CardBody>
          <EmptyState icon={ListChecks} title="No quizzes yet" description="Create your first quiz or generate one with AI." />
        </CardBody></Card>
      )}
    </div>
  )
}
