import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import apiClient from '@/services/apiClient'
import { useAuth } from '@/store/auth'
import { env } from '@/services/env'

export default function RegisterPage(){
  const nav = useNavigate()
  const { setSession } = useAuth()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e:React.FormEvent){
    e.preventDefault(); setLoading(true)
    try{
      const res = await apiClient.post('/auth/register',{ name, email, password })
      setSession({ user: res.data.user, accessToken: res.data.tokens.accessToken, refreshToken: res.data.tokens.refreshToken })
      nav('/tickets')
    }catch(err){
      alert('Register failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="form-card" style={{maxWidth:420}}>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Name</label>
        <input id="name" placeholder="Your name" value={name} onChange={(e)=>setName(e.target.value)} />
        <label htmlFor="email">Email</label>
        <input id="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <label htmlFor="password">Password</label>
        <input type="password" placeholder="Password" id="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <div><button type="submit" disabled={loading}>Register</button></div>
      </form>
    </div>
  )
}
