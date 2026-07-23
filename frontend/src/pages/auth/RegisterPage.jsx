import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { BookOpen, Sparkles, User, ShieldCheck } from 'lucide-react'
import clsx from 'clsx'
import { useRegisterMutation } from '../../features/core/coreApi'
import { Input, Button, Card, TopUtilityBar, Navbar, Footer } from '../../components/ui'

const roles = [
  { value: 'student', label: 'Student', icon: User },
  { value: 'teacher', label: 'Teacher', icon: ShieldCheck },
]

export default function RegisterPage() {
  const navigate = useNavigate()
  const [register, { isLoading }] = useRegisterMutation()
  const [apiError, setApiError] = useState('')

  const {
    register: reg,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm({ defaultValues: { name: '', email: '', password: '', confirmPassword: '', role: 'student' } })

  const roleValue = watch('role')

  const onSubmit = async (data) => {
    try {
      setApiError('')
      await register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      }).unwrap()
      toast.success('Account created successfully! Please sign in.')
      navigate('/login')
    } catch (err) {
      const detail = err.data?.detail || 'Registration failed'
      if (err.status === 409) {
        setError('email', { message: detail })
      }
      setApiError(detail)
      toast.error(detail)
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
              <h1 className="text-2xl font-bold text-slate-900">Create an account</h1>
              <p className="text-sm text-slate-500 mt-1">Join DLMS and start learning today</p>
            </div>

            {apiError && !errors.email && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-danger">
                {apiError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Enter Your name"
                error={errors.name?.message}
                {...reg('name', { required: 'Name is required' })}
              />
              <Input
                label="Email"
                type="email"
                placeholder="Enter your email"
                error={errors.email?.message}
                {...reg('email', {
                  required: 'Email is required',
                  pattern: { value: /\S+@\S+/, message: 'Invalid email address' },
                })}
              />
              <Input
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                error={errors.password?.message}
                {...reg('password', {
                  required: 'Password is required',
                  minLength: { value: 6, message: 'At least 6 characters' },
                })}
              />
              <Input
                label="Confirm Password"
                type="password"
                placeholder="Re-enter your password"
                error={errors.confirmPassword?.message}
                {...reg('confirmPassword', {
                  required: 'Please confirm your password',
                  validate: (v) => v === watch('password') || 'Passwords do not match',
                })}
              />

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">I want to join as</label>
                <div className="flex gap-3">
                  {roles.map((r) => {
                    const selected = roleValue === r.value
                    return (
                      <label
                        key={r.value}
                        className={clsx(
                          'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-btn border-2 px-4 py-3 text-sm font-medium transition-colors',
                          selected
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-slate-300 text-slate-600 hover:border-slate-400',
                        )}
                      >
                        <input
                          type="radio"
                          {...reg('role')}
                          value={r.value}
                          className="sr-only"
                        />
                        <r.icon size={18} />
                        {r.label}
                      </label>
                    )
                  })}
                </div>
              </div>

              <Button type="submit" loading={isLoading} className="w-full" size="lg">
                Create Account
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-brand-pink font-semibold hover:underline">
                Sign in
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
            <h2 className="text-3xl font-bold mb-3">Join Our Community</h2>
            <p className="text-indigo-200 max-w-sm mx-auto">
              Unlock access to expert-led courses, interactive quizzes, and recognized certificates.
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