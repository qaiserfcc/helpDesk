import React from 'react'
import apiClient from '@/services/apiClient'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../store/auth'

async function fetchUserReport() {
  const res = await apiClient.get('/reports/users/activity')
  return res.data.report
}

export default function UserReportPage() {
  const { session } = useAuth()
  const { data: report, isLoading } = useQuery(['user-report'], fetchUserReport, {
    enabled: session?.user?.role === 'admin' // assuming admin only
  })

  if (session?.user?.role !== 'admin') {
    return <div>Access denied. This page is for admins only.</div>
  }

  return (
    <div className="user-report">
      <h2>User Report</h2>

      {isLoading ? <div>Loading...</div> : (
        <div className="user-list">
          {report?.users?.map((user: any) => (
            <div key={user.id} className="user-card">
              <div className="user-info">
                <div className="name">{user.name}</div>
                <div className="email">{user.email}</div>
                <div className="stats">
                  Tickets Created: {user.ticketsCreated} | Tickets Resolved: {user.ticketsResolved} | Last Active: {user.lastActive}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}