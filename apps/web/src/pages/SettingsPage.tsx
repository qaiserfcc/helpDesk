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
    <div className="settings">
      <h2>Settings</h2>

      <form onSubmit={handleSubmit} className="form-card">
        <div>
          <label>Name</label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </div>

        <div>
          <label>Email</label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </div>

        <div>
          <label>
            <input
              type="checkbox"
              checked={form.notifications}
              onChange={(e) => setForm({ ...form, notifications: e.target.checked })}
            />
            Enable Notifications
          </label>
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Settings'}
        </Button>
      </form>
    </div>
  )
}