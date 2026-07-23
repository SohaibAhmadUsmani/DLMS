import { useState, useMemo } from 'react'
import { DollarSign, Star, Users, Calendar, Download } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { useGetTeacherEarningsQuery, useGetTeacherEarningTransactionsQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
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

export default function TeacherEarnings() {
  const [year, setYear] = useState(2026)
  const { data, isLoading, isError } = useGetTeacherEarningsQuery(year)

  const [dateRange, setDateRange] = useState(() => {
    const now = new Date()
    const first = new Date(now.getFullYear(), now.getMonth(), 1)
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      start: first.toISOString().split('T')[0],
      end: last.toISOString().split('T')[0],
    }
  })
  const { data: txData, isLoading: txLoading } = useGetTeacherEarningTransactionsQuery({
    start_date: dateRange.start ? new Date(dateRange.start).toISOString() : undefined,
    end_date: dateRange.end ? new Date(dateRange.end + 'T23:59:59').toISOString() : undefined,
    page: 1,
    limit: 50,
  })

  const statCards = useMemo(() => {
    if (!data) return []
    return [
      {
        label: 'Total Revenue',
        value: formatUSD(data.total_revenue || 0),
        icon: DollarSign,
        color: 'bg-emerald-500',
        subtitle: 'All time earnings',
      },
      {
        label: 'This Month',
        value: formatUSD(data.this_month_earning || 0),
        icon: Calendar,
        color: 'bg-indigo-500',
        subtitle: 'Earning this month',
      },
      {
        label: 'Courses',
        value: data.total_courses || 0,
        icon: Star,
        color: 'bg-amber-500',
        subtitle: 'Courses with sales',
      },
      {
        label: 'Transactions',
        value: data.total_transactions || 0,
        icon: Users,
        color: 'bg-purple-500',
        subtitle: 'Total sales',
      },
    ]
  }, [data])

  const chartData = useMemo(() => {
    if (!data?.monthly_breakdown) return []
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    return data.monthly_breakdown.map((m) => ({
      name: monthNames[m.month - 1] || `Month ${m.month}`,
      earnings: m.earnings,
    }))
  }, [data])

  if (isLoading) return <Spinner size={40} />
  if (isError) return <EmptyState title="Failed to load earnings" description="Could not reach the server." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Earnings</h1>
        <p className="text-sm text-slate-500 mt-0.5">Track your revenue and earnings from course sales.</p>
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
                  {s.subtitle && <p className="text-xs text-slate-400 mt-0.5">{s.subtitle}</p>}
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
            <EmptyState title="No earnings data" description="Earnings will appear here once you start selling courses." />
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94A3B8" />
                <YAxis tick={{ fontSize: 12 }} stroke="#94A3B8" tickFormatter={(v) => formatUSDShort(v)} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="earnings" stroke="#4F46E5" fill="url(#earningsGradient)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardBody>
      </Card>

      <Card title="Earnings">
        <CardBody>
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Start Date</label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange((p) => ({ ...p, start: e.target.value }))}
                className="text-sm border border-slate-300 rounded-card px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">End Date</label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((p) => ({ ...p, end: e.target.value }))}
                className="text-sm border border-slate-300 rounded-card px-3 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          </div>

          {txLoading ? (
            <Spinner size={24} />
          ) : !txData?.items?.length ? (
            <EmptyState title="No transactions" description="No transactions found for the selected period." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Order ID</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4">Course</th>
                    <th className="pb-3 pr-4 text-right">Amount</th>
                    <th className="pb-3 pr-4 text-right">Fee</th>
                    <th className="pb-3 text-right">Earning</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {txData.items.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{tx.order_id}</td>
                      <td className="py-3 pr-4 text-slate-600">{new Date(tx.date).toLocaleDateString()}</td>
                      <td className="py-3 pr-4 text-slate-800 font-medium">{tx.course_title}</td>
                      <td className="py-3 pr-4 text-right text-slate-700">{formatUSD(tx.amount)}</td>
                      <td className="py-3 pr-4 text-right text-slate-500">{formatUSD(tx.platform_fee)}</td>
                      <td className="py-3 text-right font-semibold text-emerald-600">{formatUSD(tx.teacher_earning)}</td>
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
