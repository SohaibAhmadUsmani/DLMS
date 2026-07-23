import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import {
  MapPin, Phone, Globe, ChevronDown, Menu, X, ShoppingCart, Search, Star,
  Monitor, Award, Lightbulb, CheckCircle, Sun, Zap, User,
  ArrowRight, Plus, Minus, Mail, Send, Palette, Code, TrendingUp, Briefcase, Camera,
  GraduationCap,
} from 'lucide-react'

import heroImg from '../../assets/orange.png'
import aboutImg from '../../assets/about-1.jpg'
import gettyImg from '../../assets/gettyimages-1413873774-612x612.jpg'
import instructorImg from '../../assets/instructor.webp'
import studentImg from '../../assets/student.png'
import blogImg1 from '../../assets/blog-22.jpg'
import blogImg2 from '../../assets/blog-23.jpg'
import blogImg3 from '../../assets/blog-24.jpg'
import courseImg1 from '../../assets/web.avif'
import courseImg2 from '../../assets/courses2.jpg'
import courseImg3 from '../../assets/courses3.webp'
import courseImg4 from '../../assets/courses4.webp'
import webdevIcon from '../../assets/webdevsvg.svg'
import featImg2 from '../../assets/feature-26.jpg'
import featImg3 from '../../assets/feature-27.jpg'
import featImgFull from '../../assets/feature-28.jpg'
import featureGroup from '../../assets/feature-group.webp'
import arrowIcon from '../../assets/arrow.webp'
import zainKhanPhoto from '../../assets/Zain Khan.jpg'
import usmanMalikPhoto from '../../assets/Usman Malik.jpg'
import sanaTariqPhoto from '../../assets/Sana Tariq.jpg'
import sarahMazharPhoto from '../../assets/Sarah Mazhar.jpg'
import { ProfileCard, CourseCard, PhotoCollage, LogoMarquee, TestimonialsSection, CTACard, TopUtilityBar, Navbar, SocialIcon, CartDrawer, Footer } from '../../components/ui'
import user01 from '../../assets/user-01.webp'
import user03 from '../../assets/user-03.jpg'
import user06 from '../../assets/user-06.webp'
import user07 from '../../assets/user-07.jpg'
import user08 from '../../assets/user-08.jpg'
import user09 from '../../assets/user-09.webp'
import subscribeIcon1 from '../../assets/subscribe-icon-01.svg'
import subscribeIcon2 from '../../assets/subscribe-icon-02.svg'
import bannerBg02 from '../../assets/banner-bg-02 (1).png'
import bannerBook from '../../assets/banner-book.svg'
import bannerSparkle from '../../assets/banner-icon-03.svg'
import feedlyLogo from '../../assets/feedly.png'
import hubspotLogo from '../../assets/hubspot.png'
import miroLogo from '../../assets/miro1.png'
import mailerliteLogo from '../../assets/mailerlite.webp'

import sendinblueLogo from '../../assets/sendinblue.svg'

function useScrollAnimation({ threshold = 0.2, triggerOnce = true } = {}) {
  const ref = useRef(null)
  const [isVisible, setIsVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setIsVisible(true); if (triggerOnce) o.unobserve(el) }
      else if (!triggerOnce) setIsVisible(false)
    }, { threshold })
    o.observe(el)
    return () => o.disconnect()
  }, [threshold, triggerOnce])
  return [ref, isVisible]
}

function useCountUp(end, duration = 1200) {
  const [ref, isVisible] = useScrollAnimation({ threshold: 0.5 })
  const [count, setCount] = useState(0)
  const done = useRef(false)
  useEffect(() => {
    if (!isVisible || done.current) return
    done.current = true
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / duration, 1)
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * end))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [end, duration, isVisible])
  return [ref, count]
}

function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ─── 5.3 Hero ─────────────────────────────────────────────────

function HeroSection() {
  const [motionOk] = useState(() => !prefersReducedMotion())

  return (
    <section className="relative overflow-hidden bg-white pt-0 pb-14 md:pt-0 md:pb-20 mt-6 md:mt-0">
      {/* Background hero blobs — fade in slowly as stage backdrop */}
      <div className={`absolute inset-0 pointer-events-none overflow-hidden ${motionOk ? 'animate-[fadeUp_0.8s_cubic-bezier(0.16,1,0.3,1)_0s_both]' : ''}`} aria-hidden="true">
        <div className="absolute -top-20 -left-20 w-96 h-96 rounded-full bg-[#d1fae5]/40 blur-3xl" />
        <div className="absolute top-0 left-1/3 w-80 h-80 rounded-full bg-[#ede9fe]/30 blur-3xl" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-[#fce7f3]/30 blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-[var(--space-8)]">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* ─── Text Column — each element choreographed like a scene ─── */}
          <div className="space-y-6 -mt-12 ml-8">
            {/* Book icon — drops from above with bounce */}
            <div
              className="relative w-14 h-14 mt-2"
              style={{
                animation: motionOk ? 'dropBounce 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' : 'none',
              }}
            >
              <div className={`${motionOk ? 'animate-[floatBook_5s_ease-in-out_0.9s_infinite]' : ''}`}>
                <img src={bannerBook} alt="" className="w-full h-full object-contain" />
              </div>
            </div>

            {/* Badge — slides in from left */}
            <span
              className="inline-block text-xs font-semibold text-brand-pink bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider"
              style={{ animation: motionOk ? 'slideFromLeft 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.25s both' : 'none' }}
            >
              The Leader in Online Learning
            </span>

            {/* Heading — scale-up reveal */}
            <h1
              className="text-[52px] leading-[1.15] font-bold text-slate-900 relative mt-4"
              style={{ animation: motionOk ? 'scaleIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both' : 'none' }}
            >
              {/* Sparkle icon — banner-icon-03.svg */}
              <span className={`absolute -top-1 -right-4 ${motionOk ? 'animate-[twinkle_2s_ease-in-out_1.5s_infinite]' : ''}`}>
                <img src={bannerSparkle} alt="" className="w-5 h-5" />
              </span>

              Engaging &amp; Accessible<br />
              <span className="mt-2 text-white bg-brand-pink px-[7px] py-1 rounded-full inline-block">Online</span> Courses For All{' '}
              {/* Bold purple lightning bolt */}
              <svg viewBox="0 0 28 28" fill="currentColor" className="inline-block w-7 h-7 text-brand-purple mt-4.5">
                <path d="M15.5 2L4.5 16h8l-2 10 11-14h-8l2-10z" />
              </svg>
            </h1>

            {/* Search bar — scale in from center */}
            <div
              className="flex items-center gap-2 bg-white border border-slate-200 rounded-[var(--radius-lg)] p-1.5 max-w-xl shadow-sm"
              style={{ animation: motionOk ? 'scaleIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.5s both' : 'none' }}
            >
              <select className="text-sm text-slate-600 bg-transparent border-r border-slate-200 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded-l-[var(--radius-lg)] w-[110px] pl-3 pr-2" aria-label="Category" defaultValue="">
                <option value="" disabled>Category</option>
                <option value="development">Development</option>
                <option value="design">Design</option>
                <option value="marketing">Marketing</option>
              </select>
              <input type="text" placeholder="Search Courses, Instructors" className="flex-1 text-sm px-3 py-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-purple rounded" aria-label="Search courses and instructors" />
              <button onClick={() => document.getElementById('featured-courses')?.scrollIntoView({ behavior: 'smooth' })} className="bg-brand-purple text-white px-6 py-2.5 rounded-[var(--radius-lg)] text-sm font-semibold hover:opacity-90 transition-all duration-[var(--motion-duration-instant)] hover:scale-[1.03] active:scale-[0.98] flex items-center gap-2">
                <Search size={16} /> Search
              </button>
            </div>

            {/* Rating stars — slide in from right */}
            <div
              className="flex items-center gap-2 text-sm"
              style={{ animation: motionOk ? 'slideFromRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.65s both' : 'none' }}
            >
              <div className="flex gap-0.5">
                {[1,2,3,4].map(i => <Star key={i} size={18} className="text-brand-yellow fill-brand-yellow" />)}
                <Star size={18} className="text-brand-yellow fill-brand-yellow/50" />
              </div>
              <span className="font-semibold text-slate-800 ml-2">4.5 / 5.0</span>
              <span className="text-text-secondary">From 500+ reviews</span>
            </div>
          </div>

          {/* ─── Photo Column — blobs rise, image fades, cards fly in ─── */}
          <div className="relative flex justify-center -mt-6">
            <div className="w-[480px] relative">
              {/* Purple blob — slides up from bottom */}
              <div
                className="absolute bottom-0 -left-20 w-[500px] h-[350px] rounded-[40%_60%_60%_40%/50%_40%_60%_50%] bg-[#2A1B54] z-0 pointer-events-none"
                style={{ animation: motionOk ? 'blobSlideUp 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.1s both' : 'none' }}
              />
              {/* Yellow blob — expands from center */}
              <img
                src={bannerBg02}
                alt=""
                aria-hidden="true"
                className="absolute -bottom-83 right-0 w-[2000px] h-[1200px] object-contain z-[1] pointer-events-none"
                style={{ animation: motionOk ? 'blobExpand 1s cubic-bezier(0.16, 1, 0.3, 1) 0.2s both' : 'none' }}
              />
              {/* Student cutout image — fades up slightly */}
              <div
                className="w-full h-[580px] relative z-[2] overflow-hidden mt-6"
                style={{ animation: motionOk ? 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.35s both' : 'none' }}
              >
                <img src={heroImg} alt="Student learning online" className="w-full h-[110%] object-cover object-top" />
              </div>
              {/* Lightning bolt — orange outline, zaps in from top-right */}
              <div
                className="absolute top-10 right-2 z-20 pointer-events-none"
                style={{
                  animation: motionOk ? 'zapIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.5s both' : 'none',
                }}
              >
                <div className={motionOk ? 'animate-[floatPhoto_4s_ease-in-out_1.2s_infinite]' : ''}>
                  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke="#FF6A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M24 4L8 22h12l-4 18 20-22H24l4-14z" />
                  </svg>
                </div>
              </div>
              {/* Brand dot — pops in bottom-right */}
              <div
                className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-[#E63950] z-20 pointer-events-none"
                style={{
                  animation: motionOk ? 'scalePop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) 0.6s both' : 'none',
                }}
              >
                <div className={motionOk ? 'animate-[floatPhoto_4s_ease-in-out_1.5s_infinite]' : ''} style={{ width: '100%', height: '100%' }}>
                  <div className="w-full h-full rounded-full bg-[#E63950]" />
                </div>
              </div>
              {/* Students card — flies in from left */}
              <div
                className="absolute -left-4 top-[340px] bg-white rounded-[20px] px-[18px] py-3 shadow-[0_12px_30px_rgba(0,0,0,0.12)] flex items-center gap-3 z-20"
                style={{ animation: motionOk ? 'flyInLeft 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.7s both' : 'none' }}
              >
                <div className="flex">
                  {[user01, user03, user06, user07, user01].map((src, i) => (
                    <div key={i} className={`w-[38px] h-[38px] rounded-full border-2 border-white overflow-hidden ${i > 0 ? '-ml-3' : ''} ${i === 4 ? 'ring-2 ring-[#FDC022]' : ''}`}>
                      <img src={src} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="flex flex-col">
                  <span className="text-[22px] font-bold text-[#F03A5C] leading-none">35K+</span>
                  <span className="text-[13px] font-medium text-[#6B7280] leading-tight">Students Enrolled</span>
                </div>
              </div>
              {/* Courses badge — flies in from right */}
              <div
                className="absolute right-0 bottom-0 bg-gradient-to-br from-[#2e1a6b] to-[#1C1338] rounded-[20px] px-6 py-4 shadow-[0_12px_30px_rgba(0,0,0,0.25)] flex items-center gap-4 z-20"
                style={{ animation: motionOk ? 'flyInRight 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.85s both' : 'none' }}
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#EF4368] to-[#E63965] flex items-center justify-center shrink-0 shadow-lg shadow-[#EF4368]/30">
                  <Award size={22} className="text-white" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[22px] font-bold text-white leading-none">50+</span>
                  <span className="text-[12px] font-medium text-white/70 leading-tight">Courses</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 5.4 About Us ──────────────────────────────────────────────

function AboutSection() {
  const [ref, visible] = useScrollAnimation()

  return (
    <section className="py-16 md:py-20 bg-white overflow-hidden relative" ref={ref} id="about">
      {/* Decorative background accent */}
      <div className={`absolute top-10 right-0 w-72 h-72 rounded-full bg-brand-purple/5 blur-3xl transition-all duration-1000 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />

      <div className="max-w-7xl mx-auto px-5 grid md:grid-cols-2 gap-12 items-center relative z-10">
        {/* Image */}
        <div
          className="relative transition-all duration-700 hover:scale-[1.02] hover:shadow-[0_20px_60px_rgba(0,0,0,0.12)] rounded-[var(--radius-xl)]"
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: visible ? '100ms' : '0ms',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateX(0) scale(1)' : 'translateX(-50px) scale(0.93)',
          }}
        >
          {/* Image wrapper with hover effect */}
          <div className="relative group">
            <div className="rounded-[var(--radius-xl)] overflow-hidden">
              <img
                src={gettyImg}
                alt="About DLMS"
                className="w-full h-auto object-cover transition-all duration-700 group-hover:scale-105"
              />
            </div>
            {/* Overlay on hover */}
            <div className="absolute inset-0 rounded-[var(--radius-xl)] bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            {/* Decorative floating icon */}
            <div className={`absolute -top-3 -right-3 w-12 h-12 rounded-full bg-gradient-to-br from-brand-pink to-rose-500 flex items-center justify-center shadow-lg transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`}
              style={{ transitionDelay: visible ? '400ms' : '0ms' }}
            >
              <GraduationCap size={20} className="text-white" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div
          className="space-y-5"
          style={{
            transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
            transitionDelay: visible ? '200ms' : '0ms',
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(30px)',
          }}
        >
          {/* Badge */}
          <span className="inline-block text-xs font-semibold text-brand-pink bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider transition-all duration-700"
            style={{
              transitionDelay: visible ? '250ms' : '0ms',
              opacity: visible ? 1 : 0,
              transform: visible ? 'scale(1)' : 'scale(0.9)',
            }}
          >
            About Us
          </span>

          {/* Title */}
          <h2 className="text-[32px] md:text-[40px] font-bold text-slate-900 leading-[1.15] transition-all duration-700"
            style={{
              transitionDelay: visible ? '320ms' : '0ms',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0)' : 'translateX(-20px)',
            }}
          >
            Empowering Learners <span className="text-brand-pink"> Worldwide</span>
          </h2>

          {/* Description */}
          <p className="text-text-secondary text-sm leading-relaxed transition-all duration-700"
            style={{
              transitionDelay: visible ? '420ms' : '0ms',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            At DLMS, we believe quality education should be accessible to everyone. Our platform connects students with expert instructors, offering courses that are practical, engaging, and career-focused.
          </p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 pt-2 transition-all duration-700"
            style={{
              transitionDelay: visible ? '520ms' : '0ms',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            {[
              { value: '35K+', label: 'Students' },
              { value: '50+', label: 'Courses' },
              { value: '968+', label: 'Tutors' },
            ].map((s, i) => (
              <div
                key={s.label}
                className="text-center p-3 rounded-xl hover:bg-rose-50/50 transition-all duration-300 hover:scale-105 cursor-default"
              >
                <p className="text-2xl md:text-3xl font-bold text-brand-pink">{s.value}</p>
                <p className="text-xs text-text-secondary">{s.label}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div
            className="pt-2 transition-all duration-700"
            style={{
              transitionDelay: visible ? '620ms' : '0ms',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateY(0)' : 'translateY(16px)',
            }}
          >
            <a
              href="/#featured-courses"
              className="inline-flex items-center gap-2 bg-brand-pink text-white text-sm font-semibold px-6 py-3 rounded-lg hover:bg-rose-600 transition-all duration-[var(--motion-duration-instant)] hover:scale-[1.05] hover:shadow-[0_8px_25px_rgba(245,56,92,0.35)] active:scale-[0.98]"
            >
              Explore Courses <ArrowRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 5.5 Top Category ─────────────────────────────────────────

const categories = [
  { name: 'Design', courses: 12, icon: Palette },
  { name: 'Development', courses: 24, icon: Code },
  { name: 'Marketing', courses: 18, icon: TrendingUp },
  { name: 'Business', courses: 9, icon: Briefcase },
  { name: 'Photography', courses: 6, icon: Camera },
]

function TopCategory() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [ref, visible] = useScrollAnimation()

  const duplicated = [...categories, ...categories]
  const activeDot = currentIndex % 2

  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => {
      setCurrentIndex(prev => prev + 1)
    }, 4000)
    return () => clearInterval(interval)
  }, [isPaused])

  useEffect(() => {
    if (currentIndex >= categories.length) {
      requestAnimationFrame(() => {
        setIsTransitioning(false)
        setCurrentIndex(0)
        requestAnimationFrame(() => setIsTransitioning(true))
      })
    }
  }, [currentIndex])

  return (
    <section className="py-16 md:py-20 bg-white" ref={ref}>
      <div className="max-w-7xl mx-auto px-5 text-center">

        {/* Badge — slides in from left */}
        <div
          className={`transition-all duration-900 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: visible ? '0ms' : '0ms' }}
        >
          <span className="inline-block bg-[#FCE4EA] text-[#EB3D63] text-[14px] font-semibold px-[18px] py-[6px] rounded-full mb-4">
            Favourite Course
          </span>
        </div>

        {/* Title — scales up */}
        <h2
          className={`text-[36px] font-extrabold text-[#14142B] mb-3 transition-all duration-900 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: visible ? '120ms' : '0ms' }}
        >
          Top Category
        </h2>

        {/* Subtitle — fades up */}
        <p
          className={`text-[15px] text-[#6E7191] max-w-[620px] mx-auto mb-10 transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: visible ? '240ms' : '0ms' }}
        >
          Explore our top categories and find the perfect course for your learning journey.
        </p>

        {/* Desktop carousel — auto-plays every 4s, each card staggers in */}
        <div className="hidden lg:block">
          <div
            className="overflow-hidden"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <div
              className={`flex ${isTransitioning ? 'transition-transform duration-500 ease-in-out' : ''}`}
              style={{ transform: `translateX(-${currentIndex * 20}%)` }}
            >
              {(visible ? duplicated : []).map((cat, i) => (
                <div
                  key={`${cat.name}-${i}`}
                  className={`min-w-[20%] px-2.5 transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
                  style={{
                    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                    transitionDelay: visible ? `${360 + (i % categories.length) * 100}ms` : '0ms',
                  }}
                >
                  <div className="bg-white border border-[#E7E7ED] rounded-2xl px-5 py-8 flex flex-col items-center gap-3 hover:shadow-[0_4px_14px_rgba(0,0,0,0.06)] hover:border-[#d0d0db] transition-all duration-200 cursor-pointer">
                    <div className="w-14 h-14 rounded-[14px] bg-[#EDEBFB] flex items-center justify-center hover:bg-[#F5385C] hover:[transform:rotateY(360deg)] [perspective:800px] cursor-pointer"
                      style={{ transition: 'background-color 0.3s ease, transform 0.7s ease' }}
                    >
                      <cat.icon size={24} className="text-[#2B1B5E] hover:text-white" />
                    </div>
                    <p className="text-[18px] font-bold text-[#14142B]">{cat.name}</p>
                    <p className="text-[14px] text-[#6E7191]">{cat.courses} Courses</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile/tablet grid — cards stagger in with delay */}
        <div className="lg:hidden grid grid-cols-2 md:grid-cols-3 gap-4">
          {(visible ? categories : []).map((cat, i) => (
            <div
              key={cat.name}
              className={`bg-white border border-[#E7E7ED] rounded-2xl px-4 py-6 flex flex-col items-center gap-3 transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
              style={{
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: visible ? `${360 + i * 100}ms` : '0ms',
              }}
            >
              <div className="w-14 h-14 rounded-[14px] bg-[#EDEBFB] flex items-center justify-center hover:bg-[#F5385C] hover:[transform:rotateY(360deg)] [perspective:800px] cursor-pointer"
                style={{ transition: 'background-color 0.3s ease, transform 0.7s ease' }}
              >
                <cat.icon size={24} className="text-[#2B1B5E] hover:text-white" />
              </div>
              <p className="text-[16px] font-bold text-[#14142B]">{cat.name}</p>
              <p className="text-[13px] text-[#6E7191]">{cat.courses} Courses</p>
            </div>
          ))}
        </div>

        {/* Pagination dots — slide up */}
        <div
          className={`flex justify-center gap-[6px] mt-8 transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: visible ? '860ms' : '0ms' }}
        >
          {categories.slice(0, 2).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 rounded-full transition-all duration-300 ease-in-out ${i === activeDot ? 'w-6 bg-[#EF4368]' : 'w-2 bg-[#D9D9E3]'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 5.5 Our Benefits ─────────────────────────────────────────

const benefits = [
  { icon: Monitor, title: 'Expert-Led Courses', desc: 'Learn from industry experts who bring real-world experience to every lesson.' },
  { icon: Award, title: 'Earn Certificates', desc: 'Get certified and showcase your skills to employers and peers.' },
  { icon: Lightbulb, title: 'Learn at Your Pace', desc: 'Self-paced learning with lifetime access to all course materials.' },
]

function OurBenefits() {
  const [ref, visible] = useScrollAnimation()
  return (
    <section className="bg-[#000000] text-white py-16 md:py-20 px-5 relative overflow-hidden" ref={ref}>
      {/* Decorative accents — like Achieve Your Goals Zap icons */}
      <div className={`absolute top-6 left-6 text-brand-yellow/10 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}><Zap size={44} /></div>
      <div className={`absolute bottom-6 right-6 text-brand-purple/20 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}><Zap size={44} /></div>
      <div className="max-w-7xl mx-auto text-center">
        {/* Badge — slides in from left */}
        <div
          className={`transition-all duration-900 ${visible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: visible ? '0ms' : '0ms' }}
        >
          <span className="inline-block bg-[#2A2A2E] text-[#E4E4E7] text-[13px] font-semibold px-4 py-1.5 rounded-full mb-4">
            Our Benefits
          </span>
        </div>
        {/* Title — scales in */}
        <h2
          className={`text-[36px] font-bold text-white mb-3 transition-all duration-900 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: visible ? '120ms' : '0ms' }}
        >
          Master the skills to drive your career
        </h2>
        {/* Subtitle — fades up */}
        <p
          className={`text-[15px] text-[#C7C7CC] max-w-[640px] mx-auto mb-12 transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
          style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: visible ? '240ms' : '0ms' }}
        >
          Unlock your potential with expert guidance and flexible learning paths.
        </p>
        {/* Cards — stagger in like stats in Achieve Your Goals */}
        <div className="grid md:grid-cols-3 gap-16">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className={`text-center transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}
              style={{ transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)', transitionDelay: visible ? `${360 + i * 120}ms` : '0ms' }}
            >
              <div
                className="w-[76px] h-[76px] rounded-full bg-[#2C2C30] flex items-center justify-center mx-auto mb-4 hover:bg-[#F5385C] hover:[transform:rotateY(360deg)] [perspective:800px] cursor-pointer"
                style={{ transition: 'background-color 0.3s ease, transform 0.7s ease' }}
              >
                <b.icon size={28} className="text-white" />
              </div>
              <h3 className="text-[18px] font-bold text-white mb-2">{b.title}</h3>
              <p className="text-[14px] text-[#9C9CA3] leading-relaxed max-w-[280px] mx-auto">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 5.6 Achieve Your Goals ────────────────────────────────────

const stats = [
  { value: 253085, label: 'Students Enrolled all over World' },
  { value: 1205, label: 'Total Courses on our Platform' },
  { value: 56, label: 'Countries of Students' },
  { value: 968, label: 'Expert Tutors From Various Fields' },
]

function StatBanner() {
  const [ref, visible] = useScrollAnimation({ threshold: 0.3 })
  return (
    <section className="py-12 md:py-16 px-5" ref={ref}>
      <div className="max-w-5xl mx-auto bg-surface-base rounded-2xl px-8 md:px-12 py-14 md:py-20 text-white relative overflow-hidden">
        <div className={`absolute top-6 left-6 text-brand-yellow/20 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}><Zap size={44} /></div>
        <div className={`absolute bottom-6 right-6 text-brand-purple/20 transition-all duration-700 delay-150 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}><Zap size={44} /></div>
        <div className={`text-center mb-12 transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h3 className="text-3xl md:text-4xl font-bold mb-3">Achieve Your Goals with DLMS</h3>
          <p className="text-white/60 text-sm">96% of eLearning for Business customers see improved results within six months.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/10">
          {stats.map((s, i) => (
            <div key={s.label} className={`transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: visible ? `${i * 100}ms` : '0ms' }}>
              <StatItem {...s} />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function StatItem({ value, label }) {
  const [ref, count] = useCountUp(value)
  return (
    <div ref={ref} className="text-center px-3 md:px-6">
      <p className="text-2xl md:text-3xl font-bold text-brand-yellow">{count.toLocaleString()}</p>
      <p className="text-xs md:text-sm text-white/70 mt-1 leading-snug">{label}</p>
    </div>
  )
}

// ─── 5.7 Top Class Instructors ─────────────────────────────────

const instructors = [
  { name: 'Zain Khan', role: 'React Developer', rating: 4.8, reviews: 124, photo: zainKhanPhoto },
  { name: 'Usman Malik', role: 'Web Developer', rating: 4.9, reviews: 98, photo: usmanMalikPhoto },
  { name: 'Sana Tariq', role: 'Content Creator', rating: 4.7, reviews: 156, photo: sanaTariqPhoto },
  { name: 'Sarah Mazhar', role: 'Life Coach', rating: 4.8, reviews: 87, photo: sarahMazharPhoto },
]

function Instructors() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [ref, visible] = useScrollAnimation({ threshold: 0.1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartX = useRef(0)
  const dragDelta = useRef(0)
  const perPage = 2
  const totalSlides = instructors.length
  const totalPages = Math.ceil(totalSlides / perPage)
  const duplicated = [...instructors, ...instructors]
  const cardWidth = 272
  const gap = 24
  const step = cardWidth + gap

  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => setCurrentIndex(prev => prev + perPage), 4000)
    return () => clearInterval(interval)
  }, [isPaused])

  useEffect(() => {
    if (currentIndex >= totalSlides) {
      requestAnimationFrame(() => {
        setIsTransitioning(false)
        setCurrentIndex(0)
        requestAnimationFrame(() => setIsTransitioning(true))
      })
    }
  }, [currentIndex, totalSlides])

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
      setCurrentIndex(prev => {
        const next = dragDelta.current < 0 ? prev + perPage : prev - perPage
        return Math.max(0, Math.min(next, totalSlides * 2 - perPage))
      })
    }
    setDragOffset(0)
  }, [isDragging, totalSlides])

  return (
    <section className="py-16 md:py-20 bg-surface-strong relative overflow-hidden" ref={ref}>
      <div className="absolute top-0 left-0 w-[480px] h-[480px] pointer-events-none" style={{ background: 'radial-gradient(circle at top left, rgba(196, 181, 253, 0.35), transparent 60%)' }} />
      <div className={`max-w-7xl mx-auto px-5 text-center relative z-10 transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <span className="inline-block text-xs font-semibold text-brand-pink bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4" style={{ transitionDelay: visible ? '0ms' : '0ms' }}>Trending Instructors</span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" style={{ transitionDelay: visible ? '100ms' : '0ms' }}>Top Class &amp; Professional Instructors</h2>
        <p className="text-text-secondary text-sm max-w-xl mx-auto mb-10" style={{ transitionDelay: visible ? '200ms' : '0ms' }}>Learn from the best instructors in the industry.</p>

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
            className={`flex gap-6 ${isTransitioning && !isDragging ? 'transition-transform duration-500 ease-in-out' : ''}`}
            style={{ transform: `translateX(${-currentIndex * step + dragOffset}px)` }}
          >
            {duplicated.map((inst, i) => (
              <div key={`${inst.name}-${i}`} style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
                transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${i * 80}ms`,
              }}>
                <ProfileCard {...inst} />
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-[6px] mt-8">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentIndex(i * perPage)}
              className={`h-2 rounded-full transition-all duration-300 ease-in-out ${i === Math.floor((currentIndex % totalSlides) / perPage) ? 'w-6 bg-[#EF4368]' : 'w-2 bg-[#D9D9E3]'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 5.8 Featured Courses ─────────────────────────────────────

const featuredCourses = [
  { title: 'Complete Web Development Bootcamp', category: 'Development', authorName: 'Usman Malik', price: 49.99, rating: 4.9, reviewCount: 234, bannerImage: courseImg1, avatarPhoto: usmanMalikPhoto, bannerTheme: 'orange', badgeColor: '#000000', badgeIcon: webdevIcon },
  { title: 'React & Frontend Mastery', category: 'Development', authorName: 'Zain Khan', price: 54.99, rating: 4.8, reviewCount: 189, bannerImage: courseImg2, avatarPhoto: zainKhanPhoto, bannerTheme: 'purple', badgeColor: '#7C3AED' },
  { title: 'Digital Content Strategy & Production', category: 'Design', authorName: 'Sana Tariq', price: 39.99, rating: 4.7, reviewCount: 312, bannerImage: courseImg3, avatarPhoto: sanaTariqPhoto, bannerTheme: 'blue', badgeColor: '#1E5FBF' },
  { title: 'Lifestyle & Mentorship Program', category: 'Lifestyle', authorName: 'Sarah Mazhar', price: 44.99, rating: 4.8, reviewCount: 156, bannerImage: courseImg4, avatarPhoto: sarahMazharPhoto, bannerTheme: 'gold', badgeColor: '#E8A70A' },
]

function FeaturedCourses({ onAddToCart }) {
  const [page, setPage] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const [ref, visible] = useScrollAnimation({ threshold: 0.1 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStartX = useRef(0)
  const dragDelta = useRef(0)
  const duplicated = [...featuredCourses, ...featuredCourses]
  const perPage = 2
  const cardWidth = 280
  const gap = 24
  const step = cardWidth + gap
  const totalSlides = featuredCourses.length
  const totalPages = Math.ceil(totalSlides / perPage)

  useEffect(() => {
    if (isPaused) return
    const interval = setInterval(() => setPage(prev => prev + perPage), 4000)
    return () => clearInterval(interval)
  }, [isPaused])

  useEffect(() => {
    if (page >= totalSlides) {
      requestAnimationFrame(() => {
        setIsTransitioning(false)
        setPage(0)
        requestAnimationFrame(() => setIsTransitioning(true))
      })
    }
  }, [page, totalSlides])

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
      setPage(prev => {
        const next = dragDelta.current < 0 ? prev + perPage : prev - perPage
        return Math.max(0, Math.min(next, totalSlides * 2 - perPage))
      })
    }
    setDragOffset(0)
  }, [isDragging, totalSlides])

  return (
    <section className="py-16 md:py-20 relative overflow-hidden" ref={ref} id="featured-courses">
      <div className="absolute top-0 left-0 w-[400px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(233, 200, 255, 0.25), transparent 65%)' }} />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255, 200, 220, 0.2), transparent 65%)' }} />
      <div className={`max-w-7xl mx-auto px-5 text-center relative z-10 transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <span className="inline-block text-xs font-semibold text-brand-pink bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4" style={{ transitionDelay: visible ? '0ms' : '0ms' }}>What's New</span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" style={{ transitionDelay: visible ? '100ms' : '0ms' }}>Featured Courses</h2>
        <p className="text-text-secondary text-sm max-w-xl mx-auto mb-10" style={{ transitionDelay: visible ? '200ms' : '0ms' }}>Discover our most popular courses handpicked for you.</p>

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
            className={`flex gap-6 ${isTransitioning && !isDragging ? 'transition-transform duration-500 ease-in-out' : ''}`}
            style={{ transform: `translateX(${-page * step + dragOffset}px)` }}
          >
            {duplicated.map((course, i) => (
              <CourseCard key={`${course.title}-${i}`} {...course} onAddToCart={() => onAddToCart(course)} />
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-[6px] mt-8">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i * perPage)}
              className={`h-2 rounded-full transition-all duration-300 ease-in-out ${i === Math.floor((page % totalSlides) / perPage) ? 'w-6 bg-[#EF4368]' : 'w-2 bg-[#D9D9E3]'}`}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 5.9 Master the Skills ────────────────────────────────────

const checklist = [
  'Access Your Class anywhere',
  'Flexible Course Plan',
  'Quality Assurance',
  'Cost-Effectiveness',
  'The Most World Class Instructors',
  'Lifetime Access to Materials',
]

function SkillsSplit() {
  const [ref, visible] = useScrollAnimation()
  const navigate = useNavigate()
  return (
    <section className="py-16 md:py-20 bg-surface-strong" ref={ref}>
      <div className="max-w-7xl mx-auto px-5 grid md:grid-cols-2 gap-12 items-center">
        <div className={`transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <PhotoCollage leftImage={featImgFull} topRightImage={featImg2} bottomRightImage={featImg3} />
        </div>
        <div className={`transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: '100ms' }}>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4" style={{ transitionDelay: visible ? '150ms' : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}>Master the Skills To Drive Your Career</h2>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed" style={{ transitionDelay: visible ? '250ms' : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}>Gain the expertise you need to advance your career with our comprehensive courses designed by industry professionals.</p>
          <div className="space-y-3 mb-8">
            {checklist.map((item, i) => (
              <div key={item} className="flex items-center gap-3 text-sm text-slate-700 transition-all duration-500" style={{ transitionDelay: visible ? `${350 + i * 80}ms` : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(12px)' }}>
                <CheckCircle size={18} className="text-emerald-500 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
          <button onClick={() => navigate('/register')} className="bg-slate-900 text-white text-sm font-semibold px-6 py-3 rounded-[var(--radius-lg)] flex items-center gap-2 hover:bg-slate-800 transition-all duration-[var(--motion-duration-instant)] hover:scale-[1.03] active:scale-[0.98]">
            Get Started <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  )
}

// ─── 5.10 Trusted By ──────────────────────────────────────────

const partnerLogos = [
  { src: feedlyLogo, alt: 'Feedly' },
  { src: hubspotLogo, alt: 'HubSpot' },
  { src: miroLogo, alt: 'Miro' },
  { src: mailerliteLogo, alt: 'MailerLite' },

  { src: sendinblueLogo, alt: 'Sendinblue' },
]

function TrustedBy() {
  return <LogoMarquee logos={partnerLogos} speed="30s" gap={56} height={30} paddingY={24} />
}

// ─── 5.11 Testimonials ────────────────────────────────────────

const testimonials = [
  { name: 'Ali Raza', role: 'Web Developer', title: 'Transformed My Career', description: 'This platform completely transformed my career. The courses are well-structured and the instructors are incredibly knowledgeable.', rating: 5, avatar: user03 },
  { name: 'Bilal Khan', role: 'Data Analyst', title: 'Best Learning Platform', description: 'I tried many online learning platforms, but DLMS stands out with its quality content and supportive community.', rating: 5, avatar: user07 },
  { name: 'Sana Tariq', role: 'UX Designer', title: 'Hands-On & Practical', description: 'The projects and real-world examples made learning so much easier. I built my portfolio while taking the course.', rating: 5, avatar: sanaTariqPhoto },
  { name: 'Ahmed Malik', role: 'Software Engineer', title: 'Worth Every Penny', description: 'The depth of content and the quality of instruction exceeded my expectations. Highly recommended for anyone serious about learning.', rating: 5, avatar: user08 },
]

function Testimonials() {
  const [ref, visible] = useScrollAnimation()
  return (
    <div ref={ref} className={`transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
      <TestimonialsSection testimonials={testimonials} groupPhoto={featureGroup} reviewAvatars={[user01, user03, user06, user09]} arrowIcon={arrowIcon} />
    </div>
  )
}

// ─── 5.12 CTA Cards ──────────────────────────────────────────

const ctaData = [
  {
    heading: 'Become an Instructor',
    subtext: 'Share your knowledge and inspire thousands of students worldwide.',
    buttonText: 'Apply Now',
    buttonClass: 'bg-[#3b2f7e] hover:bg-[#2e2368]',
    blobColor: '#f5a623',
    imageSrc: instructorImg,
    imageStyle: { objectPosition: '80% 100%', maxWidth: '120%', height: '155%' },
  },
  {
    heading: 'Become a Student',
    subtext: 'Start your learning journey today with access to hundreds of courses.',
    buttonText: 'Enroll Now',
    buttonClass: 'bg-gradient-to-r from-[#ec4899] to-[#f43f5e] hover:from-[#db2777] hover:to-[#e11d48]',
    blobColor: '#4c3fd7',
    imageSrc: studentImg,
    imageStyle: { objectPosition: '50% 100%', maxWidth: '80%', height: '105%' },
  },
]

function CTACards() {
  const [ref, visible] = useScrollAnimation()
  const navigate = useNavigate()
  return (
    <section className="py-16 md:py-20 px-6" ref={ref}>
      <div className={`max-w-[1200px] mx-auto grid md:grid-cols-2 gap-6 transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {ctaData.map((card, i) => (
          <CTACard key={i} {...card} onButtonClick={() => navigate('/register')} style={{ transitionDelay: visible ? `${i * 150}ms` : '0ms' }} />
        ))}
      </div>
    </section>
  )
}

// ─── 5.13 FAQ ─────────────────────────────────────────────────

const faqItems = [
  { q: 'How do I enroll in a course?', a: 'Simply browse our course catalog, select a course you\'re interested in, and click the "Add to Cart" or "Enroll Now" button. Follow the checkout process to complete your enrollment.' },
  { q: 'Can I get a refund if I\'m not satisfied?', a: 'Yes, we offer a 30-day money-back guarantee. If you\'re not satisfied with a course, you can request a refund within 30 days of purchase.' },
  { q: 'Are the certificates recognized?', a: 'Our certificates are recognized by many employers and educational institutions. You can showcase them on your LinkedIn profile and resume.' },
  { q: 'How long do I have access to a course?', a: 'Once enrolled, you have lifetime access to the course materials, including any future updates.' },
  { q: 'Is there a free trial available?', a: 'Yes, we offer a 7-day free trial on selected courses so you can explore the content before committing to a purchase.' },
]

function FAQ() {
  const [open, setOpen] = useState(null)
  const [ref, visible] = useScrollAnimation()

  const toggle = (i) => setOpen(open === i ? null : i)

  return (
    <section className="py-16 md:py-20 bg-surface-strong" ref={ref} id="faq">
      <div className={`max-w-7xl mx-auto px-[var(--space-8)] grid md:grid-cols-2 gap-4 items-start transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="flex justify-center">
            <div className="relative rounded-[20px] overflow-hidden w-[460px] h-[575px] shadow-lg" style={{ boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              <img src={aboutImg} alt="FAQ" className="w-full h-full object-cover" style={{ objectPosition: 'center 20%' }} />
              <div className="absolute top-5 right-3 w-14 h-14 rounded-full bg-gradient-to-br from-brand-pink to-brand-purple flex items-center justify-center shadow-lg ring-2 ring-white z-10">
                <span className="text-white text-xl font-black">?</span>
              </div>
            </div>
          </div>
        <div className="py-8">
          <span className="inline-block text-xs font-semibold text-brand-pink bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4">FAQs</span>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
          <p className="text-text-secondary text-sm mb-6">Find answers to common questions about our platform.</p>
          <div className="space-y-3">
            {faqItems.map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-slate-100 overflow-hidden transition-all duration-700" style={{ transitionDelay: visible ? `${i * 120}ms` : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }}>
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors"
                  aria-expanded={open === i}
                  aria-controls={`faq-answer-${i}`}
                >
                  <span>{item.q}</span>
                  <span className="mr-1">{open === i ? <Minus size={16} className="text-brand-pink shrink-0" /> : <Plus size={16} className="text-slate-400 shrink-0" />}</span>
                </button>
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  className={`transition-all duration-[var(--motion-duration-instant)] overflow-hidden ${open === i ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="px-4 pb-4 text-sm text-text-secondary leading-relaxed">{item.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 5.14 Blog ───────────────────────────────────────────────

const blogPosts = [
  { title: '10 Tips for Effective Online Learning', excerpt: 'Discover strategies to make the most of your online learning experience.', date: 'Jan 15, 2026', image: blogImg1 },
  { title: 'The Future of Education: AI in Learning', excerpt: 'How artificial intelligence is transforming the education landscape.', date: 'Jan 10, 2026', image: blogImg2 },
  { title: 'Career Change Guide: Switching to Tech', excerpt: 'A comprehensive guide to transitioning into a tech career.', date: 'Jan 5, 2026', image: blogImg3 },
]

function Blog() {
  const [ref, visible] = useScrollAnimation()
  return (
    <section className="py-16 md:py-20" ref={ref} id="blog">
      <div className={`max-w-7xl mx-auto px-[var(--space-8)] text-center transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        <span className="inline-block text-xs font-semibold text-brand-pink bg-rose-50 px-4 py-1.5 rounded-full uppercase tracking-wider mb-4" style={{ transitionDelay: visible ? '0ms' : '0ms' }}>Blog</span>
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-3" style={{ transitionDelay: visible ? '100ms' : '0ms' }}>Latest Articles &amp; News</h2>
        <p className="text-text-secondary text-sm max-w-xl mx-auto mb-10" style={{ transitionDelay: visible ? '200ms' : '0ms' }}>Stay updated with the latest in education and technology.</p>
        <div className={`grid md:grid-cols-3 gap-6 text-left transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {blogPosts.map((post, i) => (
            <div key={post.title} className="bg-white rounded border border-slate-100 overflow-hidden hover:shadow-[var(--shadow-1)] transition-all duration-500 group cursor-pointer" style={{ transitionDelay: visible ? `${i * 120}ms` : '0ms', opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(16px)' }} onClick={() => window.location.href = '/blog'}>
              <div className="h-60 overflow-hidden group">
                <img src={post.image} alt={post.title} className="w-full h-full object-cover transition-transform duration-500 ease-in-out group-hover:scale-110" style={{ objectPosition: 'center 25%' }} />
              </div>
              <div className="p-5">
                <p className="text-xs text-text-secondary mb-2">{post.date}</p>
                <h3 className="font-semibold text-slate-800 line-clamp-2 mb-2">{post.title}</h3>
                <p className="text-xs text-text-secondary line-clamp-2 mb-3">{post.excerpt}</p>
                <span className="text-xs font-semibold text-brand-pink flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read More <ArrowRight size={12} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── 5.15 Newsletter ──────────────────────────────────────────

function Newsletter() {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [ref, visible] = useScrollAnimation()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.message) return
    setSent(true)
  }

  return (
    <section className="py-16 md:py-20 px-[var(--space-8)] relative" ref={ref} id="contact">
      <div className="absolute inset-x-0 top-0 h-16 bg-surface-strong" style={{ borderRadius: '0 0 50% 50% / 0 0 40px 40px' }} />
      <div className={`max-w-5xl mx-auto bg-surface-base rounded-[var(--radius-xl)] p-8 md:p-12 relative overflow-hidden transition-all duration-900 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
        {/* Decorative blobs */}
        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-brand-yellow/10 blur-3xl transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} style={{ transitionDelay: '100ms' }} />
        <div className={`absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-brand-pink/10 blur-3xl transition-all duration-700 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} style={{ transitionDelay: '200ms' }} />
        <div className="relative z-10 grid md:grid-cols-2 gap-8 items-start">
          <div className="text-white">
            {/* Title — slides in from left */}
            <h3
              className="text-2xl md:text-3xl font-bold mb-3 transition-all duration-900"
              style={{
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: visible ? '150ms' : '0ms',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-30px)',
              }}
            >
              Get in Touch With Us
            </h3>
            {/* Subtitle — fades up */}
            <p
              className="text-white/60 text-sm mb-6 transition-all duration-900"
              style={{
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: visible ? '280ms' : '0ms',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(16px)',
              }}
            >
              Have a question or just want to say hello? We'd love to hear from you.
            </p>
            {/* Form — slides up */}
            <form
              onSubmit={handleSubmit}
              className="space-y-3 max-w-md"
              style={{
                transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
                transitionDelay: visible ? '400ms' : '0ms',
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateY(0)' : 'translateY(20px)',
              }}
            >
              {sent ? (
                <div className="text-white/80 text-sm py-4 text-center">
                  <p className="font-semibold">Thank you for reaching out!</p>
                  <p className="text-white/50 mt-1">We'll get back to you shortly.</p>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Your Name"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
                    required
                    className="w-full text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-[6px] py-2.5 px-4 outline-none transition-all duration-300 focus:border-brand-pink focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(245,56,92,0.15)] hover:border-white/30"
                  />
                  <input
                    type="email"
                    placeholder="Your Email"
                    value={formData.email}
                    onChange={e => setFormData(p => ({ ...p, email: e.target.value }))}
                    required
                    className="w-full text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-[6px] py-2.5 px-4 outline-none transition-all duration-300 focus:border-brand-pink focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(245,56,92,0.15)] hover:border-white/30"
                  />
                  <textarea
                    rows={3}
                    placeholder="Your Message"
                    value={formData.message}
                    onChange={e => setFormData(p => ({ ...p, message: e.target.value }))}
                    required
                    className="w-full text-sm bg-white/10 border border-white/20 text-white placeholder:text-white/40 rounded-[6px] py-2.5 px-4 outline-none transition-all duration-300 focus:border-brand-pink focus:bg-white/15 focus:shadow-[0_0_0_3px_rgba(245,56,92,0.15)] hover:border-white/30 resize-none"
                  />
                  <button type="submit" className="bg-brand-pink text-white text-sm font-semibold px-5 py-2.5 rounded-[6px] flex items-center gap-2 hover:bg-rose-600 transition-all duration-[var(--motion-duration-instant)] hover:scale-[1.03] active:scale-[0.98]">
                    <Send size={14} /> Send Message
                  </button>
                </>
              )}
            </form>
          </div>
          {/* Image — slides in from right with scale */}
          <div
            className="hidden md:flex justify-center relative mt-8"
            style={{
              transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
              transitionDelay: visible ? '300ms' : '0ms',
              opacity: visible ? 1 : 0,
              transform: visible ? 'translateX(0) scale(1)' : 'translateX(30px) scale(0.9)',
            }}
          >
            <div className={`w-80 h-80 rounded-2xl overflow-hidden ${visible ? 'animate-[floatPhoto_4s_ease-in-out_infinite]' : ''}`}>
              <img src={user03} alt="" className="w-full h-full object-cover" />
            </div>
            <div className={`absolute -top-4 -right-4 transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} style={{ transitionDelay: '500ms' }}><img src={subscribeIcon1} alt="" className="w-8 h-8" /></div>
            <div className={`absolute -bottom-4 -left-4 transition-all duration-500 ${visible ? 'opacity-100 scale-100' : 'opacity-0 scale-0'}`} style={{ transitionDelay: '600ms' }}><img src={subscribeIcon2} alt="" className="w-8 h-8" /></div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── 5.16 Footer ──────────────────────────────────────────────

// ─── Main LandingPage ─────────────────────────────────────────

export default function LandingPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const [cartItems, setCartItems] = useState([])
  const [wishlist, setWishlist] = useState([])
  const [cartOpen, setCartOpen] = useState(false)

  const addToCart = (course) => {
    if (cartItems.find(c => c.title === course.title)) return
    setCartItems(prev => [...prev, course])
  }

  const removeFromCart = (title) => {
    setCartItems(prev => prev.filter(c => c.title !== title))
  }

  const toggleWishlist = (title) => {
    setWishlist(prev => prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title])
  }

  useEffect(() => {
    const hash = location.hash?.slice(1)
    if (hash) {
      setTimeout(() => {
        document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth' })
      }, 300)
    } else {
      window.scrollTo(0, 0)
    }
  }, [location])

  return (
    <div className="font-sans">
      <TopUtilityBar />
      <Navbar cartCount={cartItems.length} onCartClick={() => setCartOpen(true)} />
      <HeroSection />
      <AboutSection />
      <TopCategory />
      <OurBenefits />
      <StatBanner />
      <Instructors />
      <FeaturedCourses onAddToCart={addToCart} cartItems={cartItems} />
      <SkillsSplit />
      <TrustedBy />
      <Testimonials />
      <CTACards />
      <FAQ />
      <Blog />
      <Newsletter />
      <Footer />

      {cartOpen && (
        <CartDrawer
          items={cartItems}
          onClose={() => setCartOpen(false)}
          onRemove={removeFromCart}
          onCheckout={() => { setCartOpen(false); navigate('/login') }}
        />
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes scalePop {
          0% { opacity: 0; transform: scale(0); }
          60% { opacity: 1; transform: scale(1.08); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes dropBounce {
          0% { opacity: 0; transform: translateY(-40px); }
          50% { opacity: 1; transform: translateY(4px); }
          75% { transform: translateY(-2px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideFromLeft {
          from { opacity: 0; transform: translateX(-40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideFromRight {
          from { opacity: 0; transform: translateX(40px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes flyInLeft {
          from { opacity: 0; transform: translateX(-120px) scale(0.9); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes flyInRight {
          from { opacity: 0; transform: translateX(120px) scale(0.9); }
          to { opacity: 1; transform: translateX(0) scale(1); }
        }
        @keyframes blobExpand {
          from { opacity: 0; transform: scale(0.3); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes blobSlideUp {
          from { opacity: 0; transform: translateY(60px) scale(0.6); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes zapIn {
          0% { opacity: 0; transform: scale(0) rotate(-30deg); }
          50% { opacity: 1; transform: scale(1.3) rotate(5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes wordReveal {
          from { opacity: 0; clip-path: inset(0 100% 0 0); }
          to { opacity: 1; clip-path: inset(0 0% 0 0); }
        }
        @keyframes floatBook {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes floatPhoto {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .anim-stagger > * {
          opacity: 0;
          animation: slideUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .anim-stagger > *:nth-child(1) { animation-delay: 0ms; }
        .anim-stagger > *:nth-child(2) { animation-delay: 80ms; }
        .anim-stagger > *:nth-child(3) { animation-delay: 160ms; }
        .anim-stagger > *:nth-child(4) { animation-delay: 240ms; }
        .anim-stagger > *:nth-child(5) { animation-delay: 320ms; }
        .anim-stagger > *:nth-child(6) { animation-delay: 400ms; }
        .anim-stagger > *:nth-child(7) { animation-delay: 480ms; }
        .anim-stagger > *:nth-child(8) { animation-delay: 560ms; }
        .anim-stagger > *:nth-child(9) { animation-delay: 640ms; }
        .anim-stagger > *:nth-child(10) { animation-delay: 720ms; }
      `}</style>
    </div>
  )
}
