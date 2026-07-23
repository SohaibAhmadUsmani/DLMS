import { BookOpen, LogIn, Eye, Pencil, Trash2, DollarSign } from 'lucide-react'
import { formatUSD } from '../../lib/formatCurrency'

function TeacherAvatar({ name }) {
  const initial = (name || 'T').charAt(0).toUpperCase()
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary shrink-0">
      {initial}
    </div>
  )
}

function statusConfig(status) {
  switch (status) {
    case 'completed':
      return { label: 'Completed', bg: 'bg-emerald-500 text-white' }
    case 'in_progress':
      return { label: 'In Progress', bg: 'bg-purple-500 text-white' }
    default:
      return { label: 'Not Started', bg: 'bg-white text-slate-700 border border-slate-300' }
  }
}

export default function CourseCard({
  course,
  variant = 'browse',
  coverImage,
  category,
  status = 'not_started',
  progress = 0,
  onEnroll,
  onView,
  onEdit,
  onDelete,
  enrolling,
}) {
  const isEnrolled = variant === 'student' || (variant === 'browse' && !!onView)

  return (
    <div className="bg-white border border-slate-200 rounded-card shadow-sm hover:shadow-md transition-shadow flex flex-col overflow-hidden">
      <div className="relative h-40 bg-slate-100 overflow-hidden">
        {coverImage ? (
          <img src={coverImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300">
            <BookOpen size={40} />
          </div>
        )}

        {variant !== 'teacher' && (
          <span className={`absolute top-3 left-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${statusConfig(status).bg}`}>
            {statusConfig(status).label}
          </span>
        )}
      </div>

      {variant !== 'teacher' && (
        <div className="flex items-center justify-between px-4 pt-3 pb-1">
          <div className="flex items-center gap-2">
            <TeacherAvatar name={course.teacher_name} />
            <span className="text-xs font-medium text-slate-700 truncate max-w-[120px]">{course.teacher_name}</span>
          </div>
          {category && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500">
              {category}
            </span>
          )}
        </div>
      )}

      <div className="px-4 pt-1 pb-2">
        <h3 className="font-semibold text-slate-800 text-sm leading-snug">{course.title}</h3>
        {(course.price || 0) > 0 && variant === 'browse' && (
          <p className="text-xs font-medium text-primary mt-1 flex items-center gap-1">
            <DollarSign size={12} /> {formatUSD(course.price)}
          </p>
        )}
      </div>

      {variant === 'teacher' && course.description && (
        <div className="px-4 pb-2 flex-1">
          <p className="text-xs text-slate-500 line-clamp-2">{course.description}</p>
        </div>
      )}

      {variant !== 'teacher' && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Progress</span>
            <span>{progress > 0 ? `${progress}%` : isEnrolled ? '0%' : '—'}</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${progress > 0 ? 'bg-purple-500' : status === 'completed' ? 'bg-emerald-500' : status === 'in_progress' ? 'bg-purple-500' : 'bg-slate-200'}`}
              style={{ width: `${Math.max(progress, isEnrolled ? 0 : 0)}%` }}
            />
          </div>
        </div>
      )}

      <div className="px-4 pb-4 mt-auto">
        {variant === 'teacher' ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onView}
              className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
            >
              <Eye size={14} />
              View
            </button>
            {onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Pencil size={14} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 px-3 py-2.5 text-sm font-medium text-danger hover:bg-red-50 transition-colors cursor-pointer"
              >
                <Trash2 size={14} className="text-danger" />
              </button>
            )}
          </div>
        ) : isEnrolled ? (
          <button
            onClick={onView}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors shadow-sm cursor-pointer"
          >
            {status === 'not_started' ? 'Start Learning' : 'Continue'}
          </button>
        ) : (
          <button
            onClick={onEnroll}
            disabled={enrolling}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-primary px-4 py-2.5 text-sm font-semibold text-primary hover:bg-primary hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            <LogIn size={15} />
            Enroll Now
          </button>
        )}
      </div>
    </div>
  )
}
