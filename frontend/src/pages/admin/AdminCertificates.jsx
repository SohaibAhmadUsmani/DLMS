import { useState } from 'react'
import { Award, Search, Settings } from 'lucide-react'
import toast from 'react-hot-toast'
import { useGetAdminCertificatesQuery, useGetAdminCertificateSettingsQuery, useUpdateAdminCertificateSettingsMutation } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import Input from '../../components/ui/Input'

export default function AdminCertificates() {
  const [search, setSearch] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [badgeText, setBadgeText] = useState('')

  const { data, isLoading } = useGetAdminCertificatesQuery({ search: search || undefined, page: 1, limit: 200 })
  const { data: settingsData } = useGetAdminCertificateSettingsQuery()
  const [updateSettings] = useUpdateAdminCertificateSettingsMutation()

  const items = data?.items || []

  const openSettings = () => {
    setBadgeText(settingsData?.badge_text || 'Company Award')
    setSettingsOpen(true)
  }

  const handleSaveSettings = async () => {
    if (!badgeText.trim()) {
      toast.error('Badge text is required')
      return
    }
    try {
      await updateSettings({ badge_text: badgeText.trim() }).unwrap()
      toast.success('Certificate settings updated')
      setSettingsOpen(false)
    } catch {
      toast.error('Failed to update settings')
    }
  }

  if (isLoading) return <Spinner size={40} />

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Certificates</h1>
          <p className="text-sm text-slate-500 mt-0.5">Audit all issued certificates platform-wide.</p>
        </div>
        <Button variant="outline" size="sm" onClick={openSettings}>
          <Settings size={14} /> Settings
        </Button>
      </div>

      <Card title={`All Certificates (${data?.total || 0})`}>
        <CardBody>
          <div className="relative mb-4 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, course, or ID..."
              className="w-full rounded-lg border border-slate-300 pl-8 pr-3 py-1.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {items.length === 0 ? (
            <EmptyState icon={Award} title="No certificates issued yet" description="Certificates appear here when students complete courses." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Certificate ID</th>
                    <th className="pb-3 pr-4">Student</th>
                    <th className="pb-3 pr-4">Course</th>
                    <th className="pb-3 pr-4">Signed By</th>
                    <th className="pb-3">Issued</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((cert) => (
                    <tr key={cert.id} className="hover:bg-slate-50/50">
                      <td className="py-3 pr-4 font-mono text-xs text-slate-600">{cert.certificate_id}</td>
                      <td className="py-3 pr-4 font-medium text-slate-800">{cert.student_name}</td>
                      <td className="py-3 pr-4 text-slate-600">{cert.course_title}</td>
                      <td className="py-3 pr-4 text-slate-600">{cert.teacher_name}</td>
                      <td className="py-3 text-slate-500">{new Date(cert.issued_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Certificate Settings">
        <div className="space-y-4">
          <Input
            label="Badge / Award Text"
            value={badgeText}
            onChange={(e) => setBadgeText(e.target.value)}
            placeholder="e.g. Company Award"
          />
          <p className="text-xs text-slate-400">
            This text appears on the gold badge of every certificate.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
