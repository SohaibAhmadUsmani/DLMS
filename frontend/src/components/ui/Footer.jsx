import { useNavigate } from 'react-router-dom'
import { GraduationCap, MapPin, Phone, Mail } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import SocialIcon from './SocialIcon'

export default function Footer() {
  const [ref, visible] = useScrollAnimation()
  const navigate = useNavigate()
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <footer className="bg-surface-base text-white pt-16 pb-6" ref={ref}>
      <div className={`max-w-7xl mx-auto px-[var(--space-8)] transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 justify-items-center">
          <div style={{ transitionDelay: visible ? '0ms' : '0ms' }}>
            <div className="flex items-center gap-1.5 mb-4">
              <GraduationCap size={24} className="text-brand-pink" />
              <span className="text-lg font-bold">DLMS</span>
            </div>
            <p className="text-white/50 text-xs leading-relaxed mb-4">Empowering learners worldwide with accessible, high-quality education.</p>
            <div className="flex gap-3 text-white/40">
              <a href="https://www.facebook.com/share/1cnuAtzHh5/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="Facebook" size={16} className="hover:text-brand-pink cursor-pointer" /></a>
              <a href="https://www.instagram.com/sohaibahmadusmani" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="Instagram" size={16} className="hover:text-brand-pink cursor-pointer" /></a>
              <a href="https://x.com/sohaib_135" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="X" size={16} className="hover:text-brand-pink cursor-pointer" /></a>
              <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="Youtube" size={16} className="hover:text-brand-pink cursor-pointer" /></a>
              <a href="https://www.linkedin.com/in/sohaibusmani135" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="Linkedin" size={16} className="hover:text-brand-pink cursor-pointer" /></a>
            </div>
          </div>
          <div style={{ transitionDelay: visible ? '100ms' : '0ms' }}>
            <h4 className="text-sm font-semibold mb-4">Quick Links</h4>
            <div className="space-y-2.5 text-xs text-white/50">
              {[{ label: 'About Us', href: '/#about' }, { label: 'Contact Us', href: '/#contact' }, { label: 'FAQ', href: '/#faq' }].map(l => (
                <p key={l.label} onClick={() => l.href.startsWith('/#') ? scrollTo(l.href.slice(2)) : navigate(l.href)} className="hover:text-white cursor-pointer transition-colors duration-200">{l.label}</p>
              ))}
            </div>
          </div>
          <div style={{ transitionDelay: visible ? '300ms' : '0ms' }}>
            <h4 className="text-sm font-semibold mb-4">Contact Info</h4>
            <div className="space-y-2.5 text-xs text-white/50">
              <p className="flex items-center gap-2"><MapPin size={13} /> 123 Madison Avenue, New York, NY 10016</p>
              <p className="flex items-center gap-2"><Phone size={13} /> (702) 555-0122</p>
              <p className="flex items-center gap-2"><Mail size={13} /> hello@dlms.com</p>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>&copy; 2026 DLMS. All rights reserved.</p>
          <div className="flex gap-4">
            <span onClick={() => alert('Privacy Policy page coming soon.')} className="hover:text-white cursor-pointer">Privacy Policy</span>
            <span onClick={() => alert('Terms of Service page coming soon.')} className="hover:text-white cursor-pointer">Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
