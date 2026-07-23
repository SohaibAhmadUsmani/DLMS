import { useNavigate } from 'react-router-dom'
import { XCircle, ArrowLeft, BookOpen } from 'lucide-react'
import Card, { CardBody } from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function PaymentCancel() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardBody className="space-y-5">
          <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center mx-auto">
            <XCircle size={48} className="text-red-500" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800">Payment Cancelled</h1>
          <p className="text-sm text-slate-500">
            Your payment was cancelled. No charges have been made. You can try again whenever you're ready.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft size={16} /> Back to Course
            </Button>
            <Button variant="outline" onClick={() => navigate('/student/browse')}>
              <BookOpen size={16} /> Browse Courses
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
