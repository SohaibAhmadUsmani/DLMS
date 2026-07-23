import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { Search, BookOpen, Grid3X3, List, Star, Users, LogIn } from 'lucide-react'
import { useGetEnrichedCoursesQuery } from '../../features/core/coreApi'
import { useGetMyEnrollmentsQuery, useEnrollMutation, useCreateCheckoutSessionMutation } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import CourseCard from '../../components/course/CourseCard'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

import pythonImg from '../../assets/python.jpg'
import uiuxImg from '../../assets/ui-ux.jpg'
import mathsImg from '../../assets/maths.jpg'

const COURSE_IMAGES = {
  python: pythonImg,
  'ui/ux': uiuxImg,
  maths: mathsImg,
}

const COURSE_CATEGORIES = {
  python: 'Technology',
  'ui/ux': 'Design',
  maths: 'Science',
}

function getCourseImage(title) {
  const key = Object.keys(COURSE_IMAGES).find((k) => title.toLowerCase().includes(k))
  return key ? COURSE_IMAGES[key] : null
}

function getCategory(title) {
  const key = Object.keys(COURSE_CATEGORIES).find((k) => title.toLowerCase().includes(k))
  return key ? COURSE_CATEGORIES[key] : 'General'
}

export default function BrowseCourses() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('grid')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const { data: enriched, isLoading: coursesLoading, isError: coursesError } = useGetEnrichedCoursesQuery()
  const { data: enrollments } = useGetMyEnrollmentsQuery()
  const [enroll, { isLoading: enrolling }] = useEnrollMutation()
  const [createCheckoutSession] = useCreateCheckoutSessionMutation()

  const courses = enriched?.courses || []

  const enrolledIds = useMemo(() => {
    if (!enrollments) return new Set()
    return new Set(
      enrollments.map((e) => (typeof e.course_id === 'object' ? e.course_id.$oid : e.course_id))
    )
  }, [enrollments])

  const categories = useMemo(() => {
    const cats = new Set(courses.map((c) => getCategory(c.title)))
    return ['all', ...Array.from(cats).sort()]
  }, [courses])

  const filtered = useMemo(() => {
    if (!courses) return []
    const q = search.toLowerCase().trim()
    return courses.filter((c) => {
      if (q && !c.title.toLowerCase().includes(q) && !(c.description || '').toLowerCase().includes(q) && !(c.teacher_name || '').toLowerCase().includes(q)) return false
      if (categoryFilter !== 'all' && getCategory(c.title) !== categoryFilter) return false
      return true
    })
  }, [courses, search, categoryFilter])

  const handleEnroll = async (course) => {
    const courseId = course.id
    const price = course.price || 0
    if (price > 0) {
      try {
        const res = await createCheckoutSession(courseId).unwrap()
        window.location.href = res.url
      } catch (err) {
        toast.error(err.data?.detail || 'Failed to start checkout')
      }
    } else {
      try {
        await enroll(courseId).unwrap()
        toast.success('Successfully enrolled!')
        navigate(`/student/learning/${courseId}`)
      } catch (err) {
        if (err.status === 409) {
          toast.error('Already enrolled in this course')
          navigate(`/student/learning/${courseId}`)
        } else {
          toast.error(err.data?.detail || 'Enrollment failed')
        }
      }
    }
  }

  if (coursesLoading) return <Spinner size={40} />
  if (coursesError) {
    return (
      <Card><CardBody>
        <EmptyState icon={BookOpen} title="Failed to load courses" description="Could not reach the server. Please try again." />
      </CardBody></Card>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Browse Courses</h1>
        <p className="text-sm text-slate-500 mt-0.5">Find and enroll in courses.</p>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses, teachers..."
            aria-label="Search courses"
            className="w-full rounded-btn border border-slate-300 pl-9 pr-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
          className="rounded-btn border border-slate-300 px-3 py-2 text-sm text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
        <div className="flex items-center border border-slate-300 rounded-btn overflow-hidden shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 cursor-pointer ${viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            aria-label="Grid view"
          >
            <Grid3X3 size={16} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 cursor-pointer ${viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
            aria-label="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={BookOpen} title={search ? 'No matching courses' : 'No courses available'} description={search ? 'Try a different search term.' : 'Check back later for new courses.'} />
        </CardBody></Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {filtered.map((c) => {
            const isEnrolled = enrolledIds.has(c.id)
            return (
              <CourseCard
                key={c.id}
                course={c}
                variant="browse"
                coverImage={c.cover_image || getCourseImage(c.title)}
                category={getCategory(c.title)}
                status={isEnrolled ? 'in_progress' : 'not_started'}
                onView={isEnrolled ? () => navigate(`/student/learning/${c.id}`) : undefined}
                onEnroll={!isEnrolled ? () => handleEnroll(c) : undefined}
                enrolling={enrolling}
              />
            )
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-semibold text-slate-600">Course</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden sm:table-cell">Instructor</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden lg:table-cell">Students</th>
                <th className="text-left px-4 py-3 font-semibold text-slate-600 hidden md:table-cell">Rating</th>
                <th className="text-right px-4 py-3 font-semibold text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const isEnrolled = enrolledIds.has(c.id)
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-14 rounded-card bg-slate-100 overflow-hidden shrink-0">
                          {(c.cover_image || getCourseImage(c.title)) ? (
                            <img src={c.cover_image || getCourseImage(c.title)} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex items-center justify-center h-full text-slate-300"><BookOpen size={16} /></div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-slate-800 truncate">{c.title}</p>
                          <p className="text-xs text-slate-400 truncate">{c.description}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 hidden sm:table-cell">{c.teacher_name || '—'}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <Badge variant="neutral">{getCategory(c.title)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden lg:table-cell">
                      <div className="flex items-center gap-1">
                        <Users size={13} className="text-slate-400" />
                        <span>{c.credit_hours || 0}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star size={13} />
                        <span className="text-slate-600">{(c.average_rating || 0).toFixed(1)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEnrolled ? (
                        <Button size="sm" onClick={() => navigate(`/student/learning/${c.id}`)}>
                          Continue
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => handleEnroll(c)} loading={enrolling}>
                          <LogIn size={13} /> Enroll
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
