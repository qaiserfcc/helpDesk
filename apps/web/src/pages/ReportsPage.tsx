import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import apiClient from '@/services/apiClient'

async function fetchUserStats() {
  const res = await apiClient.get('/reports/my-stats')
  return res.data
}

export default function ReportsPage() {
  const { session } = useAuth()
  const { data: stats, isLoading } = useQuery(['user-stats', session?.user?.id], fetchUserStats, {
    enabled: !!session?.user?.id
  })

  if (isLoading) {
    return (
      <div className="reports-page">
        <div className="page-header">
          <h1>My Reports</h1>
          <p>Loading your statistics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="reports-page">
      <div className="page-header">
        <h1>My Reports</h1>
        <p>Your ticket activity and performance overview</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.ticketsCreated || 0}</div>
            <div className="stat-label">Tickets Created</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.ticketsResolved || 0}</div>
            <div className="stat-label">Tickets Resolved</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.ticketsPending || 0}</div>
            <div className="stat-label">Pending Tickets</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-number">{stats?.avgResolutionTime || 'N/A'}</div>
            <div className="stat-label">Avg Resolution Time</div>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <div className="chart-card">
          <h3>Ticket Status Distribution</h3>
          <div className="chart-placeholder">
            <div className="status-bars">
              <div className="status-bar">
                <span>Open</span>
                <div
                  className="bar"
                  style={{ '--bar-width': `${(stats?.statusCounts?.open || 0) / Math.max(stats?.totalTickets || 1, 1) * 100}%` } as any}
                ></div>
                <span>{stats?.statusCounts?.open || 0}</span>
              </div>
              <div className="status-bar">
                <span>In Progress</span>
                <div
                  className="bar"
                  style={{ '--bar-width': `${(stats?.statusCounts?.inProgress || 0) / Math.max(stats?.totalTickets || 1, 1) * 100}%` } as any}
                ></div>
                <span>{stats?.statusCounts?.inProgress || 0}</span>
              </div>
              <div className="status-bar">
                <span>Resolved</span>
                <div
                  className="bar"
                  style={{ '--bar-width': `${(stats?.statusCounts?.resolved || 0) / Math.max(stats?.totalTickets || 1, 1) * 100}%` } as any}
                ></div>
                <span>{stats?.statusCounts?.resolved || 0}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="chart-card">
          <h3>Recent Activity</h3>
          <div className="activity-list">
            {stats?.recentActivity?.length > 0 ? (
              stats.recentActivity.map((activity: any, index: number) => (
                <div key={index} className="activity-item">
                  <div className="activity-icon">
                    {activity.type === 'created' ? '📝' : activity.type === 'resolved' ? '✅' : '📋'}
                  </div>
                  <div className="activity-content">
                    <div className="activity-title">{activity.title}</div>
                    <div className="activity-time">{new Date(activity.timestamp).toLocaleDateString()}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">No recent activity</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
