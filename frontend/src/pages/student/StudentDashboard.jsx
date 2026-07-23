import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Clock, BarChart3, ChevronRight, Play, Star, ChevronLeft, ChevronLast } from 'lucide-react'
import { useGetMyEnrollmentsQuery, useGetEnrichedCoursesQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { WelcomeBanner } from '../../components/layout'

const TABS = [
  { key: 'all', label: 'All Courses' },
  { key: 'not_started', label: 'Not Started' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'completed', label: 'Completed' },
]

function statusConfig(progress) {
  if (progress >= 100) return { label: 'Completed', bg: 'bg-emerald-500' }
  if (progress > 0) return { label: 'In Progress', bg: 'bg-purple-500' }
  return { label: 'Not Started', bg: 'bg-slate-400' }
}

function TeacherAvatar({ name }) {
  const initial = (name || 'T').charAt(0).toUpperCase()
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
      {initial}
    </div>
  )
}

function CourseCard({ course, enrollment }) {
  const navigate = useNavigate()
  const progress = enrollment?.progress ?? 0
  const status = statusConfig(progress)

  const category = useMemo(() => {
    const catMap = {
      python: 'Technology',
      javascript: 'Technology',
      'ui/ux': 'Design',
      design: 'Design',
      maths: 'Science',
      data: 'Data Science',
      business: 'Business',
      marketing: 'Marketing',
    }
    const key = Object.keys(catMap).find((k) => course.title?.toLowerCase().includes(k))
    return key ? catMap[key] : 'General'
  }, [course.title])

  return (
    <div className="bg-white border border-slate-200 rounded-card shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden group">
      <div className="relative h-44 bg-slate-100 overflow-hidden">
        {course.cover_image ? (
          <img src={course.cover_image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300">
            <BookOpen size={44} />
          </div>
        )}
        <span className={`absolute top-3 left-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-white ${status.bg}`}>
          {status.label}
        </span>
      </div>

      <div className="flex items-center justify-between px-4 pt-3 pb-1">
        <div className="flex items-center gap-2">
          <TeacherAvatar name={course.teacher_name} />
          <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{course.teacher_name}</span>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600">
          {category}
        </span>
      </div>

      <div className="px-4 pt-1 pb-1 flex-1">
        <h3 className="font-semibold text-slate-800 text-sm leading-snug line-clamp-2">{course.title}</h3>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span className="flex items-center gap-1">
            <BookOpen size={12} />
            {course.sections_count || 0} {(course.sections_count || 0) === 1 ? 'Lesson' : 'Lessons'}
          </span>
          <span className="flex items-center gap-1">
            <Clock size={12} />
            {course.total_duration || '0h'}
          </span>
        </div>
      </div>

      <div className="px-4 pb-2">
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span>Progress</span>
          <span className="font-medium text-slate-700">{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress >= 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-purple-500' : 'bg-slate-200'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="px-4 pb-4 mt-auto">
        <button
          onClick={() => navigate(`/student/learning/${course.id}`)}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
        >
          <Play size={14} />
          {progress > 0 ? 'Continue' : 'Start Learning'}
        </button>
      </div>
    </div>
  )
}

function EmptyDashboard() {
  const navigate = useNavigate()
  return (
    <Card>
      <CardBody>
        <EmptyState
          icon={BookOpen}
          title="No enrolled courses yet"
          description="Browse our catalog and enroll in a course to get started."
        />
        <div className="flex justify-center mt-4">
          <button
            onClick={() => navigate('/student/browse')}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
          >
            Browse Courses <ChevronRight size={16} />
          </button>
        </div>
      </CardBody>
    </Card>
  )
}

const ITEMS_PER_PAGE = 6

export default function StudentDashboard() {
  const { data: enrollments, isLoading: enrollLoading } = useGetMyEnrollmentsQuery()
  const { data: enriched, isLoading: coursesLoading } = useGetEnrichedCoursesQuery()
  const [activeTab, setActiveTab] = useState('all')
  const [page, setPage] = useState(1)

  const loading = enrollLoading || coursesLoading

  const enrolledCourses = useMemo(() => {
    if (!enrollments || !enriched?.courses) return []
    const enrollmentMap = {}
    enrollments.forEach((e) => {
      const cid = typeof e.course_id === 'object' ? e.course_id.$oid : e.course_id
      enrollmentMap[cid] = e
    })
    return enriched.courses
      .filter((c) => enrollmentMap[c.id])
      .map((c) => ({ ...c, enrollment: enrollmentMap[c.id] }))
  }, [enrollments, enriched])

  const counts = useMemo(() => {
    const all = enrolledCourses.length
    const not_started = enrolledCourses.filter((c) => (c.enrollment?.progress ?? 0) === 0).length
    const in_progress = enrolledCourses.filter((c) => {
      const p = c.enrollment?.progress ?? 0
      return p > 0 && p < 100
    }).length
    const completed = enrolledCourses.filter((c) => (c.enrollment?.progress ?? 0) >= 100).length
    return { all, not_started, in_progress, completed }
  }, [enrolledCourses])

  const filtered = useMemo(() => {
    if (activeTab === 'all') return enrolledCourses
    if (activeTab === 'not_started') return enrolledCourses.filter((c) => (c.enrollment?.progress ?? 0) === 0)
    if (activeTab === 'in_progress') {
      return enrolledCourses.filter((c) => {
        const p = c.enrollment?.progress ?? 0
        return p > 0 && p < 100
      })
    }
    if (activeTab === 'completed') return enrolledCourses.filter((c) => (c.enrollment?.progress ?? 0) >= 100)
    return enrolledCourses
  }, [enrolledCourses, activeTab])

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE) || 1
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * ITEMS_PER_PAGE
    return filtered.slice(start, start + ITEMS_PER_PAGE)
  }, [filtered, page])

  const handleTabChange = (key) => {
    setActiveTab(key)
    setPage(1)
  }

  if (loading) return <Spinner size={40} />

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      <div>
        <h1 className="text-xl font-bold text-slate-800">Enrolled Courses</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track and continue your learning journey.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {tab.label}
            <span className={`inline-flex items-center justify-center min-w-[20px] h-5 rounded-full text-[11px] font-semibold ${
              activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
            }`}>
              {counts[tab.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {enrolledCourses.length === 0 ? (
        <EmptyDashboard />
      ) : filtered.length === 0 ? (
        <Card><CardBody>
          <EmptyState title="No courses match this filter" description="Try a different filter tab." />
        </CardBody></Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedItems.map((c) => (
              <CourseCard key={c.id} course={c} enrollment={c.enrollment} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded-card border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} /> Prev
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`min-w-[32px] h-8 rounded-card text-sm font-medium transition-colors cursor-pointer ${
                    p === page ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="inline-flex items-center gap-1 rounded-card border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
