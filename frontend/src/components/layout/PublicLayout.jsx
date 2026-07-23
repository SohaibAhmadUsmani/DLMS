import { useState } from 'react'
import { Outlet, Link, NavLink } from 'react-router-dom'
import { GraduationCap, Menu, X } from 'lucide-react'
import clsx from 'clsx'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/courses', label: 'Courses' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export default function PublicLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <nav className="bg-slate-900 text-white">
        <div className="mx-auto flex h-14 items-center justify-between px-6 lg:px-12 text-sm">
          <span className="text-slate-400">+1 (555) 123-4567</span>
          <div className="flex items-center gap-4 text-slate-400">
            <span>support@dlms.com</span>
          </div>
        </div>
        <div className="mx-auto flex h-16 items-center justify-between border-t border-slate-700 px-6 lg:px-12">
          <Link to="/" className="flex items-center gap-2 font-bold text-lg text-white">
            <GraduationCap size={26} className="text-accent" />
            DLMS
          </Link>

          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            className="md:hidden text-slate-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 rounded-lg cursor-pointer"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'text-sm font-medium transition-colors',
                    isActive ? 'text-accent' : 'text-slate-300 hover:text-white',
                  )
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-btn px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Login
            </Link>
            <Link
              to="/register"
              className="rounded-btn bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden border-t border-slate-700 bg-slate-800">
            <div className="flex flex-col px-6 py-4 space-y-2">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  end={link.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    clsx(
                      'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                      isActive ? 'bg-slate-700 text-amber-400' : 'text-slate-300 hover:text-white hover:bg-slate-700/50',
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
              <hr className="border-slate-700 my-2" />
              <Link
                to="/login"
                onClick={() => setMobileOpen(false)}
                className="rounded-btn px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
              >
                Login
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileOpen(false)}
                className="rounded-btn bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-amber-600 transition-colors text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-12 px-6 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-8 md:grid-cols-3 text-sm">
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">About DLMS</h4>
              <p className="text-slate-500 leading-relaxed">
                A modern learning management platform connecting students with expert-led courses, interactive quizzes, and career-building certificates.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Links</h4>
              <ul className="space-y-2 text-slate-500">
                <li><Link to="/courses" className="hover:text-primary transition-colors">Courses</Link></li>
                <li><Link to="/about" className="hover:text-primary transition-colors">About</Link></li>
                <li><Link to="/contact" className="hover:text-primary transition-colors">Contact</Link></li>
                <li><Link to="/login" className="hover:text-primary transition-colors">Login</Link></li>
                <li><Link to="/register" className="hover:text-primary transition-colors">Register</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-slate-800 mb-3">Contact</h4>
              <ul className="space-y-2 text-slate-500">
                <li>+1 (555) 123-4567</li>
                <li>support@dlms.com</li>
                <li>San Francisco, CA</li>
              </ul>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-200 text-center text-xs text-slate-400">
            &copy; {new Date().getFullYear()} DLMS. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  )
}