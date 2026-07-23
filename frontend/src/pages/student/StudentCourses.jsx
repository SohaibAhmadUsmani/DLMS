import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Spinner from '../../components/ui/Spinner'

export default function StudentCourses() {
  const navigate = useNavigate()

  useEffect(() => {
    navigate('/student', { replace: true })
  }, [navigate])

  return <Spinner size={32} />
}
