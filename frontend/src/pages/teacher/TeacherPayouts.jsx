import { useState, useMemo } from 'react'
import { DollarSign, Wallet, ArrowUpRight, CreditCard, Banknote, Search } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGetTeacherPayoutsQuery, useGetConnectOnboardUrlMutation, useGetConnectStatusQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { formatUSD } from '../../lib/formatCurrency'

const statusBadge = (status) => {
  switch (status) {
    case 'Paid': return <Badge variant="success">Paid</Badge>
    case 'Pending': return <Badge variant="warning">Pending</Badge>
    case 'Failed': return <Badge variant="danger">Failed</Badge>
    default: return <Badge>{status}</Badge>
  }
}

export default function TeacherPayouts() {
  const [statusFilter, setStatusFilter] = useState('all')
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [withdrawModal, setWithdrawModal] = useState(false)
  const [selectedMethod, setSelectedMethod] = useState('stripe')

  const { data, isLoading, isError } = useGetTeacherPayoutsQuery({
    status_filter: statusFilter,
    payment_method: paymentMethodFilter,
    search: search || undefined,
    page: 1,
    limit: 50,
  })

  const { data: connectStatus } = useGetConnectStatusQuery()
  const [getOnboardUrl] = useGetConnectOnboardUrlMutation()

  const summary = data?.summary
  const items = data?.items || []

  const handleWithdraw = async () => {
    if (!connectStatus?.onboarded) {
      try {
        const res = await getOnboardUrl().unwrap()
        window.location.href = res.url
      } catch (err) {
        toast.error('Failed to start onboarding')
      }
      return
    }
    toast.success('Withdrawal initiated via Stripe Connect')
    setWithdrawModal(false)
  }

  if (isLoading) return <Spinner size={40} />
  if (isError) return <EmptyState title="Failed to load payouts" description="Could not reach the server." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Payouts</h1>
        <p className="text-sm text-slate-500 mt-0.5">Manage your payouts and withdrawal methods.</p>
      </div>

      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-card bg-emerald-50">
                <DollarSign size={28} className="text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Earning this month</p>
                <p className="text-2xl font-bold text-slate-800">
                  {summary ? formatUSD(summary.pending_payout) : '—'}
                </p>
                <p className="text-xs text-slate-400">Update your payout in settings</p>
              </div>
            </div>
            <Button onClick={() => setWithdrawModal(true)}>
              <ArrowUpRight size={16} /> Withdraw
            </Button>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardBody>
            <p className="text-xs text-slate-500">Total Earned</p>
            <p className="text-lg font-bold text-slate-800">{summary ? formatUSD(summary.total_earned) : '—'}</p>
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-slate-500">Paid Out</p>
            <p className="text-lg font-bold text-emerald-600">{summary ? formatUSD(summary.paid_out) : '—'}</p>
            {summary?.paid_count > 0 && <p className="text-xs text-slate-400">{summary.paid_count} payouts</p>}
          </CardBody>
        </Card>
        <Card>
          <CardBody>
            <p className="text-xs text-slate-500">Pending</p>
            <p className="text-lg font-bold text-amber-600">{summary ? formatUSD(summary.pending_payout) : '—'}</p>
            {summary?.pending_count > 0 && <p className="text-xs text-slate-400">{summary.pending_count} pending</p>}
          </CardBody>
        </Card>
      </div>

      <Card title="Select Payment Gateway for Payout">
        <CardBody>
          <div className="grid sm:grid-cols-3 gap-3">
            {[
              { id: 'paypal', label: 'PayPal', icon: CreditCard, desc: 'Withdraw to your PayPal account' },
              { id: 'bank', label: 'Bank Transfer', icon: Banknote, desc: 'Transfer to your bank account' },
              { id: 'stripe', label: 'Stripe', icon: Wallet, desc: 'Via Stripe Connect (active)' },
            ].map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedMethod(opt.id)}
                className={`flex items-start gap-3 p-4 rounded-card border-2 transition-colors text-left cursor-pointer ${
                  selectedMethod === opt.id
                    ? 'border-primary bg-indigo-50/50'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-card shrink-0 ${
                  selectedMethod === opt.id ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500'
                }`}>
                  <opt.icon size={20} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">{opt.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </CardBody>
      </Card>

      <Card
        title="Payouts"
        headerExtra={
          <div className="flex items-center gap-2">
            <select
              value={paymentMethodFilter}
              onChange={(e) => setPaymentMethodFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-card px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Methods</option>
              <option value="Stripe">Stripe</option>
              <option value="PayPal">PayPal</option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-slate-300 rounded-card px-2 py-1 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="all">All Status</option>
              <option value="Paid">Paid</option>
              <option value="Pending">Pending</option>
              <option value="Failed">Failed</option>
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
              className="w-full rounded-card border border-slate-300 pl-8 pr-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {items.length === 0 ? (
            <EmptyState title="No payouts" description="Payouts will appear here once you have completed transactions." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">ID</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3 pr-4 text-right">Amount</th>
                    <th className="pb-3 pr-4">Method</th>
                    <th className="pb-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{item.order_id}</td>
                      <td className="py-3 pr-4 text-slate-600">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="py-3 pr-4 text-right font-medium text-slate-800">{formatUSD(item.amount)}</td>
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

      <Modal open={withdrawModal} onClose={() => setWithdrawModal(false)} title="Withdraw Funds">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            {connectStatus?.onboarded
              ? 'Your Stripe Connect account is linked. Withdrawals are processed through Stripe.'
              : 'You need to complete Stripe Connect onboarding before you can withdraw funds.'}
          </p>
          <div className="bg-slate-50 rounded-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Available for withdrawal</span>
              <span className="font-semibold text-slate-800">{summary ? formatUSD(summary.pending_payout) : '—'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Payout method</span>
              <span className="text-slate-700">Stripe Connect {connectStatus?.onboarded ? '✓' : '(not set up)'}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setWithdrawModal(false)}>Cancel</Button>
            <Button onClick={handleWithdraw}>
              {connectStatus?.onboarded ? 'Confirm Withdrawal' : 'Set Up Stripe Connect'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
