import { useState } from 'react'
import { Award, ExternalLink } from 'lucide-react'
import { useGetMyCertificatesQuery } from '../../features/core/coreApi'
import Card, { CardBody } from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import EmptyState from '../../components/ui/EmptyState'
import CertificateViewModal from '../../components/certificate/CertificateViewModal'

export default function StudentCertificates() {
  const { data: certificates, isLoading, isError } = useGetMyCertificatesQuery()
  const [selectedCert, setSelectedCert] = useState(null)

  if (isLoading) return <Spinner size={40} />
  if (isError) return <EmptyState title="Failed to load certificates" description="Could not reach the server." />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">My Certificates</h1>
        <p className="text-sm text-slate-500 mt-0.5">Certificates earned for completed courses.</p>
      </div>

      {(!certificates || certificates.length === 0) ? (
        <EmptyState
          icon={Award}
          title="No certificates yet"
          description="Complete a course to earn your first certificate."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert) => (
            <Card key={cert.id} className="hover:shadow-md transition-shadow">
              <CardBody>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-card bg-amber-50 shrink-0">
                    <Award size={24} className="text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-800 truncate">{cert.course_title}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Earned {new Date(cert.issued_at).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{cert.certificate_id}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedCert(cert)}
                    className="w-full"
                  >
                    <ExternalLink size={14} /> View Certificate
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <CertificateViewModal
        open={selectedCert !== null}
        onClose={() => setSelectedCert(null)}
        data={selectedCert}
      />
    </div>
  )
}
