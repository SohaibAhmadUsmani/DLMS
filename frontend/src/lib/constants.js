export const ROLES = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  STUDENT: 'student',
}

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
export const CORE_API = `${API_BASE}/core`
export const CONSOLE_API = `${API_BASE}/console`
