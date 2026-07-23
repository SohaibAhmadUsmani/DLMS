import { useMemo, useState } from 'react'
import { addWeeks, subWeeks, startOfWeek, format, addDays, parse, differenceInCalendarWeeks } from 'date-fns'
import { ChevronLeft, ChevronRight, MapPin, Clock } from 'lucide-react'
import { useGetMyClassesQuery } from '../../features/core/coreApi'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAYS_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_ORDER = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 }

function formatTime(t) {
  if (!t) return ''
  const p = t.split(':').map(Number)
  if (p.length < 2) return t
  const h = p[0] % 12 || 12
  return `${h}:${String(p[1]).padStart(2, '0')} ${p[0] >= 12 ? 'PM' : 'AM'}`
}

function parseTime(t) {
  const p = t.split(':').map(Number)
  return p[0] * 60 + (p[1] || 0)
}

function timeToLabel(m) {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h % 12 || 12}:${String(min).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`
}

function generateWeekEvents(classes, weekStart) {
  const events = []
  for (const c of classes) {
    const slots = c.slots || []
    for (const slot of slots) {
      const dayIdx = DAY_ORDER[slot.day]
      if (dayIdx == null) continue
      const date = addDays(weekStart, dayIdx)
      const startMin = parseTime(slot.start_time || '08:00')
      const endMin = parseTime(slot.end_time || '08:50')
      events.push({
        id: `${c.id}-${slot.day}-${slot.start_time}-${slot.room}`,
        classTitle: c.title || c.class_code || 'Class',
        courseName: c.course_name,
        room: slot.room,
        day: slot.day,
        dayIdx,
        date,
        startMin,
        endMin,
        startLabel: timeToLabel(startMin),
        endLabel: timeToLabel(endMin),
        classId: c.id,
      })
    }
  }
  return events.sort((a, b) => a.dayIdx - b.dayIdx || a.startMin - b.startMin)
}

export default function ClassCalendar() {
  const { data, isLoading, isError } = useGetMyClassesQuery()
  const [baseDate, setBaseDate] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))

  const classes = data?.items || []

  const { weekNumber, totalWeeks, minDate, maxDate } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    for (const c of classes) {
      if (c.created_at) {
        const d = new Date(c.created_at)
        const ts = d.getTime()
        if (ts < min) min = ts
        const end = new Date(d)
        end.setDate(end.getDate() + 16 * 7)
        if (end.getTime() > max) max = end.getTime()
      }
    }
    if (min === Infinity) return { weekNumber: 1, totalWeeks: 16, minDate: baseDate, maxDate: addWeeks(baseDate, 16) }
    const start = startOfWeek(new Date(min), { weekStartsOn: 1 })
    const end = new Date(max)
    const total = Math.max(16, Math.ceil((end.getTime() - start.getTime()) / (7 * 86400000)) + 1)
    const current = differenceInCalendarWeeks(baseDate, start, { weekStartsOn: 1 }) + 1
    return { weekNumber: Math.max(1, current), totalWeeks: total, minDate: start, maxDate: end }
  }, [classes, baseDate])

  const weekEvents = useMemo(() => generateWeekEvents(classes, baseDate), [classes, baseDate])

  const timeSlots = useMemo(() => {
    const set = new Set()
    for (const e of weekEvents) {
      set.add(`${e.startMin}-${e.endMin}`)
    }
    return Array.from(set).sort((a, b) => {
      const [a1] = a.split('-').map(Number)
      const [b1] = b.split('-').map(Number)
      return a1 - b1
    })
  }, [weekEvents])

  const goBack = () => setBaseDate((prev) => subWeeks(prev, 1))
  const goForward = () => setBaseDate((prev) => addWeeks(prev, 1))
  const goToday = () => setBaseDate(startOfWeek(new Date(), { weekStartsOn: 1 }))

  const weekLabel = `${format(baseDate, 'MMM d')} — ${format(addDays(baseDate, 6), 'MMM d, yyyy')}`

  if (isLoading) return <Spinner size={32} />
  if (isError) return <Card className="p-6"><EmptyState title="Failed to load classes" /></Card>

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Weekly Timetable</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Week {weekNumber} of {totalWeeks}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={goBack} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-medium text-slate-700 min-w-[200px] text-center">{weekLabel}</span>
          <button onClick={goForward} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors cursor-pointer">
            <ChevronRight size={18} />
          </button>
          <button onClick={goToday} className="ml-2 text-xs font-medium text-primary bg-indigo-50 hover:bg-indigo-100 rounded-full px-3 py-1.5 transition-colors cursor-pointer">
            Today
          </button>
        </div>
      </div>

      <div className="overflow-x-auto border border-slate-200 rounded-card bg-white">
        <div className="min-w-[800px]">
          <div className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-200">
            <div className="py-2.5 px-3 text-xs font-semibold text-slate-400 uppercase bg-slate-50/50" />
            {DAYS_SHORT.map((d, i) => {
              const date = addDays(baseDate, i)
              const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
              return (
                <div key={d} className={`py-2.5 px-2 text-center text-xs font-semibold uppercase tracking-wider ${isToday ? 'bg-primary/5 text-primary' : 'bg-slate-50/50 text-slate-500'}`}>
                  <span>{d}</span>
                  <span className={`ml-1.5 inline-flex items-center justify-center h-5 w-5 rounded-full text-[10px] ${isToday ? 'bg-primary text-white' : 'text-slate-400'}`}>
                    {format(date, 'd')}
                  </span>
                </div>
              )
            })}
          </div>

          {timeSlots.length === 0 ? (
            <div className="p-12">
              <EmptyState title="No scheduled classes this week" description="Your timetable will appear here once classes are assigned." />
            </div>
          ) : (
            timeSlots.map((ts) => {
              const [sMin, eMin] = ts.split('-').map(Number)
              return (
                <div key={ts} className="grid grid-cols-[80px_repeat(7,1fr)] border-b border-slate-100 last:border-b-0">
                  <div className="px-3 py-3 text-[11px] font-medium text-slate-400 whitespace-nowrap flex items-start justify-center border-r border-slate-100 bg-slate-50/30">
                    {timeToLabel(sMin)}
                  </div>
                  {Array.from({ length: 7 }).map((_, dayIdx) => {
                    const dayEvents = weekEvents.filter((e) => e.dayIdx === dayIdx && e.startMin === sMin && e.endMin === eMin)
                    const date = addDays(baseDate, dayIdx)
                    const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                    return (
                      <div key={dayIdx} className={`px-1.5 py-2 min-h-[80px] border-r border-slate-100 last:border-r-0 ${isToday ? 'bg-indigo-50/30' : ''}`}>
                        {dayEvents.map((e) => (
                          <div key={e.id} className="bg-primary/10 border border-primary/20 rounded-lg px-2 py-1.5 mb-1 text-[11px] leading-tight">
                            <p className="font-semibold text-primary truncate">{e.classTitle}</p>
                            {e.courseName && <p className="text-slate-500 truncate">{e.courseName}</p>}
                            <div className="flex items-center gap-1 text-slate-500 mt-0.5">
                              <MapPin size={9} className="shrink-0" />
                              <span className="truncate">{e.room}</span>
                            </div>
                            <div className="flex items-center gap-1 text-slate-500">
                              <Clock size={9} className="shrink-0" />
                              <span className="truncate">{e.startLabel}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
