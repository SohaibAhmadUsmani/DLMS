import { Briefcase } from 'lucide-react'
import Card from '../ui/Card'

function formatYearRange(fromDate, toDate, isCurrent) {
  const start = fromDate ? fromDate.split('-')[0] : '?'
  const end = isCurrent ? 'Present' : toDate ? toDate.split('-')[0] : '?'
  return `(${start} - ${end})`
}

export function EducationTimeline({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-bold text-slate-800 mb-2">Education</h3>
        <p className="text-sm text-slate-400">No education details added yet.</p>
      </Card>
    )
  }

  const sorted = [...entries].sort((a, b) => {
    const aYear = parseInt(a.from_date?.split('-')[0] || '0', 10)
    const bYear = parseInt(b.from_date?.split('-')[0] || '0', 10)
    return bYear - aYear
  })

  return (
    <Card className="p-6">
      <h3 className="font-bold text-slate-800 mb-4">Education</h3>
      <div className="space-y-0">
        {sorted.map((entry, idx) => (
          <div key={idx} className="flex gap-4 pb-4 relative">
            {idx < sorted.length - 1 && (
              <div className="absolute left-[7px] top-5 bottom-0 w-px bg-slate-200" />
            )}
            <div className="shrink-0 mt-1.5">
              <div className="h-3.5 w-3.5 rounded-full bg-success border-2 border-white" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800">{entry.degree}</p>
              <p className="text-sm text-slate-500">
                {entry.university} {formatYearRange(entry.from_date, entry.to_date, false)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ExperienceTimeline({ entries }) {
  if (!entries || entries.length === 0) {
    return (
      <Card className="p-6">
        <h3 className="font-bold text-slate-800 mb-2">Experience</h3>
        <p className="text-sm text-slate-400">No experience added yet.</p>
      </Card>
    )
  }

  const sorted = [...entries].sort((a, b) => {
    const aYear = parseInt(a.from_date?.split('-')[0] || '0', 10)
    const bYear = parseInt(b.from_date?.split('-')[0] || '0', 10)
    return bYear - aYear
  })

  return (
    <Card className="p-6">
      <h3 className="font-bold text-slate-800 mb-4">Experience</h3>
      <div className="space-y-0">
        {sorted.map((entry, idx) => (
          <div key={idx} className="flex gap-4 pb-4 relative">
            {idx < sorted.length - 1 && (
              <div className="absolute left-[7px] top-5 bottom-0 w-px bg-slate-200" />
            )}
            <div className="shrink-0 mt-1.5">
              <div className="h-3.5 w-3.5 rounded bg-primary flex items-center justify-center">
                <Briefcase size={8} className="text-white" />
              </div>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800">{entry.position}</p>
              <p className="text-sm text-slate-500">
                {entry.company} {formatYearRange(entry.from_date, entry.to_date, entry.is_current)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
