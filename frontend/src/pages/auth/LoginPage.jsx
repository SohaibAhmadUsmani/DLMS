import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { BookOpen, Sparkles } from 'lucide-react'
import { useLoginMutation, useLazyGetMeQuery } from '../../features/core/coreApi'
import { useAppDispatch } from '../../app/hooks'
import { loginSuccess } from '../../features/auth/authSlice'
import { Card, Input, Button, TopUtilityBar, Navbar, Footer } from '../../components/ui'

export default function LoginPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [login, { isLoading }] = useLoginMutation()
  const [triggerGetMe] = useLazyGetMeQuery()
  const [apiError, setApiError] = useState('')

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ defaultValues: { email: '', password: '' } })

  const onSubmit = async (data) => {
    try {
      setApiError('')
      const result = await login(data).unwrap()
      dispatch(loginSuccess({ user: null, token: result.access_token, role: result.role }))
      const userData = await triggerGetMe().unwrap()
      dispatch(loginSuccess({ user: userData, token: result.access_token, role: result.role }))
      navigate(`/${result.role}`)
    } catch (err) {
      const msg = err.data?.detail || 'Invalid email or password'
      setApiError(msg)
      toast.error(msg)
    }
  }

  return (
    <div className="font-sans">
      <TopUtilityBar />
      <Navbar />
      <div className="flex min-h-screen">
        <div className="flex w-full lg:w-1/2 items-center justify-center px-6 py-16">
          <Card className="w-full max-w-md p-8">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
              <p className="text-sm text-slate-500 mt-1">Sign in to continue your learning journey</p>
            </div>

            {apiError && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-danger">
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Email"
                type="email"
                placeholder="Enter your email"
                error={errors.email?.message}
                {...register('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+/, message: 'Invalid email address' },
                })}
              />
              <Input
                label="Password"
                type="password"
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'At least 6 characters' },
                })}
              />
              <Button type="submit" loading={isLoading} className="w-full" size="lg">
                Sign In
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-brand-pink font-semibold hover:underline">
                Register
              </Link>
            </p>
          </Card>
        </div>

        <div className="hidden lg:flex w-1/2 items-center justify-center relative overflow-hidden bg-gradient-to-br from-indigo-600 via-primary to-indigo-800">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute top-1/4 left-1/4 h-48 w-48 rounded-full bg-white/5 blur-2xl" />

          <div className="relative z-10 text-center text-white px-8">
            <div className="mx-auto mb-6 flex items-center justify-center gap-4">
              <BookOpen size={48} className="text-accent" />
              <Sparkles size={36} className="text-white/80" />
            </div>
            <h2 className="text-3xl font-bold mb-3">Start Your Journey</h2>
            <p className="text-indigo-200 max-w-sm mx-auto">
              Access expert-led courses, track your progress, and earn recognized certificates.
            </p>
            <div className="mt-8 grid grid-cols-3 gap-6 text-center text-sm">
              <div>
                <p className="text-2xl font-bold text-accent">50+</p>
                <p className="text-indigo-200">Courses</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">10K</p>
                <p className="text-indigo-200">Students</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-accent">95%</p>
                <p className="text-indigo-200">Satisfaction</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}