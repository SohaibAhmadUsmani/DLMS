import { useNavigate } from 'react-router-dom'
import { Search, Menu, LogOut } from 'lucide-react'
import { useAppSelector, useAppDispatch } from '../../app/hooks'
import { logout } from '../../features/auth/authSlice'
import { setSearchTerm } from '../../features/search/searchSlice'
import NotificationPanel from '../notifications/NotificationPanel'

export default function Topbar({ onMenuToggle, sidebarOpen }) {
  const navigate = useNavigate()
  const { user, role } = useAppSelector((s) => s.auth)
  const searchTerm = useAppSelector((s) => s.search.term)
  const dispatch = useAppDispatch()

  const profilePath = role === 'admin' ? '/admin/profile' : role === 'teacher' ? '/teacher/profile' : '/student/profile'
  const roleLabel = role ? role.charAt(0).toUpperCase() + role.slice(1) : ''

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-slate-200 bg-white px-4 lg:px-6">
      <button
        onClick={onMenuToggle}
        aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
        aria-expanded={sidebarOpen}
        className="lg:hidden text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 rounded-lg cursor-pointer"
      >
        <Menu size={22} />
      </button>

      <div className="relative flex-1 max-w-md">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          aria-label="Search"
          placeholder="Search classes, assignments, students..."
          value={searchTerm}
          onChange={(e) => dispatch(setSearchTerm(e.target.value))}
          className="w-full rounded-full border border-slate-300 bg-slate-50 py-2 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
        />
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <NotificationPanel />

        <button
          onClick={() => navigate(profilePath)}
          className="flex items-center gap-2.5 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg pl-2 pr-3 py-1.5 hover:bg-slate-50 transition-colors"
          aria-label="Edit profile"
        >
          {user?.profile_picture_url ? (
            <img
              src={`${import.meta.env.VITE_API_URL?.replace('/api/v1', '').replace(/\/+$/, '') || 'http://localhost:8000'}${user.profile_picture_url}`}
              alt={user?.name || 'User'}
              className="h-8 w-8 rounded-full object-cover border border-slate-200"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium" aria-hidden="true">
              {user?.name?.charAt(0) || 'U'}
            </div>
          )}
          <div className="hidden sm:block text-left leading-tight">
            <p className="text-sm font-semibold text-slate-800">{user?.name || 'User'}</p>
            <p className="text-[11px] text-slate-400">{roleLabel}</p>
          </div>
        </button>

        <button
          onClick={() => dispatch(logout())}
          className="text-slate-400 hover:text-danger transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/50 focus-visible:ring-offset-2 rounded-lg cursor-pointer p-1.5"
          aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
