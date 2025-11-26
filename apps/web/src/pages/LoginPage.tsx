import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { env } from '@/services/env'
import { useAuth } from '@/store/auth'
import apiClient from '@/services/apiClient'
import Button from '@/components/Button'
import Input from '@/components/Input'

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
    <div className="form-card login-card">
      <h2>Login</h2>
      <form onSubmit={submit}>
        <Input label="Email" id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
        <Input label="Password" id="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
        <Button type="submit" disabled={loading}>Login</Button>
      </form>
    </div>
  )
}
