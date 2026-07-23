import { useState } from 'react'
import { Search, FileText } from 'lucide-react'
import { useGetTeacherStatementsQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import { formatUSD } from '../../lib/formatCurrency'

const statusBadge = (status) => {
  switch (status) {
    case 'Completed': return <Badge variant="success">Completed</Badge>
    case 'Pending': return <Badge variant="warning">Pending</Badge>
    case 'Refunded': return <Badge variant="danger">Refunded</Badge>
    default: return <Badge>{status}</Badge>
  }
}

export default function TeacherStatements() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useGetTeacherStatementsQuery({
    status_filter: statusFilter,
    payment_method: paymentMethodFilter,
    search: search || undefined,
    page: 1,
    limit: 50,
  })

  const items = data?.items || []

  if (isLoading) return <Spinner size={40} />
  if (isError) return <EmptyState title="Failed to load statements" description="Could not reach the server." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Statements</h1>
        <p className="text-sm text-slate-500 mt-0.5">View your transaction history and earnings statements.</p>
      </div>

      <Card
        title="Statements"
        headerExtra={
          <div className="flex items-center gap-2">
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Methods</option>
              <option value="Stripe">Stripe</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Status</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Refunded">Refunded</option>
            </select>
          </div>
        }
      >
        <CardBody>
          <div className="relative mb-4 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search order ID..."
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {items.length === 0 ? (
            <EmptyState icon={FileText} title="No statements" description="Statements will appear here once you have transactions." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Order ID</th>
                    <th className="pb-3 pr-4">Course</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4 text-right">Amount</th>
                    <th className="pb-3 pr-4 text-right">Your Earnings</th>
                    <th className="pb-3 pr-4">Method</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{item.order_id}</td>
                      <td className="py-3 pr-4 text-slate-800 font-medium">{item.course_title}</td>
                      <td className="py-3 pr-4 text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="py-3 pr-4 text-right text-slate-700">{formatUSD(item.amount)}</td>
                      <td className="py-3 pr-4 text-right font-semibold text-emerald-600">{formatUSD(item.teacher_earning)}</td>
                      <td className="py-3 pr-4 text-slate-600">{item.payment_method}</td>
                      <td className="py-3">{statusBadge(item.status)}</td>
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
