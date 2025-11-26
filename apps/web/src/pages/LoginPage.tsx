import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import apiClient from '@/services/apiClient'
import Button from '@/components/Button'
import Input from '@/components/Input'

const demoAccounts = [
  {
    label: "User",
    email: "user@helpdesk.local",
    password: "12345@",
  },
  {
    label: "Agent",
    email: "agent@helpdesk.local",
    password: "12345@",
  },
  {
    label: "Admin",
    email: "admin@helpdesk.local",
    password: "12345@",
  },
];

export default function LoginPage() {
  const [email, setEmail] = useState('admin@helpdesk.local')
  const [password, setPassword] = useState('ChangeMe123!')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const nav = useNavigate()
  const { setSession } = useAuth()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await apiClient.post(`/auth/login`, { email, password })
      setSession({ user: res.data.user, accessToken: res.data.tokens.accessToken, refreshToken: res.data.tokens.refreshToken })
      nav('/dashboard')
    } catch (err: any) {
      setError('Invalid email or password')
    } finally { setLoading(false) }
  }

  function fillDemo(account: typeof demoAccounts[0]) {
    setEmail(account.email)
    setPassword(account.password)
  }

  return (
    <div className="landing-root">
      <div className="landing-bg">
        <div className="bl bl-1"></div>
        <div className="bl bl-2"></div>
        <div className="bl bl-3"></div>
      </div>
      <div className="register-container">
        <div className="form-card login-card">
          <h2>Sign in to Help Desk</h2>
          <p className="register-subtitle">Use your workspace credentials to continue.</p>

          <div className="preset-section">
            <div className="preset-heading">Quick fill demo accounts</div>
            <div className="preset-row">
              {demoAccounts.map((account) => (
                <button
                  key={account.label}
                  className="preset-btn"
                  onClick={() => fillDemo(account)}
                >
                  <div className="preset-label">{account.label}</div>
                  <div className="preset-hint">{account.email}</div>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={submit}>
            <Input label="Email" id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <Input label="Password" id="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />

            {error && <p className="register-error">{error}</p>}

            <Button type="submit" disabled={loading} style={{ marginTop: '28px' }}>
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="register-link">
            <Link to="/register" style={{ color: '#94a3b8', textDecoration: 'none' }}>
              Need an account? Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
