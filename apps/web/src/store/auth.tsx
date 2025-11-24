import React, { createContext, useContext, useState } from 'react'

export type AuthSession = { user: any; accessToken: string; refreshToken: string }

const ctx = createContext({
  session: null as (AuthSession | null),
  setSession: (s: AuthSession | null) => {},
  signOut: () => {},
})

export function AuthProvider({children}:{children: React.ReactNode}){
  const [session, setSessionState] = useState<AuthSession | null>(() => {
    try { return JSON.parse(localStorage.getItem('auth_session') || 'null') as AuthSession | null } catch { return null }
  })
  function setSession(s: AuthSession | null){
    setSessionState(s)
    if(s){
      localStorage.setItem('auth_session', JSON.stringify(s))
    } else localStorage.removeItem('auth_session')
    // Initialize realtime on login
    if(s){
      import('@/realtime/ticketSocket').then(m => { m.initRealtime() }).catch(() => {})
    } else {
      import('@/realtime/ticketSocket').then(m => { m.teardownRealtime() }).catch(() => {})
    }
  }
  function signOut(){ setSession(null) }
  return React.createElement(ctx.Provider, { value: { session, setSession, signOut } }, children)
}

export function useAuth(){
  return useContext(ctx)
}
