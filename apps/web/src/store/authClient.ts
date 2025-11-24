import { AuthSession } from './auth'

function getLocal(){
  try { return JSON.parse(localStorage.getItem('auth_session') || 'null') as AuthSession | null } catch { return null }
}

export function getAuthSession(): AuthSession | null {
  return getLocal()
}
