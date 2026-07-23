import { useState, useMemo, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, BookOpen, CheckCircle, Circle, ChevronLeft, ChevronRight,
  FileText, Video, Play, Award, HelpCircle, Monitor,
  CheckSquare, Menu, X, Link as LinkIcon, FileType, Eye
} from 'lucide-react'
import { useGetCourseDetailDataQuery, useUpdateProgressMutation, useGetCourseQuizzesQuery } from '../../features/core/coreApi'
import Spinner from '../../components/ui/Spinner'

function getYouTubeId(url) {
  if (!url) return null
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

function isYouTubeUrl(url) {
  return !!getYouTubeId(url)
}

function VideoPlayer({ url, title }) {
  const youtubeId = getYouTubeId(url)
  if (youtubeId) {
    return (
      <div className="aspect-video bg-black rounded-card overflow-hidden">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${youtubeId}?modestbranding=1&rel=0&playsinline=1`}
          title={title || 'Video'}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    )
  }
  if (url) {
    return (
      <div className="aspect-video bg-black rounded-card overflow-hidden">
        <video src={url} controls controlsList="nodownload noremoteplayback" className="w-full h-full" />
      </div>
    )
  }
  return (
    <div className="aspect-video bg-slate-100 rounded-card flex items-center justify-center">
      <div className="text-center text-slate-400">
        <Play size={48} className="mx-auto mb-2" />
        <p className="text-sm">No video URL available</p>
      </div>
    </div>
  )
}

function ReadingMaterial({ material }) {
  const [showViewer, setShowViewer] = useState(false)
  const ext = material.file_url?.split('.').pop()?.toLowerCase()
  const isViewable = ext === 'pdf' || ext === 'ppt' || ext === 'pptx' || ext === 'doc' || ext === 'docx' || ext === 'xls' || ext === 'xlsx'
  return (
    <div className="bg-white border border-slate-200 rounded-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-card bg-emerald-50 flex items-center justify-center">
          <BookOpen size={24} className="text-emerald-600" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">{material.title}</h3>
          <p className="text-xs text-slate-500">Reading Material</p>
        </div>
      </div>
      <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
        {material.content}
      </div>
      {material.file_url && isViewable && !showViewer && (
        <button onClick={() => setShowViewer(true)}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 transition-colors shadow-sm cursor-pointer">
          <Eye size={16} /> View Resource
        </button>
      )}
      {material.file_url && isViewable && showViewer && (
        <div className="border border-slate-200 rounded-card overflow-hidden h-[500px]">
          <iframe
            src={material.file_url + (ext === 'pdf' ? '#toolbar=0' : '')}
            className="w-full h-full"
            title={material.title}
          />
        </div>
      )}
    </div>
  )
}

function ResourceViewer({ material }) {
  const [showViewer, setShowViewer] = useState(false)
  const ext = material.file_url?.split('.').pop()?.toLowerCase()
  const isPdf = ext === 'pdf' || material.file_type === 'pdf'
  const isDoc = ['ppt', 'pptx', 'doc', 'docx', 'xls', 'xlsx'].includes(ext)

  if (material.file_type === 'reading') return <ReadingMaterial material={material} />

  return (
    <div className="bg-white border border-slate-200 rounded-card p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-12 w-12 rounded-card bg-indigo-50 flex items-center justify-center">
          <FileText size={24} className="text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">{material.title}</h3>
          <p className="text-xs text-slate-500">{isPdf ? 'PDF Document' : isDoc ? 'Document' : 'Resource File'}</p>
        </div>
      </div>
      {(isPdf || isDoc) && material.file_url && !showViewer && (
        <button onClick={() => setShowViewer(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer">
          <Eye size={16} /> View Resource
        </button>
      )}
      {(isPdf || isDoc) && material.file_url && showViewer && (
        <div className="border border-slate-200 rounded-card overflow-hidden h-[500px]">
          <iframe
            src={material.file_url + (isPdf ? '#toolbar=0' : '')}
            className="w-full h-full"
            title={material.title}
          />
        </div>
      )}
    </div>
  )
}

function QuizContent({ courseId }) {
  const navigate = useNavigate()
  const { data: quizzes, isLoading } = useGetCourseQuizzesQuery(courseId)

  if (isLoading) return <Spinner size={24} />

  return (
    <div className="bg-white border border-slate-200 rounded-card p-6 text-center">
      <HelpCircle size={48} className="mx-auto text-slate-300 mb-3" />
      <h3 className="font-semibold text-slate-700 mb-1">Course Quiz</h3>
      <p className="text-sm text-slate-500 mb-4">
        {quizzes && quizzes.length > 0
          ? `${quizzes.length} quiz${quizzes.length > 1 ? 'zes' : ''} available for this course.`
          : 'Test your knowledge with a course quiz.'}
      </p>
      {quizzes && quizzes.length > 0 ? (
        <div className="space-y-2 max-w-sm mx-auto">
          {quizzes.map((q) => (
            <button
              key={q.id}
              onClick={() => navigate(`/student/quizzes`)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-card border border-slate-200 hover:border-primary/30 hover:bg-indigo-50/30 transition-colors text-left cursor-pointer"
            >
              <span className="text-sm font-medium text-slate-700">{q.title}</span>
              <span className="text-xs text-slate-400">{q.time_limit_minutes || 'No limit'} min</span>
            </button>
          ))}
        </div>
      ) : (
        <button
          onClick={() => navigate(`/student/quizzes`)}
          className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 transition-colors shadow-sm cursor-pointer"
        >
          <Award size={16} /> Go to Quizzes
        </button>
      )}
    </div>
  )
}

function getMaterialIcon(fileType, fileUrl) {
  if (fileType === 'video' || isYouTubeUrl(fileUrl)) return Video
  if (fileType === 'youtube') return LinkIcon
  if (fileType === 'reading') return BookOpen
  if (fileType === 'pdf') return FileText
  return FileType
}

export default function CourseLearning() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { data: detail, isLoading, isError } = useGetCourseDetailDataQuery(courseId)
  const [updateProgress] = useUpdateProgressMutation()
  const [activeMaterialId, setActiveMaterialId] = useState(null)
  const [completedIds, setCompletedIds] = useState(new Set())
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const allMaterials = useMemo(() => {
    if (!detail?.sections) return []
    const mats = []
    detail.sections.forEach((section) => {
      if (section.materials) {
        section.materials.forEach((m) => {
          mats.push({ ...m, sectionTitle: section.title, sectionId: section.id })
        })
      }
    })
    return mats
  }, [detail])

  const activeMaterial = useMemo(() => {
    if (!activeMaterialId) return allMaterials[0] || null
    return allMaterials.find((m) => m.id === activeMaterialId) || allMaterials[0] || null
  }, [activeMaterialId, allMaterials])

  useEffect(() => {
    if (allMaterials.length > 0 && !activeMaterialId) {
      setActiveMaterialId(allMaterials[0].id)
    }
  }, [allMaterials, activeMaterialId])

  const currentIndex = useMemo(() => {
    return allMaterials.findIndex((m) => m.id === activeMaterial?.id)
  }, [allMaterials, activeMaterial])

  const prevMaterial = currentIndex > 0 ? allMaterials[currentIndex - 1] : null
  const nextMaterial = currentIndex < allMaterials.length - 1 ? allMaterials[currentIndex + 1] : null

  const totalMaterials = allMaterials.length
  const completedCount = completedIds.size

  const progressPercent = totalMaterials > 0 ? Math.round((completedCount / totalMaterials) * 100) : 0

  const handleMarkComplete = async () => {
    if (!activeMaterial) return
    const newCompleted = new Set(completedIds)
    if (newCompleted.has(activeMaterial.id)) {
      newCompleted.delete(activeMaterial.id)
    } else {
      newCompleted.add(activeMaterial.id)
    }
    setCompletedIds(newCompleted)
    const newPct = totalMaterials > 0 ? Math.round((newCompleted.size / totalMaterials) * 100) : 0
    if (detail?.enrollment_id) {
      try {
        await updateProgress({ enrollmentId: detail.enrollment_id, progress: newPct }).unwrap()
      } catch {}
    }
  }

  const navigateToMaterial = (material) => {
    setActiveMaterialId(material.id)
  }

  const isCompleted = (materialId) => completedIds.has(materialId)

  if (isLoading) return <Spinner size={32} />
  if (isError) return <p className="text-slate-500 text-center py-12">Failed to load course content.</p>
  if (!detail?.id) return <p className="text-slate-500 text-center py-12">Course not found.</p>

  const course = detail

  return (
    <div className="flex flex-col min-h-[calc(100vh-5rem)]">
      {/* Top Bar */}
      <div className="flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/student')}
            className="p-2 rounded-card hover:bg-slate-100 text-slate-500 cursor-pointer"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-card hover:bg-slate-100 text-slate-500 lg:hidden cursor-pointer"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <h1 className="text-sm font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-md">
            {course.title}
          </h1>
        </div>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="hidden sm:inline">{completedCount}/{totalMaterials} completed</span>
          <div className="h-2 w-24 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
            <div
              className={`h-full rounded-full transition-all ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-primary'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="font-medium text-slate-700">{progressPercent}%</span>
        </div>
      </div>

      {/* Main Content + Sidebar */}
      <div className="flex flex-1 overflow-hidden">
        {/* Curriculum Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} lg:block w-full lg:w-80 xl:w-96 bg-white border-r border-slate-200 overflow-y-auto shrink-0`}>
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-800">Course Content</h2>
            <p className="text-xs text-slate-500 mt-0.5">{detail.sections?.length || 0} sections • {totalMaterials} lectures</p>
          </div>
          <div className="p-2">
            {detail.sections?.map((section) => {
              const sectionMats = section.materials || []
              const sectionCompleted = sectionMats.filter((m) => completedIds.has(m.id)).length
              return (
                <div key={section.id} className="mb-2">
                  <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                    <span className="truncate">{section.title}</span>
                    <span className="text-slate-400 ml-2 shrink-0">{sectionCompleted}/{sectionMats.length}</span>
                  </div>
                  {sectionMats.map((mat) => {
                    const Icon = getMaterialIcon(mat.file_type, mat.file_url)
                    const isActive = activeMaterial?.id === mat.id
                    const done = isCompleted(mat.id)
                    return (
                      <button
                        key={mat.id}
                        onClick={() => navigateToMaterial(mat)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-card text-left text-sm transition-colors cursor-pointer ${
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {done ? (
                          <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                        ) : (
                          <Circle size={14} className="text-slate-300 shrink-0" />
                        )}
                        <Icon size={14} className="shrink-0 text-slate-400" />
                        <span className="truncate">{mat.title}</span>
                      </button>
                    )
                  })}
                </div>
              )
            })}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          {activeMaterial ? (
            <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
              {/* Video Player */}
              {(activeMaterial.file_type === 'video' || activeMaterial.file_type === 'youtube' || isYouTubeUrl(activeMaterial.file_url)) && (
                <VideoPlayer url={activeMaterial.file_url} title={activeMaterial.title} />
              )}

              {/* Material Info */}
              <div>
                <div className="flex items-center gap-2 text-xs text-slate-400 mb-1">
                  <span>{activeMaterial.sectionTitle}</span>
                  <span>•</span>
                  <span className="capitalize">{activeMaterial.file_type || 'resource'}</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">{activeMaterial.title}</h2>
              </div>

              {/* Resource Content */}
              {(activeMaterial.file_type === 'reading' || (activeMaterial.file_type !== 'video' && activeMaterial.file_type !== 'youtube' && !isYouTubeUrl(activeMaterial.file_url))) && (
                <ResourceViewer material={activeMaterial} />
              )}

              {/* Quiz Link */}
              {(activeMaterial.file_type === 'quiz' || activeMaterial.title?.toLowerCase().includes('quiz')) && (
                <QuizContent courseId={courseId} />
              )}

              {/* Actions */}
              <div className="flex items-center justify-between gap-3 pt-4 border-t border-slate-200">
                <div className="flex gap-2">
                  {prevMaterial && (
                    <button
                      onClick={() => navigateToMaterial(prevMaterial)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <ChevronLeft size={16} /> Previous
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleMarkComplete}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-colors shadow-sm cursor-pointer ${
                      isCompleted(activeMaterial.id)
                        ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                        : 'bg-primary text-white hover:bg-indigo-700'
                    }`}
                  >
                    <CheckSquare size={16} />
                    {isCompleted(activeMaterial.id) ? 'Completed' : 'Mark as Complete'}
                  </button>
                  {nextMaterial && (
                    <button
                      onClick={() => navigateToMaterial(nextMaterial)}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
                    >
                      Next <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <BookOpen size={48} className="mx-auto mb-3" />
                <p className="text-sm">No content available yet.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
