import { createSlice } from '@reduxjs/toolkit'

function loadState() {
  try {
    const data = localStorage.getItem('dlms_auth')
    if (data) return JSON.parse(data)
  } catch {}
  return { user: null, token: null, role: null }
}

const initialState = loadState()

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      state.user = action.payload.user
      state.token = action.payload.token
      state.role = action.payload.role
      localStorage.setItem('dlms_auth', JSON.stringify({ user: state.user, token: state.token, role: state.role }))
    },
    logout(state) {
      state.user = null
      state.token = null
      state.role = null
      localStorage.removeItem('dlms_auth')
    },
  },
})

export const { loginSuccess, logout } = authSlice.actions
export default authSlice.reducer
