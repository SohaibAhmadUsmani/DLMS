import { useState, useCallback, useEffect, useRef } from 'react'
import { Star } from 'lucide-react'
import PhotoReviewBadge from './PhotoReviewBadge'

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function TestimonialsSection({ heading = "What People Say About Us", subtext = "Hear from our community of learners and instructors.", testimonials = [], groupPhoto, reviewAvatars, arrowIcon }) {
  const perPage = 2
  const totalSlides = Math.ceil(testimonials.length / perPage)
  const pages = Array.from({ length: totalSlides }).map((_, i) => testimonials.slice(i * perPage, i * perPage + perPage))
  const duplicated = [...pages, ...pages]
  const [currentPage, setCurrentPage] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [isPaused, setIsPaused] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartX = useRef(0)
  const dragDelta = useRef(0)
  const intervalRef = useRef(null)
  const [motionOk] = useState(() => !prefersReducedMotion())

  const goToPage = useCallback((page) => {
    setCurrentPage(page)
    setIsTransitioning(true)
  }, [])

  useEffect(() => {
    if (!motionOk || isPaused || totalSlides <= 1) return
    intervalRef.current = setInterval(() => {
      setCurrentPage(prev => prev + 1)
    }, 3500)
    return () => clearInterval(intervalRef.current)
  }, [totalSlides, isPaused, motionOk])

  useEffect(() => {
    if (currentPage >= totalSlides) {
      requestAnimationFrame(() => {
        setIsTransitioning(false)
        setCurrentPage(0)
        requestAnimationFrame(() => setIsTransitioning(true))
      })
    }
  }, [currentPage, totalSlides])

  const startDrag = useCallback((clientX) => {
    setIsDragging(true)
    dragStartX.current = clientX
    dragDelta.current = 0
    setDragOffset(0)
  }, [])

  const moveDrag = useCallback((clientX) => {
    if (!isDragging) return
    dragDelta.current = clientX - dragStartX.current
    setDragOffset(dragDelta.current)
  }, [isDragging])

  const endDrag = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    if (Math.abs(dragDelta.current) > 50) {
      setCurrentPage(prev => {
        const next = dragDelta.current < 0 ? prev + 1 : prev - 1
        return Math.max(0, Math.min(next, totalSlides * 2 - 1))
      })
    }
    setDragOffset(0)
  }, [isDragging, totalSlides])

  return (
    <section className="relative bg-white overflow-hidden px-6 py-14">
      <div className="absolute bottom-0 left-0 w-[400px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(circle at bottom left, rgba(255, 182, 193, 0.35), transparent 60%)' }} />

      <div className="max-w-6xl mx-auto relative">
        <div className="relative flex justify-between items-start">
          <div>
            <h2 className="inline-flex items-center gap-2.5 text-[32px] font-extrabold" style={{ color: '#14142B' }}>
              {heading}<span className="text-red-500">❤️</span>
            </h2>
            <p className="text-[15px] mt-2" style={{ color: '#6E7191' }}>{subtext}</p>
          </div>
          <svg className="flex-shrink-0 mt-1 rotate-[15deg]" width="70" height="50" viewBox="0 0 70 50" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M5 25 C15 5, 25 45, 35 25 C45 5, 55 45, 65 25" stroke="#14142B" strokeWidth="2.5" strokeLinecap="round" fill="none" />
            <path d="M60 20 L65 25 L60 30" stroke="#14142B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mt-8 items-start">
          <div>
            <div
              className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => { setIsPaused(false); endDrag() }}
              onMouseDown={(e) => startDrag(e.clientX)}
              onMouseMove={(e) => moveDrag(e.clientX)}
              onMouseUp={endDrag}
              onTouchStart={(e) => startDrag(e.touches[0].clientX)}
              onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
              onTouchEnd={endDrag}
            >
              <div
                className={`flex ${isTransitioning && !isDragging ? 'transition-transform duration-500 ease-in-out' : ''}`}
                style={{ transform: `translateX(${-currentPage * 100 + (dragOffset ? dragOffset / 4 : 0)}%)` }}
              >
                {duplicated.map((pageCards, pageIdx) => (
                  <div key={pageIdx} className="grid gap-6 min-w-0 flex-shrink-0 w-full" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    {pageCards.map((t, i) => (
                      <div key={i} className="bg-white border rounded-[20px] p-6 flex flex-col" style={{ borderColor: '#ECECF0', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                        <div className="flex gap-0.5" style={{ color: '#FBBF24' }}>
                          {Array.from({ length: 5 }).map((_, j) => (
                            <Star key={j} size={16} fill="#FBBF24" stroke="#FBBF24" />
                          ))}
                        </div>
                        <h3 className="text-[20px] font-bold mt-4" style={{ color: '#14142B' }}>&ldquo;{t.title}&rdquo;</h3>
                        <p className="text-[15px] mt-3 leading-relaxed flex-1" style={{ color: '#6E7191' }}>{t.description}</p>
                        <div className="flex items-center gap-3 mt-5">
                          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0" style={{ background: '#F5A623' }}>
                            <img src={t.avatar} alt={t.name} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="text-[16px] font-bold" style={{ color: '#14142B' }}>{t.name}</p>
                            <p className="text-[14px]" style={{ color: '#6E7191' }}>{t.role}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {totalSlides > 1 && (
              <div className="flex justify-center gap-[6px] mt-6">
                {Array.from({ length: totalSlides }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goToPage(i)}
                    className={`rounded-full transition-all duration-300 ${currentPage % totalSlides === i ? 'w-8 h-2' : 'w-2 h-2'}`}
                    style={{
                      background: currentPage % totalSlides === i ? '#EF4368' : '#D9D9E3',
                    }}
                    aria-label={`Go to page ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>

          {groupPhoto && (
            <div className="hidden md:block relative" style={{ marginTop: '-120px' }}>
              {arrowIcon && (
                <img
                  src={arrowIcon}
                  alt=""
                  className="absolute z-10"
                  style={{
                    top: '85px',
                    right: '520px',
                    width: '90px',
                    height: 'auto',
                    transform: 'rotate(10deg)',
                  }}
                />
              )}
              <PhotoReviewBadge groupPhoto={groupPhoto} avatars={reviewAvatars} />
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
