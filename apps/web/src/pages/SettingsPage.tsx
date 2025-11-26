import React, { useState } from 'react'
import apiClient from '@/services/apiClient'
import { useAuth } from '../store/auth'
import Button from '../components/Button'
import Input from '../components/Input'

export default function SettingsPage() {
  const { session, updateUser } = useAuth()
  const [form, setForm] = useState({
    name: session?.user?.name || '',
    email: session?.user?.email || '',
    notifications: true // assuming a default
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await apiClient.put('/users/me', form)
      updateUser(res.data.user)
      alert('Settings updated!')
    } catch (err) {
      alert('Failed to update settings')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account preferences and profile information</p>
      </div>

      <div className="settings-content">
        <div className="settings-card">
          <div className="card-header">
            <h2>Profile Information</h2>
            <p>Update your personal details</p>
          </div>

          <form onSubmit={handleSubmit} className="settings-form">
            <div className="form-group">
              <label htmlFor="name">Full Name</label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <Input
                id="email"
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Enter your email address"
                required
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={form.notifications}
                  onChange={(e) => setForm({ ...form, notifications: e.target.checked })}
                />
                <span className="checkmark"></span>
                Enable email notifications for ticket updates
              </label>
            </div>

            <div className="form-actions">
              <Button type="submit" disabled={loading} className="primary">
                {loading ? 'Updating...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>

        <div className="settings-card">
          <div className="card-header">
            <h2>Account Information</h2>
            <p>Your account details</p>
          </div>

          <div className="account-info">
            <div className="info-item">
              <span className="label">Role:</span>
              <span className="value">{session?.user?.role}</span>
            </div>
            <div className="info-item">
              <span className="label">Member since:</span>
              <span className="value">{session?.user?.createdAt ? new Date(session.user.createdAt).toLocaleDateString() : 'N/A'}</span>
            </div>
            <div className="info-item">
              <span className="label">Last login:</span>
              <span className="value">{session?.user?.lastLogin ? new Date(session.user.lastLogin).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}