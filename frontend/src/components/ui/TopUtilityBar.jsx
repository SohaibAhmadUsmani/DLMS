import { MapPin, Phone } from 'lucide-react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import SocialIcon from './SocialIcon'

export default function TopUtilityBar() {
  const [ref, visible] = useScrollAnimation({ threshold: 0.1 })
  return (
    <div ref={ref} className={`bg-surface-base text-text-tertiary text-[13px] leading-[24px] pl-[110px] pr-[150px] py-[14px] hidden md:flex items-center justify-between transition-all duration-1000 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 hover:text-white transition-colors duration-200"><MapPin size={13} /> Staten Island, New York</span>
        <span className="flex items-center gap-1 hover:text-white transition-colors duration-200"><Phone size={13} /> (702) 555-0122</span>
      </div>
      <div className="flex items-center gap-1.5">
        <a href="https://www.facebook.com/share/1cnuAtzHh5/?mibextid=wwXIfr" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="Facebook" className="hover:text-brand-pink" /></a>
        <a href="https://www.instagram.com/sohaibahmadusmani" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="Instagram" className="hover:text-brand-pink" /></a>
        <a href="https://x.com/sohaib_135" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="X" className="hover:text-brand-pink" /></a>
        <a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="Youtube" className="hover:text-brand-pink" /></a>
        <a href="https://www.linkedin.com/in/sohaibusmani135" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform duration-200"><SocialIcon name="Linkedin" className="hover:text-brand-pink" /></a>
      </div>
    </div>
  )
}
