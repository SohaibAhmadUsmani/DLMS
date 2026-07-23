import { Heart, Star, ArrowRight } from 'lucide-react'

const bannerThemes = {
  orange: 'linear-gradient(135deg, #FF7A45 0%, #FF9A56 60%, #FFB067 100%)',
  purple: 'linear-gradient(135deg, #7C3AED 0%, #9D4EDD 60%, #B968F0 100%)',
  blue: 'linear-gradient(135deg, #1E5FBF 0%, #2B7FD6 60%, #4FA3E8 100%)',
  gold: 'linear-gradient(135deg, #E8A70A 0%, #F5B90D 60%, #FFCE3D 100%)',
}

export default function CourseCard({
  bannerImage,
  subjectPhoto,
  badgeIcon,
  badgeColor = '#000000',
  avatarPhoto,
  authorName,
  category,
  title,
  rating,
  reviewCount,
  price,
  onAddToCart,
  bannerTheme = 'orange',
}) {
  const gradient = bannerThemes[bannerTheme] || bannerThemes.orange

  return (
    <div className="bg-white rounded-[20px] border border-[#ECECF0] shadow-[0_4px_20px_rgba(0,0,0,0.06)] w-[280px] shrink-0 overflow-hidden select-none flex flex-col">
      <div
        className="h-[190px] relative overflow-hidden rounded-t-[20px]"
        style={{
          background: bannerImage ? `url(${bannerImage}) center/cover no-repeat` : gradient,
        }}
      >
        {subjectPhoto && (
          <img src={subjectPhoto} alt="" className="absolute right-0 bottom-0 h-full object-cover pointer-events-none" />
        )}

        <button className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#6B7280] hover:text-brand-pink transition-colors z-10 shadow-sm" aria-label="Add to wishlist">
          <Heart size={16} />
        </button>

        {badgeIcon && (
          <div className="absolute top-3 right-3 w-8 h-8 rounded-full flex items-center justify-center z-10 shadow-sm" style={{ backgroundColor: badgeColor }}>
            <img src={badgeIcon} alt="" className="w-5 h-5" />
          </div>
        )}
      </div>

      <div className="p-4 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full overflow-hidden shrink-0">
              <img src={avatarPhoto} alt={authorName} className="w-full h-full object-cover" />
            </div>
            <span className="text-[14px] font-medium text-[#6E7191]">{authorName}</span>
          </div>
          <span className="bg-[#F1F1F5] text-[#14142B] text-[12px] font-semibold px-3 py-0.5 rounded-full shrink-0">{category}</span>
        </div>

        <div className="flex-1">
          <h3 className="text-[18px] font-bold text-[#14142B] leading-[1.3] line-clamp-2 mb-2 text-left">{title}</h3>
          <div className="flex items-center gap-1.5 mb-3">
            <Star size={14} className="text-[#FBBF24] fill-[#FBBF24]" />
            <span className="text-[14px] font-bold text-[#14142B]">{rating}</span>
            <span className="text-[13px] text-[#8A8A94]">({reviewCount} Reviews)</span>
          </div>
        </div>

        <div className="flex items-center justify-between mt-auto">
          <span className="text-[22px] font-extrabold text-[#F5385C]">${price.toFixed(2)}</span>
          <button
            onClick={onAddToCart}
            className="bg-black text-white text-[14px] font-semibold px-[18px] py-[10px] rounded-full flex items-center gap-1.5 hover:bg-slate-800 transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            Add to Cart <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
