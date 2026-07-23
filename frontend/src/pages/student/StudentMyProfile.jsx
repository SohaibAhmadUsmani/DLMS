import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { useAppSelector } from '../../app/hooks'
import Card from '../../components/ui/Card'
import { EducationTimeline, ExperienceTimeline } from '../../components/profile/TimelineList'

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
const baseUrl = apiUrl.replace('/api/v1', '').replace(/\/+$/, '')

function InfoRow({ label, value }) {
  return (
    <div>
      <p className="text-sm font-semibold text-slate-800 mb-0.5">{label}</p>
      <p className="text-sm text-slate-500">{value || '—'}</p>
    </div>
  )
}

function computeAge(dob) {
  if (!dob) return null
  const birth = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age
}

function formatDate(value) {
  if (!value) return null
  try {
    return format(new Date(value), 'dd MMM yyyy')
  } catch {
    return value
  }
}

function formatDateTime(value) {
  if (!value) return null
  try {
    const d = new Date(value)
    const h = d.getHours() % 12 || 12
    const m = String(d.getMinutes()).padStart(2, '0')
    const ampm = d.getHours() >= 12 ? 'PM' : 'AM'
    return `${format(d, 'dd MMM yyyy')}, ${h}:${m} ${ampm}`
  } catch {
    return value
  }
}

export default function StudentMyProfile({ settingsPath = '/student/settings' }) {
  const navigate = useNavigate()
  const { user } = useAppSelector((s) => s.auth)
  const role = user?.role

  const basicFields = useMemo(() => {
    const parts = (user?.name || '').split(' ')
    const fields = [
      { label: 'First Name', value: parts[0] || '—' },
      { label: 'Last Name', value: parts.slice(1).join(' ') || '—' },
      { label: 'Registration Date', value: formatDateTime(user?.created_at) },
      { label: 'User Name', value: user?.username || '—' },
      { label: 'Phone Number', value: user?.phone || '—' },
      { label: 'CNIC', value: user?.cnic || '—' },
      { label: 'Email', value: user?.email || '—' },
      { label: 'Gender', value: user?.gender || '—' },
      { label: 'DOB', value: formatDate(user?.dob) },
      { label: 'Age', value: computeAge(user?.dob) ?? '—' },
    ]
    return fields
  }, [user])

  const pictureUrl = user?.profile_picture_url ? `${baseUrl}${user.profile_picture_url}` : null

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">My Profile</h1>
        <button
          onClick={() => navigate(settingsPath)}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary transition-colors cursor-pointer"
          aria-label="Edit profile"
        >
          <Pencil size={15} />
          Edit
        </button>
      </div>

      <hr className="border-slate-200" />

      <Card className="p-6">
        <div className="flex items-center gap-5 mb-6">
          {pictureUrl ? (
            <img src={pictureUrl} alt="Profile" className="h-16 w-16 rounded-full object-cover border-2 border-slate-200" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-primary text-white flex items-center justify-center text-xl font-medium border-2 border-slate-200">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div>
            <h2 className="font-bold text-slate-800 text-lg">{user?.name || '—'}</h2>
            <p className="text-sm text-slate-500 capitalize">{user?.role || '—'}</p>
          </div>
        </div>

        <h3 className="font-bold text-slate-800 mb-4">Basic Details</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
          {basicFields.map((f) => (
            <InfoRow key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-bold text-slate-800 mb-3">Bio</h3>
        <div className="text-sm text-slate-500 whitespace-pre-wrap">
          {user?.bio || '—'}
        </div>
      </Card>

      {role === 'teacher' && (
        <>
          <EducationTimeline entries={user?.education} />
          <ExperienceTimeline entries={user?.experience} />
        </>
      )}
    </div>
  )
}
