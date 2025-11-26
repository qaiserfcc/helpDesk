import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface User {
  id: string
  email: string
  name?: string
}

interface Session {
  user: User
  token: string
}

interface AuthState {
  session: Session | null
  loading: boolean
}

const initialState: AuthState = {
  session: null,
  loading: false,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession: (state, action: PayloadAction<Session | null>) => {
      state.session = action.payload
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload
    },
  },
})

export const { setSession, setLoading } = authSlice.actions
export default authSlice.reducer