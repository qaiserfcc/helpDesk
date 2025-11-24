import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { env } from '@/services/env'
import { useAuth } from '@/store/auth'
import apiClient from '@/services/apiClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  const { setSession } = useAuth()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiClient.post(`/auth/login`, { email, password })
      setSession({ user: res.data.user, accessToken: res.data.tokens.accessToken, refreshToken: res.data.tokens.refreshToken })
      nav('/tickets')
    } catch (err) {
      alert('Login failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="form-card" style={{maxWidth: 420}}>
      <h2>Login</h2>
      <form onSubmit={submit}>
        <div><label htmlFor="email">Email</label>
          <input id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} type="email" /></div>
        <div><label htmlFor="password">Password</label>
          <input id="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" /></div>
        <div><button type="submit" disabled={loading}>Login</button></div>
      </form>
    </div>
  )
}
