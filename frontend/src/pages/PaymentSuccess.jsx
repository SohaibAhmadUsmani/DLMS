import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle, BookOpen, ArrowRight, Home } from 'lucide-react'
import { useLazyVerifyPaymentQuery } from '../features/core/coreApi'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import { formatUSD } from '../lib/formatCurrency'

export default function PaymentSuccess() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const sessionId = searchParams.get('session_id')
  const [verify, { data, isLoading, error }] = useLazyVerifyPaymentQuery()
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    if (sessionId && !verified) {
      verify(sessionId)
      setVerified(true)
    }
  }, [sessionId, verify, verified])

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardBody className="space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto">
              <span className="text-3xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">No Payment Session Found</h1>
            <p className="text-sm text-slate-500">We couldn't find a payment session ID. Please check your confirmation email or contact support.</p>
            <div className="flex gap-3 justify-center pt-2">
              <Button variant="outline" onClick={() => navigate('/student/browse')}>
                <BookOpen size={16} /> Browse Courses
              </Button>
              <Button onClick={() => navigate('/student')}>
                <Home size={16} /> Dashboard
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <CardBody className="space-y-4">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
              <span className="text-3xl">❌</span>
            </div>
            <h1 className="text-xl font-bold text-slate-800">Verification Failed</h1>
            <p className="text-sm text-slate-500">We couldn't verify your payment. Your enrollment may still be processing.</p>
            <Button onClick={() => navigate('/student')}>
              <Home size={16} /> Go to Dashboard
            </Button>
          </CardBody>
        </Card>
      </div>
    )
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Spinner size={40} />
          <p className="text-sm text-slate-500 mt-4">Verifying your payment...</p>
        </div>
      </div>
    )
  }

  const paid = data?.paymentStatus === 'paid'
  const amount = data?.amountTotal ? formatUSD(data.amountTotal / 100) : '—'

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardBody className="space-y-5">
          <div className={`h-20 w-20 rounded-full ${paid ? 'bg-emerald-100' : 'bg-amber-100'} flex items-center justify-center mx-auto`}>
            {paid ? (
              <CheckCircle size={48} className="text-emerald-600" />
            ) : (
              <span className="text-3xl">⏳</span>
            )}
          </div>

          <h1 className="text-2xl font-bold text-slate-800">
            {paid ? 'Payment Successful!' : 'Payment Pending'}
          </h1>
          <p className="text-sm text-slate-500">
            {paid
              ? 'You have been enrolled in the course. Start learning now!'
              : 'Your payment is being processed. You will be enrolled shortly.'}
          </p>

          <div className="bg-slate-50 rounded-card p-4 space-y-2 text-sm text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Session ID</span>
              <span className="font-mono text-slate-700 text-xs truncate max-w-[200px]">{data.sessionId}</span>
            </div>
            {data.amountTotal && (
              <div className="flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-semibold text-slate-800">{amount}</span>
              </div>
            )}
            {data.currency && (
              <div className="flex justify-between">
                <span className="text-slate-500">Currency</span>
                <span className="text-slate-700 uppercase">{data.currency}</span>
              </div>
            )}
            {data.customerEmail && (
              <div className="flex justify-between">
                <span className="text-slate-500">Email</span>
                <span className="text-slate-700">{data.customerEmail}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-500">Status</span>
              <span className={`font-medium ${paid ? 'text-emerald-600' : 'text-amber-600'}`}>
                {data.paymentStatus}
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={() => navigate('/student')}>
              <Home size={16} /> My Courses
            </Button>
            <Button variant="outline" onClick={() => navigate('/student/browse')}>
              <BookOpen size={16} /> Browse More
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
