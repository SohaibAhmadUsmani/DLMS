import { fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { logout } from '../features/auth/authSlice'
import toast from 'react-hot-toast'

export function createBaseQuery(baseUrl) {
  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      const token = getState().auth?.token
      if (token) headers.set('Authorization', `Bearer ${token}`)
      return headers
    },
  })

  return async function baseQueryWithLogout(args, api, extraOptions) {
    const result = await rawBaseQuery(args, api, extraOptions)
    if (result.error?.status === 401) {
      api.dispatch(logout())
      toast.error('Session expired. Please log in again.')
    }
    return result
  }
}
