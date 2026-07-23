import { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import {
  ArrowLeft, BookOpen, Clock, Users, Play, Star, CheckCircle,
  ChevronDown, ChevronRight, Video, Monitor, Smartphone,
  FileText, Award, Infinity, Share2, Heart, BarChart3, Target,
  User, MessageSquare, Send, GraduationCap, Eye
} from 'lucide-react'

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
import { useGetCourseDetailDataQuery, useEnrollMutation, useGetMyEnrollmentsQuery, useCreateCheckoutSessionMutation } from '../../features/core/coreApi'
import { formatUSD } from '../../lib/formatCurrency'
import { useGetCourseReviewsQuery, useSubmitReviewMutation } from '../../features/console/consoleApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

function TeacherAvatar({ name, url, size = 'md' }) {
  const initial = (name || 'T').charAt(0).toUpperCase()
  const sizeClass = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-10 w-10 text-sm'
  if (url) {
    return <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover shrink-0`} />
  }
  return (
    <div className={`${sizeClass} flex items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0`}>
      {initial}
    </div>
  )
}

function SectionAccordion({ sections, courseId }) {
  const navigate = useNavigate()
  const [openSections, setOpenSections] = useState({})

  const toggle = (id) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const totalLectures = sections.reduce((sum, s) => sum + (s.materials?.length || 0), 0)

  return (
    <div className="space-y-2">
      {sections.length > 0 && (
        <p className="text-sm text-slate-500 mb-3">
          {totalLectures} {(totalLectures === 1 ? 'Lecture' : 'Lectures')}
        </p>
      )}
      {sections.map((section) => {
        const isOpen = openSections[section.id]
        const matCount = section.materials?.length || 0
        return (
          <div key={section.id} className="border border-slate-200 rounded-card overflow-hidden">
            <button
              onClick={() => toggle(section.id)}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                {isOpen ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                <span>{section.title}</span>
              </div>
              <span className="text-xs text-slate-400">{matCount} {(matCount === 1 ? 'lecture' : 'lectures')}</span>
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 divide-y divide-slate-50">
                {matCount === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400">No materials in this section.</p>
                ) : (
                  section.materials.map((mat) => (
                    <div key={mat.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Video size={14} className="text-slate-400 shrink-0" />
                        <span className="text-slate-700 truncate">{mat.title}</span>
                      </div>
                      {mat.file_url && isYouTubeUrl(mat.file_url) ? (
                        <button onClick={() => navigate(`/student/learning/${courseId}`)}
                          className="inline-flex items-center gap-1 rounded-card bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 shrink-0 ml-2 cursor-pointer">
                          <Eye size={12} /> Watch
                        </button>
                      ) : mat.file_type === 'reading' || mat.file_type === 'pdf' ? (
                        <a href={mat.file_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-card bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 shrink-0 ml-2 cursor-pointer">
                          <Eye size={12} /> View
                        </a>
                      ) : null}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function StarRating({ rating, size = 'sm' }) {
  const sizeClass = size === 'lg' ? 'text-lg' : 'text-sm'
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={`${sizeClass} ${s <= Math.round(rating || 0) ? 'text-amber-400' : 'text-slate-200'}`}>★</span>
      ))}
    </div>
  )
}

export default function StudentCourseDetail() {
  const { courseId } = useParams()
  const navigate = useNavigate()
  const { data: detail, isLoading, isError } = useGetCourseDetailDataQuery(courseId)
  const { data: reviews, isLoading: reviewsLoading } = useGetCourseReviewsQuery(courseId)
  const [enroll, { isLoading: enrolling }] = useEnrollMutation()
  const [createCheckoutSession, { isLoading: checkoutLoading }] = useCreateCheckoutSessionMutation()
  const [submitReview] = useSubmitReviewMutation()
  const [commentName, setCommentName] = useState('')
  const [commentEmail, setCommentEmail] = useState('')
  const [commentSubject, setCommentSubject] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentSaving, setCommentSaving] = useState(false)

  const handleEnroll = async () => {
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
      } catch (err) {
        if (err.status === 409) {
          toast.error('Already enrolled in this course')
        } else {
          toast.error(err.data?.detail || 'Enrollment failed')
        }
      }
    }
  }

  const handleCommentSubmit = async () => {
    if (!commentText.trim()) { toast.error('Please write a comment'); return }
    setCommentSaving(true)
    try {
      await submitReview({
        courseId,
        rating: 5,
        comment: `${commentName || 'Anonymous'}\n${commentEmail || ''}\n${commentSubject || ''}\n\n${commentText.trim()}`
      }).unwrap()
      toast.success('Comment posted!')
      setCommentName('')
      setCommentEmail('')
      setCommentSubject('')
      setCommentText('')
    } catch (err) {
      if (err.status === 409) {
        toast.error('You have already posted a review')
      } else {
        toast.error(err.data?.detail || 'Failed to post comment')
      }
    } finally {
      setCommentSaving(false)
    }
  }

  const course = detail || {}
  const teacher = course.teacher || {}
  const sections = course.sections || []
  const totalLectures = sections.reduce((sum, s) => sum + (s.materials?.length || 0), 0)

  const difficultyLabel = useMemo(() => {
    const map = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', high: 'Advanced', medium: 'Intermediate', low: 'Beginner' }
    return map[course.difficulty_level] || course.difficulty_level || 'All Levels'
  }, [course.difficulty_level])

  const includes = [
    { icon: Video, label: `${course.total_duration || '0'} on-demand video` },
    { icon: Eye, label: 'Viewable resources' },
    { icon: Infinity, label: 'Lifetime access' },
    { icon: Monitor, label: 'Access on mobile and TV' },
    { icon: FileText, label: `${totalLectures} lectures` },
    { icon: Award, label: 'Certificate of completion' },
  ]

  const features = [
    { icon: Users, label: 'Students', value: course.students_count || 0 },
    { icon: Clock, label: 'Duration', value: course.total_duration || '0h' },
    { icon: BookOpen, label: 'Lessons', value: totalLectures || sections.length || 0 },
    { icon: Video, label: 'Video', value: course.total_duration || '0h' },
    { icon: BarChart3, label: 'Level', value: difficultyLabel },
  ]

  if (isLoading) return <Spinner size={32} />
  if (isError) return <p className="text-slate-500 text-center py-12">Failed to load course details.</p>
  if (!detail || !detail.id) return <p className="text-slate-500 text-center py-12">Course not found.</p>

  return (
    <div className="space-y-6">
      <button
        onClick={() => navigate('/student')}
        className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 cursor-pointer"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </button>

      {/* ── Top Section: Preview + Course Info ── */}
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 relative rounded-card overflow-hidden bg-slate-800 aspect-video">
          {course.cover_image ? (
            <img src={course.cover_image} alt={course.title} className="w-full h-full object-cover" />
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <BookOpen size={64} />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg cursor-pointer hover:bg-white transition-colors">
              <Play size={28} className="text-primary ml-1" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-2xl font-bold text-slate-800 leading-tight">{course.title}</h1>
          <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>

          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><BookOpen size={14} /> {totalLectures || sections.length || 0} {(totalLectures || sections.length || 0) === 1 ? 'Lesson' : 'Lessons'}</span>
            <span className="flex items-center gap-1"><Clock size={14} /> {course.total_duration || '0h'}</span>
            <span className="flex items-center gap-1"><Users size={14} /> {course.students_count || 0} {(course.students_count || 0) === 1 ? 'Student' : 'Students'}</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600">
              {difficultyLabel}
            </span>
          </div>

          {/* Instructor Row */}
          <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
            <TeacherAvatar name={teacher.name} url={teacher.profile_picture_url} size="lg" />
            <div>
              <p className="text-sm font-medium text-slate-800">{teacher.name || 'Instructor'}</p>
              <p className="text-xs text-slate-500">Instructor</p>
              <div className="flex items-center gap-2 mt-0.5">
                <StarRating rating={course.average_rating} />
                <span className="text-xs text-slate-500">({course.reviews_count || 0} {(course.reviews_count || 0) === 1 ? 'review' : 'reviews'})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Main Content + Sidebar ── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* ── Main Content ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Overview */}
          <Card title="Overview">
            <CardBody className="space-y-4">
              {course.description && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Course Description</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{course.description}</p>
                </div>
              )}

              {course.what_you_will_learn?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">What you'll learn</h3>
                  <ul className="grid sm:grid-cols-2 gap-2">
                    {course.what_you_will_learn.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {course.requirements?.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">Requirements</h3>
                  <ul className="space-y-1">
                    {course.requirements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                        <div className="h-1.5 w-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardBody>
          </Card>

          {/* Course Content */}
          {sections.length > 0 && (
            <Card title="Course Content">
              <CardBody>
                <SectionAccordion sections={sections} courseId={courseId} />
              </CardBody>
            </Card>
          )}

          {/* About the Instructor */}
          {teacher.name && (
            <Card title="About the Instructor">
              <CardBody className="space-y-4">
                <div className="flex items-start gap-4">
                  <TeacherAvatar name={teacher.name} url={teacher.profile_picture_url} size="lg" />
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-slate-800">{teacher.name}</h3>
                    <p className="text-xs text-slate-500">Instructor</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={course.average_rating} />
                      <span className="text-xs text-slate-500">{course.average_rating || 0} rating</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-slate-100">
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800">—</p>
                    <p className="text-xs text-slate-500">Courses</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800">{totalLectures}</p>
                    <p className="text-xs text-slate-500">Lessons</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800">{course.total_duration || '0'}</p>
                    <p className="text-xs text-slate-500">Hours</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-slate-800">{course.students_count || 0}</p>
                    <p className="text-xs text-slate-500">Students</p>
                  </div>
                </div>

                {teacher.bio && (
                  <p className="text-sm text-slate-600 leading-relaxed">{teacher.bio}</p>
                )}
              </CardBody>
            </Card>
          )}

          {/* Comments / Reviews Section */}
          <Card title={`Reviews (${reviews?.length || 0})`}>
            <CardBody className="space-y-4">
              {/* Post A Comment Form */}
              <div className="border border-indigo-200 rounded-card p-5 bg-indigo-50/50 space-y-4">
                <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <MessageSquare size={16} /> Post A Comment
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Name"
                    className="w-full rounded-card border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  <input
                    value={commentEmail}
                    onChange={(e) => setCommentEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    className="w-full rounded-card border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                </div>
                <input
                  value={commentSubject}
                  onChange={(e) => setCommentSubject(e.target.value)}
                  placeholder="Subject"
                  className="w-full rounded-card border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write your comment..."
                  rows={4}
                  className="w-full rounded-card border border-slate-300 px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y"
                />
                <Button onClick={handleCommentSubmit} loading={commentSaving}>
                  <Send size={14} /> Submit
                </Button>
              </div>

              {/* Existing Reviews */}
              {reviewsLoading ? (
                <Spinner size={20} />
              ) : reviews && reviews.length > 0 ? (
                <div className="space-y-3">
                  {reviews.map((r, i) => {
                    const parts = (r.comment || '').split('\n\n')
                    const header = parts[0]?.split('\n') || []
                    const body = parts.slice(1).join('\n\n') || parts[0]
                    return (
                      <div key={r.id || i} className="border border-slate-200 rounded-card p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                              {(header[0] || r.student_name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{header[0] || r.student_name || 'Student'}</p>
                              {header[1] && <p className="text-xs text-slate-400">{header[1]}</p>}
                            </div>
                          </div>
                          <div className="flex items-center gap-0.5">
                            {[1, 2, 3, 4, 5].map((s) => (
                              <span key={s} className={s <= (r.rating || 0) ? 'text-amber-400 text-sm' : 'text-slate-300 text-sm'}>★</span>
                            ))}
                          </div>
                        </div>
                        {header[2] && <p className="text-xs font-medium text-slate-500 mt-2">{header[2]}</p>}
                        {body && <p className="text-sm text-slate-600 mt-1">{body}</p>}
                        {r.created_at && <p className="text-xs text-slate-400 mt-1">{new Date(r.created_at).toLocaleDateString()}</p>}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-500">No comments yet. Be the first to share your thoughts!</p>
              )}
            </CardBody>
          </Card>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {/* Pricing Card */}
          <Card>
            <CardBody className="space-y-4">
              <div className="flex items-baseline gap-2">
                {(course.price || 0) > 0 ? (
                  <>
                    <span className="text-3xl font-bold text-slate-800">{formatUSD(course.price)}</span>
                  </>
                ) : (
                  <span className="text-3xl font-bold text-slate-800">FREE</span>
                )}
              </div>

              {course.is_enrolled ? (
                <Button className="w-full" onClick={() => navigate(`/student/learning/${courseId}`)}>
                  <Play size={16} /> Continue Learning
                </Button>
              ) : (
                <Button className="w-full" onClick={handleEnroll} loading={enrolling || checkoutLoading}>
                  <GraduationCap size={16} /> {(course.price || 0) > 0 ? 'Enroll Now' : 'Enroll Now'}
                </Button>
              )}

              <div className="flex gap-2">
                <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-card border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                  <Heart size={14} /> Wishlist
                </button>
                <button className="flex-1 inline-flex items-center justify-center gap-2 rounded-card border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                  <Share2 size={14} /> Share
                </button>
              </div>
            </CardBody>
          </Card>

          {/* Includes Card */}
          {includes.length > 0 && (
            <Card title="Includes">
              <CardBody className="space-y-3">
                {includes.map((item, i) => (
                  <div key={i} className="flex items-center gap-3 text-sm text-slate-600">
                    <item.icon size={16} className="text-slate-400 shrink-0" />
                    {item.label}
                  </div>
                ))}
              </CardBody>
            </Card>
          )}

          {/* Course Features Card */}
          {features.length > 0 && (
            <Card title="Course Features">
              <CardBody className="space-y-3">
                {features.map((item, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-500">
                      <item.icon size={16} className="text-slate-400" />
                      {item.label}
                    </span>
                    <span className="font-medium text-slate-700">{item.value}</span>
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
