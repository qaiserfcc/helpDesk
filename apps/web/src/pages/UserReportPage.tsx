import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import apiClient from '@/services/apiClient'

async function fetchMyReport() {
  const res = await apiClient.get('/reports/my-activity')
  return res.data.report
}

export default function UserReportPage() {
  const { session } = useAuth()
  const { data: report, isLoading } = useQuery(['my-report', session?.user?.id], fetchMyReport, {
    enabled: !!session?.user?.id
  })

  if (isLoading) {
    return (
      <div className="user-report">
        <div className="page-header">
          <h1>My Activity Report</h1>
          <p>Loading your activity data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="user-report">
      <div className="page-header">
        <h1>My Activity Report</h1>
        <p>Your personal ticket activity and performance metrics</p>
      </div>

      <div className="report-content">
        <div className="user-summary-card">
          <div className="user-avatar">
            <span>{session?.user?.name?.charAt(0)?.toUpperCase() || 'U'}</span>
          </div>
          <div className="user-details">
            <h2>{session?.user?.name || 'User'}</h2>
            <p>{session?.user?.email}</p>
            <div className="user-role">Role: {session?.user?.role}</div>
          </div>
        </div>

        <div className="stats-overview">
          <div className="stat-item">
            <div className="stat-value">{report?.ticketsCreated || 0}</div>
            <div className="stat-label">Tickets Created</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{report?.ticketsResolved || 0}</div>
            <div className="stat-label">Tickets Resolved</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{report?.avgResolutionTime || 'N/A'}</div>
            <div className="stat-label">Avg Resolution Time</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{report?.lastActive ? new Date(report.lastActive).toLocaleDateString() : 'Never'}</div>
            <div className="stat-label">Last Active</div>
          </div>
        </div>

        <div className="recent-tickets">
          <h3>Recent Tickets</h3>
          <div className="tickets-list">
            {report?.recentTickets?.length > 0 ? (
              report.recentTickets.map((ticket: any) => (
                <div key={ticket.id} className="ticket-item">
                  <div className="ticket-info">
                    <div className="ticket-title">{ticket.title}</div>
                    <div className="ticket-meta">
                      Status: {ticket.status} | Created: {new Date(ticket.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`ticket-status status-${ticket.status.toLowerCase().replace(' ', '-')}`}>
                    {ticket.status}
                  </div>
                </div>
              ))
            ) : (
              <div className="no-tickets">No recent tickets found</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}