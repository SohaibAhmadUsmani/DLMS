import { Heart, Star } from 'lucide-react'

const socialPaths = {
  Facebook: 'M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z',
  Instagram: 'M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4H7.6m9.65 1.5a1.25 1.25 0 0 1 0 2.5 1.25 1.25 0 0 1 0-2.5M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10m0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  Twitter: 'M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z',
  Youtube: 'M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.94 2C5.12 20 12 20 12 20s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM10 15.5V8.5l6 3.5-6 3.5z',
  Linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
}

function SocialBadge({ name }) {
  return (
    <div className="w-[32px] h-[32px] rounded-full bg-[#14142B] flex items-center justify-center shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={socialPaths[name]} />
      </svg>
    </div>
  )
}

export default function ProfileCard({ photo, name, role, rating, reviews }) {
  return (
    <div className="bg-white rounded-[20px] border border-[#ECECF0] shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-6 relative flex flex-col items-center text-center w-[272px] shrink-0 select-none">
      <button className="absolute top-4 right-4 w-9 h-9 rounded-full border border-[#E5E5EA] flex items-center justify-center text-[#6B7280] hover:text-brand-pink hover:border-brand-pink transition-colors" aria-label="Add to wishlist">
        <Heart size={16} />
      </button>
      <div className="relative w-[140px] h-[140px] rounded-full bg-[#E8E6F5] flex items-center justify-center">
        <img src={photo} alt={name} className="w-[120px] h-[120px] rounded-full object-cover" />
        <div className="absolute bottom-1 right-1 w-7 h-7 rounded-full bg-[#16A34A] border-[3px] border-white flex items-center justify-center">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </div>
      <p className="text-[18px] font-bold text-[#14142B] mt-4">{name}</p>
      <p className="text-[14px] font-normal text-[#6E7191] mt-1">{role}</p>
      <div className="flex items-center justify-center gap-1.5 mt-3">
        <Star size={16} className="text-[#FBBF24] fill-[#FBBF24]" />
        <span className="text-[15px] font-bold text-[#14142B]">{rating}</span>
        <span className="text-[14px] text-[#8A8A94]">({reviews} Reviews)</span>
      </div>
      <div className="flex items-center justify-center gap-[10px] mt-4">
        {['Facebook', 'Instagram', 'Twitter', 'Youtube', 'Linkedin'].map(social => (
          <SocialBadge key={social} name={social} />
        ))}
      </div>
    </div>
  )
}
