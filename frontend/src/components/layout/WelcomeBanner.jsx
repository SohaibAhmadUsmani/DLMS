import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil, PlusCircle, GraduationCap, Check } from 'lucide-react'
import { useAppSelector } from '../../app/hooks'

function getSettingsRoute(role) {
  if (role === 'admin') return '/admin/profile'
  if (role === 'teacher') return '/teacher/profile'
  return '/student/settings'
}

function getDashboardBase(role) {
  if (role === 'admin') return '/admin'
  if (role === 'teacher') return '/teacher'
  return '/student'
}

export default function WelcomeBanner({ variant }) {
  const navigate = useNavigate()
  const { user } = useAppSelector((s) => s.auth)
  const [cacheBuster] = useState(() => Date.now())
  if (!user) return null

  const role = variant || user.role || 'student'
  const isAdmin = role === 'admin'
  const isStudent = role === 'student'
  const roleLabel = isAdmin ? 'Administrator' : isStudent ? 'Student' : 'Instructor'
  const settingsRoute = getSettingsRoute(role)
  const baseRoute = getDashboardBase(role)

  const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1').replace('/api/v1', '').replace(/\/+$/, '')
  const avatarUrl = user.profile_picture_url ? `${baseUrl}${user.profile_picture_url}?t=${cacheBuster}` : null
  const initials = (user.name || 'U').charAt(0).toUpperCase()

  return (
    <div className={`relative overflow-hidden rounded-card px-6 py-7 sm:px-8 sm:py-8 text-white ${isStudent ? 'bg-gradient-to-br from-primary to-teal-600' : 'bg-gradient-to-br from-indigo-600 to-purple-600'}`}>

      {/* Decorative circles */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -right-4 -bottom-8 h-36 w-36 rounded-full bg-white/8" />
      <div className="pointer-events-none absolute right-16 top-4 h-20 w-20 rounded-full bg-white/5" />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        {/* Avatar */}
        <div className="shrink-0">
          <div className="relative inline-block">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full object-cover border-2 border-white/40" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/20 text-xl font-bold border-2 border-white/40">
                {initials}
              </div>
            )}
            <div className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-success text-white shadow-sm ring-2 ring-white">
              <Check size={12} strokeWidth={3} />
            </div>
          </div>
        </div>

        {/* Name + Role */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold truncate">{user.name || 'User'}</h1>
            <button
              onClick={() => navigate(settingsRoute)}
              className="shrink-0 flex items-center justify-center h-7 w-7 rounded-full bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
              title="Edit profile"
            >
              <Pencil size={13} />
            </button>
          </div>
          <p className="text-sm text-white/70 mt-0.5">{roleLabel}</p>
        </div>

        {/* Action button */}
        <div className="shrink-0">
          {isAdmin ? (
            <button
              onClick={() => navigate('/admin/settings')}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary hover:bg-white/90 transition-colors shadow-sm cursor-pointer"
            >
              <GraduationCap size={16} />
              Platform Settings
            </button>
          ) : !isStudent ? (
            <button
              onClick={() => navigate(`${baseRoute}/courses`)}
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-semibold text-primary hover:bg-white/90 transition-colors shadow-sm cursor-pointer"
            >
              <PlusCircle size={16} />
              Add New Course
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}
