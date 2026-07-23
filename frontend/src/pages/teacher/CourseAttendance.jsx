import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { Check, X, Loader } from 'lucide-react'
import { useGetCourseDetailQuery } from '../../features/console/consoleApi'
import { useGetCourseStudentsQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const WEEKS = Array.from({ length: 14 }, (_, i) => i + 1)
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export default function CourseAttendance() {
  const { courseId } = useParams()
  const token = useSelector((s) => s.auth.token)
  const { data: course } = useGetCourseDetailQuery(courseId)
  const { data: studentsData, isLoading: studentsLoading } = useGetCourseStudentsQuery(courseId)
  const [attendance, setAttendance] = useState({})
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const enrolledStudents = studentsData?.students || []

  useEffect(() => {
    if (!courseId || !token) return
    setLoading(true)
    fetch(`${API_BASE}/core/attendance/semester/${courseId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const map = {}
        if (data?.attendance) {
          for (const row of data.attendance) {
            map[row.student_id] = {}
            for (let w = 1; w <= 14; w++) {
              if (row[String(w)] != null) map[row.student_id][w] = row[String(w)]
            }
          }
        }
        setAttendance(map)
      })
      .catch(() => toast.error('Failed to load semester attendance'))
      .finally(() => setLoading(false))
  }, [courseId])

  const toggleStatus = (studentId, week) => {
    setAttendance((prev) => {
      const student = { ...(prev[studentId] || {}) }
      const current = student[week]
      student[week] = current === 'present' ? 'absent' : 'present'
      return { ...prev, [studentId]: student }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    const records = []
    for (const studentId in attendance) {
      for (const week in attendance[studentId]) {
        records.push({
          student_id: studentId,
          week: Number(week),
          status: attendance[studentId][week],
        })
      }
    }
    if (records.length === 0) {
      toast.error('No attendance records to save')
      setSaving(false)
      return
    }
    try {
      const res = await fetch(`${API_BASE}/core/attendance/semester/${courseId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ records }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to save')
      }
      toast.success(`Attendance saved for ${records.length} records`)
    } catch (err) {
      toast.error(err.message || 'Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  if (studentsLoading || loading) return <Spinner size={24} />
  if (enrolledStudents.length === 0) {
    return (
      <Card title={course?.title ? `${course.title} — Semester Attendance` : 'Attendance'}>
        <CardBody>
          <EmptyState icon={Check} title="No enrolled students" description="No students are enrolled in this course yet." />
        </CardBody>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card
        title={course?.title ? `${course.title} — Semester Attendance` : 'Attendance'}
        extra={
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">14-Week Semester</span>
            <Button onClick={handleSave} loading={saving} size="sm">Save Attendance</Button>
          </div>
        }
      />
      <div className="bg-white border border-slate-200 rounded-card overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="sticky left-0 bg-slate-50 z-10 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[40px]">S.No</th>
              <th className="sticky left-[40px] bg-slate-50 z-10 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[80px]">Roll No</th>
              <th className="sticky left-[120px] bg-slate-50 z-10 px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[180px]">Student Name</th>
              {WEEKS.map((w) => (
                <th key={w} className="px-2 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[70px] border-l border-slate-100">
                  Week {w}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {enrolledStudents.map((s, idx) => {
              const studentAttendance = attendance[s.id] || {}
              return (
                <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                  <td className="sticky left-0 bg-white hover:bg-slate-50/50 z-10 px-3 py-2 text-xs text-slate-400">{idx + 1}</td>
                  <td className="sticky left-[40px] bg-white hover:bg-slate-50/50 z-10 px-3 py-2 text-xs text-slate-500 font-mono">{s.id.slice(-6).toUpperCase()}</td>
                  <td className="sticky left-[120px] bg-white hover:bg-slate-50/50 z-10 px-3 py-2 text-sm font-medium text-slate-700 truncate max-w-[180px]">{s.name}</td>
                  {WEEKS.map((w) => {
                    const status = studentAttendance[w]
                    return (
                      <td key={w} className="px-2 py-1.5 text-center border-l border-slate-100">
                        <button
                          onClick={() => toggleStatus(s.id, w)}
                          className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all cursor-pointer border ${
                            status === 'present'
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                              : status === 'absent'
                              ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                              : 'border-slate-200 text-slate-300 hover:border-slate-300 hover:text-slate-400'
                          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50`}
                          title={`${s.name} — Week ${w}: ${status || 'Not marked'}`}
                        >
                          {status === 'present' ? <Check size={14} /> : status === 'absent' ? <X size={14} /> : '—'}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
