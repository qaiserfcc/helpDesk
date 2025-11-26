import React from 'react'
import { Link } from 'react-router-dom'
import apiClient from '@/services/apiClient'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../store/auth'

async function fetchAllocationDashboard() {
  const res = await apiClient.get('/reports/allocation/dashboard')
  return res.data.report
}

export default function AllocationDashboardPage() {
  const { session } = useAuth()
  const { data: report, isLoading } = useQuery(['allocation-dashboard'], fetchAllocationDashboard, {
    enabled: session?.user?.role === 'admin'
  })

  if (session?.user?.role !== 'admin') {
    return <div>Access denied. This page is for admins only.</div>
  }

  return (
    <div className="allocation-dashboard">
      <h2>Allocation Dashboard</h2>

      {isLoading ? <div>Loading...</div> : (
        <>
          <div className="overview">
            <h3>Overview</h3>
            <div className="summary-cards">
              <div className="summary-card">
                <div className="count">{report?.overview?.totalAgents ?? 0}</div>
                <div className="label">Total Agents</div>
              </div>
              <div className="summary-card">
                <div className="count">{report?.overview?.activeTickets ?? 0}</div>
                <div className="label">Active Tickets</div>
              </div>
              <div className="summary-card">
                <div className="count">{report?.overview?.unassignedTickets ?? 0}</div>
                <div className="label">Unassigned</div>
              </div>
            </div>
          </div>

          <div className="productivity">
            <h3>Agent Productivity</h3>
            <div className="agent-list">
              {report?.productivity?.map((agent: any) => (
                <div key={agent.id} className="agent-card">
                  <div className="agent-info">
                    <div className="name">{agent.name}</div>
                    <div className="stats">
                      Assigned: {agent.assigned} | Resolved: {agent.resolved} | Avg Time: {agent.avgResolutionTime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="escalations">
            <h3>Escalations Overview</h3>
            <div className="summary-cards">
              <div className="summary-card">
                <div className="count">{report?.escalations?.total ?? 0}</div>
                <div className="label">Total Escalations</div>
              </div>
              <div className="summary-card">
                <div className="count">{report?.escalations?.pending ?? 0}</div>
                <div className="label">Pending</div>
              </div>
              <div className="summary-card">
                <div className="count">{report?.escalations?.resolved ?? 0}</div>
                <div className="label">Resolved</div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}