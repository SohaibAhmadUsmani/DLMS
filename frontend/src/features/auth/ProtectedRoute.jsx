import { Navigate } from 'react-router-dom'
import { useAppSelector } from '../../app/hooks'
import { ROLES } from '../../lib/constants'

const roleDashboards = {
  [ROLES.ADMIN]: '/admin',
  [ROLES.TEACHER]: '/teacher',
  [ROLES.STUDENT]: '/student',
}

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, role } = useAppSelector((s) => s.auth)

  if (!token) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(role)) {
    const redirectTo = roleDashboards[role] || '/'
    return <Navigate to={redirectTo} replace />
  }

  return children
}
