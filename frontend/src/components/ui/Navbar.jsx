import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { GraduationCap, ChevronDown, ShoppingCart, User, Menu, X } from 'lucide-react'

const navLinks = [
  { label: 'Home', href: '/' },
  {
    label: 'Courses', href: '#', dropdown: [
      { label: 'Web Development', href: '/#featured-courses' },
      { label: 'Data Science', href: '/#featured-courses' },
      { label: 'Design', href: '/#featured-courses' },
      { label: 'Marketing', href: '/#featured-courses' },
    ]
  },
  {
    label: 'Dashboard', href: '#', dropdown: [
      { label: 'Student', href: '/login' },
      { label: 'Teacher', href: '/login' },
    ]
  },
  {
    label: 'Pages', href: '#', dropdown: [
      { label: 'About', href: '/#about' },
      { label: 'Contact', href: '/#contact' },
      { label: 'FAQ', href: '/#faq' },
    ]
  },
  { label: 'Blog', href: '/blog' },
]

export default function Navbar({ cartCount = 0, onCartClick = () => {} }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/'
    if (href === '/blog') return location.pathname === '/blog'
    if (href.startsWith('/#')) return false
    return location.pathname.startsWith(href)
  }

  return (
    <>
      <nav className={`bg-white border-b border-slate-100 sticky top-0 z-50 transition-all duration-[var(--motion-duration-instant)] ${scrolled ? 'shadow-md' : ''} animate-[fadeDown_0.7s_cubic-bezier(0.16,1,0.3,1)]`}>
        <div className="max-w-7xl mx-auto px-[var(--space-8)] h-[70px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-1.5">
            <GraduationCap size={30} className="text-brand-purple" />
            <span className="text-2xl font-bold text-slate-900">DLMS</span>
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {navLinks.map((link) => {
              const active = isActive(link.href)
              return (
                <div key={link.label} className="relative group">
                  {link.href.startsWith('/#') ? (
                    <a href={link.href} className={`text-sm font-medium flex items-center gap-1 py-2 relative ${active ? 'text-brand-pink' : 'text-slate-700 hover:text-brand-pink'}`}>
                      {link.label} {link.dropdown && <ChevronDown size={14} />}
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-brand-pink transition-all duration-300 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                    </a>
                  ) : (
                    <Link to={link.href} className={`text-sm font-medium flex items-center gap-1 py-2 relative ${active ? 'text-brand-pink' : 'text-slate-700 hover:text-brand-pink'}`}>
                      {link.label} {link.dropdown && <ChevronDown size={14} />}
                      <span className={`absolute bottom-0 left-0 h-0.5 bg-brand-pink transition-all duration-300 ${active ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                    </Link>
                  )}
                  {link.dropdown && (
                    <div className="absolute top-full left-0 mt-1 bg-white rounded-md shadow-lg border border-slate-100 py-2 min-w-[130px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-[var(--motion-duration-instant)]">
                      {link.dropdown.map((item) => (
                        item.href.startsWith('/#') ? (
                          <a key={item.label} href={item.href} className="block px-4 py-2 text-sm text-slate-600 hover:text-brand-pink hover:bg-slate-50">{item.label}</a>
                        ) : (
                          <Link key={item.label} to={item.href} className="block px-4 py-2 text-sm text-slate-600 hover:text-brand-pink hover:bg-slate-50">{item.label}</Link>
                        )
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={onCartClick} className="relative p-2 text-slate-500 hover:text-slate-700" aria-label="Shopping cart">
              <ShoppingCart size={20} />
              {cartCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-brand-pink text-white text-[9px] font-bold flex items-center justify-center">{cartCount}</span>}
            </button>
            <button onClick={() => navigate('/login')} className="hidden sm:inline-flex items-center gap-1.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 px-5 py-2 rounded-[var(--radius-lg)] transition-all duration-[var(--motion-duration-instant)]"><User size={16} /> Sign In</button>
            <button onClick={() => navigate('/register')} className="hidden sm:inline-flex text-sm font-semibold text-white bg-brand-pink hover:bg-rose-600 px-5 py-2 rounded-[var(--radius-lg)] transition-all duration-[var(--motion-duration-instant)] hover:scale-[1.03] active:scale-[0.98]">Register</button>
            <button className="lg:hidden p-2 text-slate-700" onClick={() => setMenuOpen(true)} aria-label="Open menu">
              <Menu size={22} />
            </button>
          </div>
        </div>
      </nav>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-black/40" onClick={() => setMenuOpen(false)} />
          <div className="fixed inset-y-0 right-0 w-[280px] bg-white shadow-xl p-6 overflow-y-auto">
            <div className="flex justify-end mb-6">
              <button onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={22} /></button>
            </div>
            {navLinks.map((link) => (
              link.href.startsWith('/#') ? (
                <a key={link.label} href={link.href} className="block py-3 text-sm font-medium text-slate-700 border-b border-slate-100">{link.label}</a>
              ) : (
                <Link key={link.label} to={link.href} onClick={() => setMenuOpen(false)} className="block py-3 text-sm font-medium text-slate-700 border-b border-slate-100">{link.label}</Link>
              )
            ))}
            <div className="mt-6 space-y-3">
              <button onClick={() => { setMenuOpen(false); navigate('/login') }} className="w-full text-sm font-medium text-slate-700 border border-slate-300 rounded-[var(--radius-lg)] py-2.5">Sign In</button>
              <button onClick={() => { setMenuOpen(false); navigate('/register') }} className="w-full text-sm font-semibold text-white bg-brand-pink rounded-[var(--radius-lg)] py-2.5">Register</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
