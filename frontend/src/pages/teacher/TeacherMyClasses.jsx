import { useGetMyClassesQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { Calendar, Clock, MapPin } from 'lucide-react'

function formatTime(t) {
  if (!t) return ''
  const parts = t.split(':')
  if (parts.length < 2) return t
  let h = parseInt(parts[0], 10)
  const ampm = h >= 12 ? 'PM' : 'AM'
  if (h > 12) h -= 12
  if (h === 0) h = 12
  return `${h}:${parts[1]} ${ampm}`
}

export default function TeacherMyClasses() {
  const { data, isLoading, isError } = useGetMyClassesQuery()
  const classes = data?.items || []

  if (isLoading) return <Spinner size={32} />
  if (isError) return <Card><CardBody><EmptyState icon={Calendar} title="Failed to load classes" /></CardBody></Card>

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-800">My Classes</h1>

      {classes.length === 0 ? (
        <Card><CardBody>
          <EmptyState icon={Calendar} title="No upcoming classes" description="Your scheduled classes will appear here once assigned by an admin." />
        </CardBody></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {classes.map((c) => {
            const slots = c.slots || []
            return (
              <div key={c.id} className="bg-white border border-slate-200 rounded-card p-5 shadow-sm">
                <h3 className="font-semibold text-slate-800 mb-3">{c.title || c.class_code || 'Class'}</h3>
                {slots.length === 0 ? (
                  <p className="text-sm text-slate-400 italic">No slots configured</p>
                ) : (
                  <div className="space-y-3">
                    {slots.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 text-sm">
                        <div className="flex flex-col items-center gap-0.5">
                          <div className="h-2 w-2 rounded-full bg-primary/40" />
                          {i < slots.length - 1 && <div className="w-px flex-1 bg-slate-200 min-h-[24px]" />}
                        </div>
                        <div className="space-y-1 pb-2">
                          <span className="text-xs font-semibold text-slate-700">{s.day}</span>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Clock size={12} className="shrink-0" />
                            <span>{formatTime(s.start_time)} — {formatTime(s.end_time)}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <MapPin size={12} className="shrink-0" />
                            <span>Room: {s.room}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
