import React from 'react'
import { Link } from 'react-router-dom'
import apiClient from '@/services/apiClient'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../store/auth'

async function fetchAgentWorkload() {
  const res = await apiClient.get('/reports/agents/me/workload')
  return res.data.report
}

export default function AgentWorkloadPage() {
  const { session } = useAuth()
  const { data: report, isLoading } = useQuery(['agent-workload', session?.user?.id], fetchAgentWorkload, {
    enabled: session?.user?.role === 'agent'
  })

  if (session?.user?.role !== 'agent') {
    return <div>Access denied. This page is for agents only.</div>
  }

  return (
    <div className="agent-workload">
      <h2>Agent Workload</h2>

      {isLoading ? <div>Loading...</div> : (
        <>
          <div className="workload-summary">
            <h3>Status Counts</h3>
            <div className="summary-cards">
              <div className="summary-card">
                <div className="count">{report?.statusCounts?.open ?? 0}</div>
                <div className="label">Open</div>
              </div>
              <div className="summary-card">
                <div className="count">{report?.statusCounts?.in_progress ?? 0}</div>
                <div className="label">In Progress</div>
              </div>
              <div className="summary-card">
                <div className="count">{report?.statusCounts?.resolved ?? 0}</div>
                <div className="label">Resolved</div>
              </div>
            </div>
          </div>

          <div className="assigned-tickets">
            <h3>Assigned Tickets</h3>
            <div className="ticket-list">
              {report?.assigned?.map((t: any) => (
                <div key={t.id} className="ticket-card">
                  <div className="ticket-info">
                    <div className="title">{t.description}</div>
                    <div className="meta">Priority: {t.priority} | Type: {t.issueType} | Status: {t.status}</div>
                  </div>
                  <div className="actions">
                    <Link to={`/tickets/${t.id}`} className="cta">View</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="escalations">
            <h3>Escalations</h3>
            <div className="ticket-list">
              {report?.escalations?.map((t: any) => (
                <div key={t.id} className="ticket-card">
                  <div className="ticket-info">
                    <div className="title">{t.description}</div>
                    <div className="meta">Priority: {t.priority} | Type: {t.issueType}</div>
                  </div>
                  <div className="actions">
                    <Link to={`/tickets/${t.id}`} className="cta">View</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pending-requests">
            <h3>Pending Assignment Requests</h3>
            <div className="ticket-list">
              {report?.pendingRequests?.map((t: any) => (
                <div key={t.id} className="ticket-card">
                  <div className="ticket-info">
                    <div className="title">{t.description}</div>
                    <div className="meta">Priority: {t.priority} | Type: {t.issueType}</div>
                  </div>
                  <div className="actions">
                    <Link to={`/tickets/${t.id}`} className="cta">View</Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}