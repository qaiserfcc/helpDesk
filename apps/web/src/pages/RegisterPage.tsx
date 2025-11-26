import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import apiClient from '@/services/apiClient'
import Button from '@/components/Button'
import Input from '@/components/Input'

type UserRole = 'user' | 'agent' | 'admin'

const roleOptions: Array<{
  label: string;
  description: string;
  value: UserRole;
}> = [
  {
    label: "User",
    description: "Submit and track your own tickets",
    value: "user",
  },
  {
    label: "Agent",
    description: "Work assigned tickets",
    value: "agent",
  },
  {
    label: "Admin",
    description: "Configure and manage the workspace",
    value: "admin",
  },
];

export default function RegisterPage(){
  const nav = useNavigate()
  const { setSession } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault(); setLoading(true); setError('')
    try{
      const res = await apiClient.post('/auth/register',{ name, email, password, role })
      setSession({ user: res.data.user, accessToken: res.data.tokens.accessToken, refreshToken: res.data.tokens.refreshToken })
      nav('/tickets')
    }catch(err: any){
      let message = "We couldn't create your account"
      if (err?.response?.status === 409) {
        message = 'An account with that email already exists.'
      }
      setError(message)
    } finally { setLoading(false) }
  }

  function prefillTestData() {
    setName('Test User')
    setEmail('test@example.com')
    setPassword('password123')
    setRole('user')
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
          <h2>Create your Help Desk account</h2>
          <p className="register-subtitle">Access the workspace instantly.</p>

          <button className="prefill-btn" onClick={prefillTestData}>Prefill Test Data</button>

          <form onSubmit={handleSubmit}>
            <Input label="Full name" id="name" placeholder="Ada Lovelace" value={name} onChange={(e) => setName(e.target.value)} />
            <Input label="Email" id="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
            <Input label="Password" id="password" placeholder="At least 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />

            <div className="role-selection">
              <label className="register-role-label">Role</label>
              <div className="role-options">
                {roleOptions.map((option) => {
                  const selected = option.value === role;
                  return (
                    <div
                      key={option.value}
                      className={`role-card ${selected ? 'active' : ''}`}
                      onClick={() => setRole(option.value)}
                    >
                      <div className="role-label">{option.label}</div>
                      <div className="role-description">{option.description}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {error && <p className="register-error">{error}</p>}

            <Button type="submit" disabled={loading} style={{ marginTop: '28px' }}>
              {loading ? 'Creating account…' : 'Create account'}
            </Button>
          </form>

          <p className="register-link">
            <Link to="/login" style={{ color: '#94a3b8', textDecoration: 'none' }}>
              Already have an account? Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
