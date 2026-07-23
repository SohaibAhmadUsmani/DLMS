import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  GraduationCap, BookOpen, CheckCircle, Users, BookOpenCheck, DollarSign,
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useGetTeacherDashboardOverviewQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { WelcomeBanner } from '../../components/layout'
import { formatUSD } from '../../lib/formatCurrency'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function StatCard({ icon: Icon, label, value, bgColor, iconColor }) {
  return (
    <div className="bg-white border border-slate-200 rounded-card p-4 flex items-center gap-3 overflow-hidden">
      <div className={`flex h-11 w-11 items-center justify-center rounded-card ${bgColor}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value ?? 0}</p>
        <p className="text-xs text-slate-500">{label}</p>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const config = {
    Published: { bg: 'bg-emerald-100 text-emerald-700', label: 'Published' },
    Draft: { bg: 'bg-purple-100 text-purple-700', label: 'Draft' },
    Pending: { bg: 'bg-blue-100 text-blue-700', label: 'Pending' },
  }
  const s = config[status] || config.Draft
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${s.bg}`}>
      {s.label}
    </span>
  )
}

export default function TeacherOverview() {
  const navigate = useNavigate()
  const currentYear = new Date().getFullYear()
  const [chartYear, setChartYear] = useState(currentYear)

  const { data, isLoading, isError } = useGetTeacherDashboardOverviewQuery({ year: chartYear })

  const chartData = useMemo(() => {
    if (!data?.earnings_by_month) return []
    return data.earnings_by_month.map((amount, i) => ({
      month: MONTHS[i],
      amount,
    }))
  }, [data])

  const years = useMemo(() => {
    const y = currentYear
    return [y - 2, y - 1, y, y + 1]
  }, [currentYear])

  if (isLoading) return <Spinner size={40} />
  if (isError) return <EmptyState title="Failed to load dashboard" description="Could not reach the server." />

  const statCards = [
    { label: 'Enrolled Courses', value: data?.total_enrollments ?? 0, icon: GraduationCap, bgColor: 'bg-rose-50', iconColor: 'text-rose-500' },
    { label: 'Active Courses', value: data?.active_courses ?? 0, icon: BookOpen, bgColor: 'bg-pink-50', iconColor: 'text-pink-500' },
    { label: 'Completed Courses', value: data?.completed_courses ?? 0, icon: CheckCircle, bgColor: 'bg-emerald-50', iconColor: 'text-emerald-500' },
    { label: 'Total Students', value: data?.total_students ?? 0, icon: Users, bgColor: 'bg-purple-50', iconColor: 'text-purple-500' },
    { label: 'Total Courses', value: data?.total_courses ?? 0, icon: BookOpenCheck, bgColor: 'bg-blue-50', iconColor: 'text-blue-500' },
    { label: 'Total Earnings', value: data?.total_earnings ? formatUSD(data.total_earnings) : '$0', icon: DollarSign, bgColor: 'bg-indigo-50', iconColor: 'text-indigo-500' },
  ]

  return (
    <div className="space-y-6">
      <WelcomeBanner />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <Card
        title="Earnings by Year"
        headerExtra={
          <select
            value={chartYear}
            onChange={(e) => setChartYear(Number(e.target.value))}
            className="text-xs border border-slate-300 rounded-card px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        }
      >
        <CardBody>
          {chartData.every((d) => d.amount === 0) ? (
            <div className="flex items-center justify-center h-64 text-slate-400 text-sm">
              No earnings data for {chartYear}
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}
                    formatter={(value) => [formatUSD(value), 'Earnings']}
                  />
                  <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardBody>
      </Card>

      <Card title="Recently Created Courses">
        <CardBody>
          {(!data?.recent_courses || data.recent_courses.length === 0) ? (
            <EmptyState icon={BookOpen} title="No courses yet" description="Create your first course to get started." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Course</th>
                    <th className="pb-3 pr-4">Enrolled</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent_courses.map((course) => (
                    <tr
                      key={course.id}
                      onClick={() => navigate(`/teacher/courses/${course.id}`)}
                      className="hover:bg-slate-50/50 cursor-pointer"
                    >
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-8 rounded bg-slate-100 overflow-hidden shrink-0">
                            {course.cover_image ? (
                              <img src={course.cover_image} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="flex items-center justify-center h-full text-slate-300">
                                <BookOpen size={14} />
                              </div>
                            )}
                          </div>
                          <span className="font-medium text-slate-800 truncate max-w-[240px]">{course.title}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-slate-600">{course.enrolled}</td>
                      <td className="py-3"><StatusBadge status={course.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
