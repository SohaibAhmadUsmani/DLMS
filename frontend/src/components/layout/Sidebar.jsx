import { Link, NavLink } from 'react-router-dom'
import { LogOut, GraduationCap } from 'lucide-react'
import clsx from 'clsx'
import { useAppDispatch } from '../../app/hooks'
import { logout } from '../../features/auth/authSlice'

export default function Sidebar({ navItems = [], open, onClose }) {
  const dispatch = useAppDispatch()

  const linkClass = ({ isActive }) =>
    clsx(
      'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2',
      isActive
        ? 'bg-primary/10 text-primary'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800',
    )

  const hasLogoutItem = navItems.some((item) => item.logout)

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={onClose} role="presentation" aria-hidden="true" />
      )}

      <aside
        className={clsx(
          'fixed top-0 left-0 z-50 flex h-full w-64 flex-col bg-white border-r border-slate-200 transition-transform lg:static lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <Link to="/" className="flex h-16 items-center gap-2 border-b border-slate-200 px-6">
          <GraduationCap size={24} className="text-primary" />
          <span className="text-lg font-bold text-slate-800">DLMS</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item, i) => {
            if (item.type === 'group') {
              return (
                <p key={i} className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-3 pt-4 pb-1">
                  {item.label}
                </p>
              )
            }
            if (item.type === 'separator') {
              return <hr key={i} className="my-2 border-slate-200" />
            }
            if (item.logout) {
              return (
                <button
                  key={item.label}
                  onClick={() => dispatch(logout())}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 cursor-pointer"
                >
                  {item.icon && <item.icon size={18} />}
                  {item.label}
                </button>
              )
            }
            return (
              <NavLink key={item.to} to={item.to} end={item.end} className={linkClass} onClick={onClose}>
                {item.icon && <item.icon size={18} />}
                {item.label}
              </NavLink>
            )
          })}
        </nav>

        {!hasLogoutItem && (
          <div className="border-t border-slate-200 p-3">
            <button
              onClick={() => dispatch(logout())}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 cursor-pointer"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        )}
      </aside>
    </>
  )
}
