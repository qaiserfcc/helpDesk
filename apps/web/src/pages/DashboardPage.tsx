import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import apiClient from '@/services/apiClient'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../store/auth'

async function fetchTickets(status?: string) {
  const params = status ? { status } : {}
  const res = await apiClient.get('/tickets', { params })
  return res.data.tickets
}

async function fetchStatusSummary() {
  const res = await apiClient.get('/reports/tickets/status-summary')
  return res.data.summary
}

async function fetchRecentActivity() {
  const res = await apiClient.get('/reports/tickets/activity')
  return res.data.activities
}

export default function DashboardPage() {
  const { session } = useAuth()
  const [statusFilter, setStatusFilter] = useState<string>('')

  const { data: tickets, isLoading: ticketsLoading } = useQuery(['tickets', statusFilter], () => fetchTickets(statusFilter))
  const { data: summary } = useQuery('status-summary', fetchStatusSummary)
  const { data: activities } = useQuery('recent-activity', fetchRecentActivity)

  const statusOptions = [
    { label: 'All', value: '' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
  ]

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>

      <div className="status-summary">
        <h3>Status Summary</h3>
        <div className="summary-cards">
          <div className="summary-card">
            <div className="count">{summary?.open ?? 0}</div>
            <div className="label">Open</div>
          </div>
          <div className="summary-card">
            <div className="count">{summary?.in_progress ?? 0}</div>
            <div className="label">In Progress</div>
          </div>
          <div className="summary-card">
            <div className="count">{summary?.resolved ?? 0}</div>
            <div className="label">Resolved</div>
          </div>
        </div>
      </div>

      <div className="filters">
        <h3>Filter Tickets</h3>
        <div className="filter-buttons">
          {statusOptions.map(option => (
            <button
              key={option.value}
              className={`filter-btn ${statusFilter === option.value ? 'active' : ''}`}
              onClick={() => setStatusFilter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="tickets-section">
        <h3>Tickets</h3>
        {ticketsLoading ? <div>Loading...</div> : (
          <div className="ticket-list">
            {tickets?.slice(0, 10).map((t: any) => (
              <div key={t.id} className="ticket-card">
                <div className="ticket-info">
                  <div className="title">{t.description}</div>
                  <div className="meta">
                    ID: {t.id} | Status: {t.status} | Priority: {t.priority} | Type: {t.issueType}
                  </div>
                </div>
                <div className="actions">
                  <Link to={`/tickets/${t.id}`} className="cta">View</Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          {activities?.slice(0, 5).map((a: any) => (
            <div key={a.id} className="activity-item">
              <div className="activity-desc">{a.description}</div>
              <div className="activity-time">{new Date(a.createdAt).toLocaleString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
