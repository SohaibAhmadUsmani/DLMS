import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { ArrowLeft, Plus, Pencil, Trash2, Check, X, HelpCircle, ImageIcon, Upload } from 'lucide-react'
import {
  useGetQuizQuery,
  useAddQuestionMutation,
  useUpdateQuestionMutation,
  useDeleteQuestionMutation,
  useUploadQuestionImageMutation,
} from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function QuestionForm({ quizId, editingQuestion, onDone }) {
  const [addQuestion] = useAddQuestionMutation()
  const [updateQuestion] = useUpdateQuestionMutation()
  const [uploadQuestionImage] = useUploadQuestionImageMutation()
  const [saving, setSaving] = useState(false)
  const [questionText, setQuestionText] = useState('')
  const [options, setOptions] = useState([
    { option_text: '', is_correct: false },
    { option_text: '', is_correct: false },
  ])
  const [error, setError] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(editingQuestion?.image_url || null)
  const [savedImageUrl, setSavedImageUrl] = useState(editingQuestion?.image_url || null)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (editingQuestion) {
      setQuestionText(editingQuestion.question_text || '')
      setOptions(
        editingQuestion.options?.length >= 2
          ? editingQuestion.options.map((o) => ({ option_text: o.option_text, is_correct: o.is_correct }))
          : [{ option_text: '', is_correct: false }, { option_text: '', is_correct: false }]
      )
      setImagePreview(editingQuestion.image_url || null)
      setSavedImageUrl(editingQuestion.image_url || null)
    } else {
      setQuestionText('')
      setOptions([{ option_text: '', is_correct: false }, { option_text: '', is_correct: false }])
      setImageFile(null)
      setImagePreview(null)
      setSavedImageUrl(null)
    }
  }, [editingQuestion])

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const addOption = () => {
    if (options.length >= 6) return
    setOptions([...options, { option_text: '', is_correct: false }])
  }

  const removeOption = (i) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  const setCorrect = (i) => {
    setOptions(options.map((o, idx) => ({ ...o, is_correct: idx === i })))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!questionText.trim()) { setError('Question text is required'); return }
    if (options.some((o) => !o.option_text.trim())) { setError('All options must have text'); return }
    if (!options.some((o) => o.is_correct)) { setError('Select exactly one correct answer'); return }
    const payload = {
      question_text: questionText.trim(),
      options: options.map((o) => ({ option_text: o.option_text.trim(), is_correct: o.is_correct })),
    }
    setSaving(true)
    try {
      let questionId = editingQuestion?.id
      if (editingQuestion) {
        await updateQuestion({ id: editingQuestion.id, ...payload }).unwrap()
        toast.success('Question updated')
      } else {
        const result = await addQuestion({ quizId, ...payload }).unwrap()
        questionId = result.id
        toast.success('Question added')
      }
      if (imageFile && questionId) {
        await uploadQuestionImage({ questionId, file: imageFile }).unwrap()
      }
      onDone()
    } catch (err) {
      toast.error(err.data?.detail || 'Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="border border-indigo-200 rounded-card p-4 space-y-3 bg-indigo-50/50">
      <Input placeholder="Question text" value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
      <div>
        <p className="text-xs font-medium text-slate-600 mb-1">Question Image (optional)</p>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageSelect} className="hidden" />
          <button type="button" onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-card border border-slate-300 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer">
            <Upload size={14} /> {imagePreview ? 'Change Image' : 'Upload Image'}
          </button>
          {imagePreview && (
            <>
              <div className="relative">
                <img src={imagePreview} alt="Preview" className="h-12 w-20 object-cover rounded border border-slate-200" />
                <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); setSavedImageUrl(null) }}
                  className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-red-500 text-white flex items-center justify-center cursor-pointer">
                  <X size={10} />
                </button>
              </div>
              <span className="text-xs text-slate-400">{imageFile?.name || 'Existing image'}</span>
            </>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">Options <span className="text-slate-400 font-normal">({options.length}/6)</span></p>
        {options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2">
            <input type="radio" name="correctOption" checked={opt.is_correct} onChange={() => setCorrect(i)}
              className="shrink-0 accent-indigo-500 cursor-pointer" />
            <input type="text" value={opt.option_text} onChange={(e) => {
              const next = [...options]; next[i] = { ...next[i], option_text: e.target.value }; setOptions(next)
            }} placeholder={`Option ${i + 1}`}
              className="flex-1 rounded-btn border border-slate-300 px-3 py-1.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
            {options.length > 2 && (
              <button type="button" onClick={() => removeOption(i)}
                className="p-1 text-slate-400 hover:text-danger cursor-pointer">
                <X size={14} />
              </button>
            )}
          </div>
        ))}
        {options.length < 6 && (
          <button type="button" onClick={addOption}
            className="text-xs text-primary hover:underline cursor-pointer mt-1">+ Add option</button>
        )}
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <Button type="submit" size="sm" loading={saving}><Check size={14} /> {editingQuestion ? 'Update' : 'Add'}</Button>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
      </div>
    </form>
  )
}

export default function QuizQuestions() {
  const { quizId } = useParams()
  const navigate = useNavigate()
  const { data: quiz, isLoading, isError, refetch } = useGetQuizQuery(quizId, { skip: !quizId })
  const [deleteQuestion] = useDeleteQuestionMutation()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)

  if (!quizId) return <EmptyState icon={HelpCircle} title="Invalid quiz" description="Quiz ID is missing." />

  const questions = quiz?.questions || []

  const handleDelete = async (id, text) => {
    if (!window.confirm(`Delete "${text.slice(0, 40)}..."?`)) return
    try {
      await deleteQuestion(id).unwrap()
      toast.success('Question deleted')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to delete question')
    }
  }

  const done = () => { setShowForm(false); setEditing(null); refetch() }

  if (isLoading) return <Spinner size={32} />
  if (isError) return <Card><CardBody><EmptyState icon={HelpCircle} title="Failed to load quiz" description="Could not reach the server." /></CardBody></Card>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)}
          className="text-slate-400 hover:text-slate-600 cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-800">{quiz?.title || 'Quiz Questions'}</h1>
          {quiz && (
            <p className="text-sm text-slate-500">
              {quiz.question_count != null && `${quiz.question_count} question${quiz.question_count !== 1 ? 's' : ''}`}
              {quiz.time_limit_minutes != null && ` \u2022 ${quiz.time_limit_minutes} min`}
              {quiz.total_marks != null && ` \u2022 ${quiz.total_marks} marks`}
            </p>
          )}
        </div>
      </div>

      <div>
        {!showForm && !editing && (
          <Button size="sm" onClick={() => { setEditing(null); setShowForm(true) }}>
            <Plus size={14} /> Add Question
          </Button>
        )}
      </div>

      {(showForm || editing) && (
        <QuestionForm quizId={quizId} editingQuestion={editing} onDone={done} />
      )}

      {questions.length === 0 && !showForm && (
        <Card><CardBody>
          <EmptyState icon={HelpCircle} title="No questions yet" description="Add questions to this quiz." />
        </CardBody></Card>
      )}

      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="bg-white border border-slate-200 rounded-card p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-800 flex-1">
                  <span className="text-slate-400 mr-1.5 font-normal">{idx + 1}.</span> {q.question_text}
                </p>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => { setShowForm(false); setEditing(q) }}
                    className="p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50 rounded-card cursor-pointer">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(q.id, q.question_text)}
                    className="p-1.5 text-slate-400 hover:text-danger hover:bg-red-50 rounded-card cursor-pointer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              {q.image_url && (
                <div className="mt-3">
                  <img src={q.image_url} alt="Question" className="max-h-40 rounded-card border border-slate-200 object-contain" />
                </div>
              )}
              <div className="mt-3 space-y-2">
                {q.options.map((opt, oi) => (
                  <label key={oi} className={`flex items-center gap-2.5 px-3 py-2 rounded-card border cursor-pointer transition-colors ${
                    opt.is_correct ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}>
                    <input type="radio" name={`q-${idx}`} checked={opt.is_correct} readOnly
                      className={`shrink-0 cursor-default ${opt.is_correct ? 'accent-emerald-500' : 'accent-slate-300'}`} />
                    <span className={`text-sm ${opt.is_correct ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {opt.option_text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
