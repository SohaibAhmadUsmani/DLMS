import { useState, useMemo } from 'react'
import { DollarSign, TrendingUp, Users, ShieldCheck, Search, Settings } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import toast from 'react-hot-toast'
import {
  useGetAdminPaymentOverviewQuery,
  useGetAdminTransactionsQuery,
  useGetAdminTeachersConnectQuery,
  useGetAdminCommissionQuery,
  useUpdateAdminCommissionMutation,
} from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { formatUSD, formatUSDShort } from '../../lib/formatCurrency'

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

const statusBadge = (status) => {
  switch (status) {
    case 'Completed': return <Badge variant="success">Completed</Badge>
    case 'Pending': return <Badge variant="warning">Pending</Badge>
    case 'Refunded': return <Badge variant="danger">Refunded</Badge>
    default: return <Badge>{status}</Badge>
  }
}

export default function AdminFinance() {
  const [year, setYear] = useState(2026)
  const [txStatusFilter, setTxStatusFilter] = useState('all')
  const [txPaymentFilter, setTxPaymentFilter] = useState('all')
  const [txSearch, setTxSearch] = useState('')
  const [commissionModal, setCommissionModal] = useState(false)
  const [commissionValue, setCommissionValue] = useState('')

  const { data: overview, isLoading, isError } = useGetAdminPaymentOverviewQuery(year)
  const { data: txData, isLoading: txLoading } = useGetAdminTransactionsQuery({
    status_filter: txStatusFilter,
    payment_method: txPaymentFilter,
    search: txSearch || undefined,
    page: 1,
    limit: 50,
  })
  const { data: teachersData, isLoading: teachersLoading } = useGetAdminTeachersConnectQuery()
  const { data: commissionData } = useGetAdminCommissionQuery()
  const [updateCommission] = useUpdateAdminCommissionMutation()

  const statCards = useMemo(() => {
    if (!overview) return []
    return [
      {
        label: 'Total Revenue',
        value: formatUSD(overview.total_revenue || 0),
        icon: DollarSign,
        color: 'bg-emerald-600',
        subtitle: 'All course sales',
      },
      {
        label: 'Platform Commission',
        value: formatUSD(overview.total_commission || 0),
        icon: TrendingUp,
        color: 'bg-indigo-600',
        subtitle: 'Platform fees earned',
      },
      {
        label: 'Paid to Teachers',
        value: overview.total_paid_to_teachers ? formatUSD(overview.total_paid_to_teachers) : formatUSD(0),
        icon: Users,
        color: 'bg-amber-600',
        subtitle: 'Paid via Stripe Connect',
      },
      {
        label: 'Total Enrollments',
        value: overview.total_enrollments || 0,
        icon: Users,
        color: 'bg-purple-600',
        subtitle: `${overview.paid_enrollments || 0} paid`,
      },
    ]
  }, [overview])

  const chartData = useMemo(() => {
    if (!overview?.monthly_breakdown) return []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return overview.monthly_breakdown.map((m) => ({
      name: monthNames[m.month - 1] || `Month ${m.month}`,
      revenue: m.revenue,
      commission: m.commission,
    }))
  }, [overview])

  const handleSaveCommission = async () => {
    const val = parseFloat(commissionValue)
    if (isNaN(val) || val < 0 || val > 100) {
      toast.error('Enter a valid percentage (0-100)')
      return
    }
    try {
      await updateCommission(val).unwrap()
      toast.success('Commission rate updated')
      setCommissionModal(false)
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to update commission')
    }
  }

  const openCommissionModal = () => {
    setCommissionValue(String(commissionData?.commission_percent || 10))
    setCommissionModal(true)
  }

  if (isLoading) return <Spinner size={40} />
  if (isError) return <EmptyState title="Failed to load overview" description="Could not reach the server." />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Financial Overview</h1>
          <p className="text-sm text-slate-500 mt-0.5">Platform-wide payment and earnings data.</p>
        </div>
        <Button variant="outline" onClick={openCommissionModal}>
          <Settings size={16} /> Commission: {commissionData?.commission_percent || 10}%
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardBody>
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-card ${s.color}`}>
                  <s.icon size={24} className="text-white" />
                </div>
                <div>
                  <p className="text-sm text-slate-500">{s.label}</p>
                  <p className="text-xl font-bold text-slate-800">{s.value}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{s.subtitle}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card
        title="Earnings by Year"
        headerExtra={
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="text-sm border border-slate-300 rounded-card px-2 py-1 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        }
      >
        <CardBody>
          {chartData.length === 0 ? (
            <EmptyState title="No data" description="Earnings data will appear here once courses are sold." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="commissionGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#14B8A6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#14B8A6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => formatUSDShort(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#4F46E5" fill="url(#revenueGradient)" strokeWidth={2} name="Revenue" />
                <Area type="monotone" dataKey="commission" stroke="#14B8A6" fill="url(#commissionGradient)" strokeWidth={2} name="Commission" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <Card title="Transactions">
        <CardBody>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-xs">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search order ID..."
                className="w-full rounded-card border border-slate-300 pl-8 pr-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <select
              value={txPaymentFilter}
              onChange={(e) => setTxPaymentFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-card px-2 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Methods</option>
              <option value="Stripe">Stripe</option>
            </select>
            <select
              value={txStatusFilter}
              onChange={(e) => setTxStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-card px-2 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>

          {txLoading ? (
            <Spinner size={24} />
          ) : !txData?.items?.length ? (
            <EmptyState title="No transactions" description="Transactions will appear here once purchases are made." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-3">Order ID</th>
                    <th className="pb-3 pr-3">Student</th>
                    <th className="pb-3 pr-3">Teacher</th>
                    <th className="pb-3 pr-3">Course</th>
                    <th className="pb-3 pr-3">Date</th>
                    <th className="pb-3 pr-3 text-right">Amount</th>
                    <th className="pb-3 pr-3 text-right">Fee</th>
                    <th className="pb-3 pr-3 text-right">Teacher Gets</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txData.items.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-3 font-mono text-xs text-slate-600">{tx.order_id}</td>
                      <td className="py-3 pr-3 text-slate-700">{tx.student_name}</td>
                      <td className="py-3 pr-3 text-slate-700">{tx.teacher_name}</td>
                      <td className="py-3 pr-3 font-medium text-slate-800 truncate max-w-[150px]">{tx.course_title}</td>
                      <td className="py-3 pr-3 text-slate-500 text-xs">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="py-3 pr-3 text-right text-slate-700">{formatUSD(tx.amount)}</td>
                      <td className="py-3 pr-3 text-right text-amber-600">{formatUSD(tx.platform_fee)}</td>
                      <td className="py-3 pr-3 text-right text-emerald-600">{formatUSD(tx.teacher_earning)}</td>
                      <td className="py-3">{statusBadge(tx.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Card title="Teacher Stripe Connect Status">
        <CardBody>
          {teachersLoading ? (
            <Spinner size={24} />
          ) : !teachersData?.teachers?.length ? (
            <EmptyState title="No teachers" description="No teachers found in the system." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Name</th>
                    <th className="pb-3 pr-4">Email</th>
                    <th className="pb-3 pr-4">Stripe Account</th>
                    <th className="pb-3">Onboarding Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {teachersData.teachers.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-4 font-medium text-slate-800">{t.name}</td>
                      <td className="py-3 pr-4 text-slate-600">{t.email}</td>
                      <td className="py-3 pr-4">
                        {t.stripe_account_id ? (
                          <span className="font-mono text-xs text-slate-500">{t.stripe_account_id}</span>
                        ) : (
                          <span className="text-xs text-slate-400">Not connected</span>
                        )}
                      </td>
                      <td className="py-3">
                        {t.onboarding_complete && t.charges_enabled ? (
                          <Badge variant="success">Complete</Badge>
                        ) : t.stripe_account_id ? (
                          <Badge variant="warning">Incomplete</Badge>
                        ) : (
                          <Badge variant="neutral">Not Started</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={commissionModal} onClose={() => setCommissionModal(false)} title="Commission Settings">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Set the platform commission percentage. This is the fee deducted from each course sale before the teacher receives their share.
          </p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Commission Percentage</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={commissionValue}
                onChange={(e) => setCommissionValue(e.target.value)}
                min="0"
                max="100"
                step="0.5"
                className="w-full rounded-card border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              />
              <span className="text-sm text-slate-500">%</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setCommissionModal(false)}>Cancel</Button>
            <Button onClick={handleSaveCommission}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
