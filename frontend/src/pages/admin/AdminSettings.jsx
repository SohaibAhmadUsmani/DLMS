import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { useGetSettingsQuery, useUpdateSettingsMutation } from '../../features/console/consoleApi'
import Card, { CardHeader, CardBody } from '../../components/ui/Card'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'

const KNOWN_KEYS = [
  { key: 'passing_threshold', label: 'Passing Threshold %', type: 'number', placeholder: '75' },
  { key: 'site_name', label: 'Site Name', type: 'text', placeholder: 'DLMS' },
  { key: 'max_quiz_attempts', label: 'Max Quiz Attempts', type: 'number', placeholder: '3' },
]

export default function AdminSettings() {
  const { data: settings, isLoading, isError } = useGetSettingsQuery()
  const [updateSettings, { isLoading: saving }] = useUpdateSettingsMutation()

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm()

  useEffect(() => {
    if (settings) {
      const defaults = {}
      KNOWN_KEYS.forEach(({ key }) => {
        defaults[key] = settings[key] || ''
      })
      reset(defaults)
    }
  }, [settings, reset])

  const onSubmit = async (data) => {
    try {
      await updateSettings(data).unwrap()
      toast.success('Settings saved')
      reset(data)
    } catch (err) {
      toast.error(err.data?.detail || 'Failed to save settings')
    }
  }

  if (isLoading) return <Spinner size={40} />
  if (isError && !settings) {
    return <EmptyState title="Failed to load settings" description="Could not reach the server." />
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-lg font-semibold text-slate-800">Platform Settings</h2>
      </CardHeader>
      <CardBody>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-lg">
          {KNOWN_KEYS.map(({ key, label, type, placeholder }) => (
            <Input
              key={key}
              label={label}
              type={type}
              placeholder={placeholder}
              error={errors[key]?.message}
              {...register(key, { required: `${label} is required` })}
            />
          ))}
          <div className="pt-2">
            <Button type="submit" loading={saving} disabled={!isDirty}>
              Save Settings
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}
