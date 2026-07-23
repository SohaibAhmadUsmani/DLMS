import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Users, GraduationCap, ShieldCheck, BookOpen, DollarSign, BadgePercent,
  AlertTriangle, CreditCard, CheckCircle, X,
} from 'lucide-react'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import toast from 'react-hot-toast'
import { useGetAdminDashboardOverviewQuery, useApproveCourseMutation } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import { WelcomeBanner } from '../../components/layout'
import { formatUSD } from '../../lib/formatCurrency'

const BG = {
  indigo: 'bg-indigo-50', emerald: 'bg-emerald-50', amber: 'bg-amber-50',
  rose: 'bg-rose-50', blue: 'bg-blue-50', purple: 'bg-purple-50',
  orange: 'bg-orange-50', teal: 'bg-teal-50',
}
const ICON = {
  indigo: 'text-indigo-500', emerald: 'text-emerald-500', amber: 'text-amber-500',
  rose: 'text-rose-500', blue: 'text-blue-500', purple: 'text-purple-500',
  orange: 'text-orange-500', teal: 'text-teal-500',
}

function StatCard({ icon: Icon, label, value, bgColor, iconColor, onClick }) {
  return (
    <Card>
      <CardBody>
        <button
          onClick={onClick}
          className="w-full flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors rounded-card text-left"
          disabled={!onClick}
        >
          <div className={`flex h-12 w-12 items-center justify-center rounded-card ${bgColor}`}>
            <Icon size={24} className={iconColor} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
          </div>
        </button>
      </CardBody>
    </Card>
  )
}

function ChartTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white shadow-md border border-slate-200 rounded-card px-3 py-2 text-sm">
        <p className="font-semibold text-slate-700 mb-1">{label}</p>
        {payload.map((p) => (
          <p key={p.name} style={{ color: p.color }}>{p.name}: {formatUSD(p.value)}</p>
        ))}
      </div>
    )
  }
  return null
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useGetAdminDashboardOverviewQuery()
  const [approveCourse, { isLoading: approving }] = useApproveCourseMutation()

  const handleApprove = async (courseId, action) => {
    try {
      await approveCourse({ course_id: courseId, action }).unwrap()
      toast.success(action === 'approve' ? 'Course approved' : 'Course rejected')
    } catch (err) {
      toast.error(err.data?.detail || `Failed to ${action} course`)
    }
  }

  const roleData = useMemo(() => {
    if (!data?.role_data) return []
    return data.role_data.filter((d) => d.value > 0)
  }, [data])

  const chartData = useMemo(() => {
    if (!data?.revenue_by_quarter) return []
    return data.revenue_by_quarter
  }, [data])

  const pendingCourses = useMemo(() => {
    if (!data?.pending_courses) return []
    return data.pending_courses
  }, [data])

  const recentActivity = useMemo(() => {
    if (!data?.recent_activity) return []
    return data.recent_activity
  }, [data])

  if (isLoading) return <Spinner size={40} />
  if (isError) return <EmptyState title="Failed to load dashboard" description="Could not reach the server." />

  const TYPE_ICON = {
    enrollment: 'bg-indigo-50 text-indigo-500',
    transaction: 'bg-emerald-50 text-emerald-500',
    course_created: 'bg-amber-50 text-amber-500',
  }

  return (
    <div className="space-y-6">
      <WelcomeBanner variant="admin" />

      {/* Row 1: Platform stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={data?.total_users ?? 0} bgColor={BG.indigo} iconColor={ICON.indigo} onClick={() => navigate('/admin/users')} />
        <StatCard icon={GraduationCap} label="Total Students" value={data?.total_students ?? 0} bgColor={BG.emerald} iconColor={ICON.emerald} onClick={() => navigate('/admin/users')} />
        <StatCard icon={ShieldCheck} label="Total Teachers" value={data?.total_teachers ?? 0} bgColor={BG.amber} iconColor={ICON.amber} onClick={() => navigate('/admin/users')} />
        <StatCard icon={BookOpen} label="Total Courses" value={data?.total_courses ?? 0} bgColor={BG.rose} iconColor={ICON.rose} onClick={() => navigate('/admin/courses')} />
      </div>

      {/* Row 2: Revenue stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={DollarSign} label="Total Revenue" value={formatUSD(data?.total_revenue ?? 0)} bgColor={BG.emerald} iconColor={ICON.emerald} />
        <StatCard icon={BadgePercent} label="Commission Earned" value={formatUSD(data?.total_commission ?? 0)} bgColor={BG.amber} iconColor={ICON.amber} />
        <StatCard icon={AlertTriangle} label="Pending Approvals" value={pendingCourses.length} bgColor={BG.orange} iconColor={ICON.orange} />
        <StatCard icon={CreditCard} label="Total Transactions" value={data?.total_transactions ?? 0} bgColor={BG.purple} iconColor={ICON.purple} />
      </div>

      {/* Row 3: Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Role Distribution">
          <CardBody>
            {roleData.length === 0 ? (
              <EmptyState title="No user data" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie data={roleData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" strokeWidth={0}>
                    {roleData.map((entry) => (<Cell key={entry.name} fill={entry.color} />))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex justify-center gap-6 mt-2 text-sm text-slate-600">
              {roleData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                  {entry.name}: {entry.value}
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card title="Revenue by Quarter">
          <CardBody>
            {chartData.length === 0 ? (
              <EmptyState title="No revenue data yet" description="Complete transactions will appear here." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend />
                  <Bar dataKey="Revenue" fill="#14B8A6" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="Commission" fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 4: Pending Approvals + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card
          title="Pending Course Approvals"
          headerExtra={
            pendingCourses.length > 0 ? (
              <span className="text-xs bg-amber-100 text-amber-700 font-medium rounded-full px-2.5 py-0.5">
                {pendingCourses.length} pending
              </span>
            ) : null
          }
        >
          <CardBody>
            {pendingCourses.length === 0 ? (
              <EmptyState icon={CheckCircle} title="No pending approvals" description="All courses have been reviewed." />
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {pendingCourses.map((c) => (
                  <div key={c.id} className="flex items-start gap-3 p-3 rounded-card border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="w-10 h-8 rounded bg-slate-100 overflow-hidden shrink-0 mt-0.5">
                      {c.cover_image ? (
                        <img src={c.cover_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-300">
                          <BookOpen size={14} />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 truncate">{c.title}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        by {c.teacher_name || 'Unknown'} &middot; {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="shrink-0 flex gap-1.5">
                      <button
                        onClick={() => handleApprove(c.id, 'approve')}
                        disabled={approving}
                        className="flex items-center justify-center h-8 w-8 rounded-card bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors cursor-pointer disabled:opacity-50"
                        title="Approve"
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => handleApprove(c.id, 'reject')}
                        disabled={approving}
                        className="flex items-center justify-center h-8 w-8 rounded-card bg-rose-50 text-rose-600 hover:bg-rose-100 transition-colors cursor-pointer disabled:opacity-50"
                        title="Reject"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>

        <Card title="Recent Activity">
          <CardBody>
            {recentActivity.length === 0 ? (
              <EmptyState icon={CreditCard} title="No recent activity" description="Platform activity will appear here." />
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {recentActivity.map((act, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5 border-b border-slate-50 last:border-0">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-card shrink-0 ${TYPE_ICON[act.type] || 'bg-slate-50 text-slate-400'}`}>
                      {act.type === 'enrollment' ? <GraduationCap size={14} /> : act.type === 'transaction' ? <DollarSign size={14} /> : <BookOpen size={14} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{act.text}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(act.date).toLocaleDateString()} {new Date(act.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
