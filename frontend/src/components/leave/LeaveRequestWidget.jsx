import { useState } from 'react'
import { CalendarDays, Send, CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGetLeaveRequestsQuery, useCreateLeaveRequestMutation } from '../../features/core/coreApi'
import Card, { CardBody } from '../ui/Card'
import Button from '../ui/Button'
import Badge from '../ui/Badge'
import Spinner from '../ui/Spinner'
import EmptyState from '../ui/EmptyState'

const LEAVE_TYPES = ['Emergency', 'Casual', 'Sick', 'Other']

const STATUS_STYLES = {
  pending: { variant: 'warning', label: 'Pending' },
  approved: { variant: 'success', label: 'Approved' },
  rejected: { variant: 'danger', label: 'Rejected' },
}

export default function LeaveRequestWidget() {
  const { data: leaves, isLoading } = useGetLeaveRequestsQuery()
  const [createLeave, { isLoading: creating }] = useCreateLeaveRequestMutation()

  const [leaveType, setLeaveType] = useState(LEAVE_TYPES[0])
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!startDate || !endDate || !reason.trim()) {
      toast.error('Please fill in all fields')
      return
    }
    try {
      await createLeave({
        leave_type: leaveType,
        start_date: new Date(startDate).toISOString(),
        end_date: new Date(endDate).toISOString(),
        reason: reason.trim(),
      }).unwrap()
      toast.success('Leave request submitted')
      setLeaveType(LEAVE_TYPES[0])
      setStartDate('')
      setEndDate('')
      setReason('')
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to submit leave request')
    }
  }

  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {/* Submit form */}
      <Card title="Apply for Leave">
        <CardBody>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Leave Type</label>
                <select
                  value={leaveType}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary bg-white"
                >
                  {LEAVE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Reason</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Brief reason for leave"
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" loading={creating}>
                <Send size={14} /> Submit Request
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      {/* Previous requests */}
      <Card title="My Leave Requests" headerExtra={leaves?.length > 0 ? <span className="text-xs text-slate-400">{leaves.length} total</span> : null}>
        <CardBody>
          {isLoading ? (
            <div className="flex justify-center py-6"><Spinner size={24} /></div>
          ) : !leaves || leaves.length === 0 ? (
            <EmptyState icon={CalendarDays} title="No leave requests yet" description="Submit your first request above." />
          ) : (
            <div className="space-y-3">
              {leaves.map((lr) => {
                const st = STATUS_STYLES[lr.status] || STATUS_STYLES.pending
                return (
                  <div key={lr.id} className="flex items-start gap-3 p-3 rounded-card border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center min-w-[48px] shrink-0">
                      {lr.status === 'approved' ? (
                        <CheckCircle size={20} className="text-success" />
                      ) : lr.status === 'rejected' ? (
                        <XCircle size={20} className="text-danger" />
                      ) : (
                        <AlertCircle size={20} className="text-amber-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={st.variant}>{st.label}</Badge>
                        <Badge variant="neutral">{lr.leave_type}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <CalendarDays size={12} />
                        <span>{formatDate(lr.start_date)} – {formatDate(lr.end_date)}</span>
                      </div>
                      {lr.reason && (
                        <p className="text-sm text-slate-700 mt-1">{lr.reason}</p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        Applied on {formatDate(lr.applied_on)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
