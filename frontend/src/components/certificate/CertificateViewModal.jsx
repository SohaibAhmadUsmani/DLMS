import { useRef } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { Download, X } from 'lucide-react'
import Modal from '../ui/Modal'
import Button from '../ui/Button'

const ribbonStyle = (position) => {
  const base = {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 10,
  }
  const map = {
    'top-left': { top: 0, left: 0, borderTop: '60px solid #e85d75', borderRight: '60px solid transparent' },
    'top-right': { top: 0, right: 0, borderTop: '60px solid #e85d75', borderLeft: '60px solid transparent' },
    'bottom-left': { bottom: 0, left: 0, borderBottom: '60px solid #e85d75', borderRight: '60px solid transparent' },
    'bottom-right': { bottom: 0, right: 0, borderBottom: '60px solid #e85d75', borderLeft: '60px solid transparent' },
  }
  return { ...base, ...map[position] }
}

const innerRibbonStyle = (position) => {
  const base = {
    position: 'absolute',
    width: 0,
    height: 0,
    zIndex: 11,
  }
  const map = {
    'top-left': { top: 0, left: 0, borderTop: '40px solid #f4a460', borderRight: '40px solid transparent' },
    'top-right': { top: 0, right: 0, borderTop: '40px solid #f4a460', borderLeft: '40px solid transparent' },
    'bottom-left': { bottom: 0, left: 0, borderBottom: '40px solid #f4a460', borderRight: '40px solid transparent' },
    'bottom-right': { bottom: 0, right: 0, borderBottom: '40px solid #f4a460', borderLeft: '40px solid transparent' },
  }
  return { ...base, ...map[position] }
}

export default function CertificateViewModal({ open, onClose, data }) {
  const certRef = useRef(null)

  if (!data) return null

  const handleDownload = async () => {
    if (!certRef.current) return
    try {
      const canvas = await html2canvas(certRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width / 3, canvas.height / 3],
      })
      pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3)
      const safeTitle = (data.course_title || 'Course').replace(/[^a-zA-Z0-9]/g, '_')
      const safeName = (data.student_name || 'Student').replace(/[^a-zA-Z0-9]/g, '_')
      pdf.save(`Certificate-${safeTitle}-${safeName}.pdf`)
    } catch (err) {
      console.error('PDF generation error:', err)
    }
  }

  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-4xl">
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
        <h2 className="text-lg font-bold text-slate-800">View Certificate</h2>
        <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">
          <X size={20} />
        </button>
      </div>

      <div className="p-6">
        <div ref={certRef} style={{
          position: 'relative',
          width: 800,
          height: 560,
          margin: '0 auto',
          backgroundColor: '#fff8f0',
          border: '8px solid #c9a04e',
          borderRadius: 4,
          overflow: 'hidden',
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {/* Corner ribbons */}
          <div style={ribbonStyle('top-left')} />
          <div style={innerRibbonStyle('top-left')} />
          <div style={ribbonStyle('top-right')} />
          <div style={innerRibbonStyle('top-right')} />
          <div style={ribbonStyle('bottom-left')} />
          <div style={innerRibbonStyle('bottom-left')} />
          <div style={ribbonStyle('bottom-right')} />
          <div style={innerRibbonStyle('bottom-right')} />

          {/* Inner decorative border */}
          <div style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            bottom: 20,
            border: '2px solid #c9a04e',
            borderRadius: 2,
            pointerEvents: 'none',
          }} />

          {/* Content */}
          <div style={{
            position: 'relative',
            zIndex: 5,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: '40px 60px',
            textAlign: 'center',
          }}>
            <p style={{
              fontSize: 14,
              letterSpacing: 4,
              textTransform: 'uppercase',
              color: '#8b7355',
              marginBottom: 8,
            }}>
              Certificate of Completion
            </p>

            <p style={{
              fontSize: 13,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#8b7355',
              marginBottom: 16,
            }}>
              This Certificate Is Awarded To
            </p>

            <h1 style={{
              fontSize: 36,
              fontWeight: 700,
              color: '#2d1f00',
              marginBottom: 20,
              letterSpacing: 1,
              lineHeight: 1.2,
            }}>
              {data.student_name || 'Student'}
            </h1>

            <p style={{
              fontSize: 14,
              color: '#555',
              lineHeight: 1.7,
              maxWidth: 560,
              marginBottom: 28,
            }}>
              has successfully completed the course{' '}
              <strong style={{ color: '#2d1f00' }}>"{data.course_title || 'Course'}"</strong>
              {' '}demonstrating exceptional dedication and achievement in mastering the subject matter.
            </p>

            {/* Signature */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: 24,
            }}>
              <div style={{
                width: 200,
                height: 1,
                backgroundColor: '#c9a04e',
                marginBottom: 8,
              }} />
              <p style={{
                fontSize: 13,
                fontWeight: 600,
                color: '#2d1f00',
                marginBottom: 2,
              }}>
                {data.teacher_name || 'Instructor'}
              </p>
              <p style={{
                fontSize: 11,
                color: '#8b7355',
                letterSpacing: 1,
                textTransform: 'uppercase',
              }}>
                Instructor
              </p>
            </div>

            {/* Gold badge */}
            <div style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: '#c9a04e',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              marginBottom: 16,
            }}>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1.2 }}>Company</span>
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', lineHeight: 1.2 }}>Award</span>
              <span style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{data.completion_year || ''}</span>
            </div>

            {/* Date */}
            <p style={{
              fontSize: 12,
              color: '#8b7355',
            }}>
              Date: {formatDate(data.issued_at)}
            </p>
          </div>
        </div>

        {/* Download button */}
        <div className="flex justify-end mt-6">
          <Button onClick={handleDownload} variant="accent">
            <Download size={16} /> Download
          </Button>
        </div>
      </div>
    </Modal>
  )
}
