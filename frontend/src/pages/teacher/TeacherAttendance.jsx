import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGetCoursesQuery } from '../../features/console/consoleApi'
import { useAppSelector } from '../../app/hooks'
import Card, { CardBody } from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { UserCheck, ArrowRight, SearchX } from 'lucide-react'

export default function TeacherAttendance() {
  const navigate = useNavigate()
  const searchTerm = useAppSelector((s) => s.search.term)
  const { data, isLoading, isError } = useGetCoursesQuery()

  const courses = data?.courses || data || []

  const filtered = useMemo(() => {
    if (!searchTerm.trim()) return courses
    const q = searchTerm.toLowerCase()
    return courses.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q)
    )
  }, [courses, searchTerm])

  if (isLoading) return <Spinner size={32} />
  if (isError) {
    return (
      <Card><CardBody>
        <EmptyState icon={UserCheck} title="Failed to load courses" description="Could not reach the server." />
      </CardBody></Card>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">Attendance</h1>
      <p className="text-sm text-slate-500">Select a course to mark attendance.</p>

      {courses.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={UserCheck} title="No courses found" description="You need to be assigned to a course first." />
        </CardBody></Card>
      ) : filtered.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={SearchX} title="No results" description={`No courses match "${searchTerm}".`} />
        </CardBody></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => navigate(`/teacher/courses/${c.id}?tab=attendance`)}
              className="text-left bg-white border border-slate-200 rounded-card p-4 shadow-sm hover:shadow-md hover:border-primary/30 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <UserCheck size={16} className="text-primary shrink-0" />
                    <p className="font-semibold text-slate-800 truncate">{c.title}</p>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{c.description || 'No description'}</p>
                </div>
                <ArrowRight size={18} className="text-slate-300 shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
