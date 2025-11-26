import React from 'react'
import apiClient from '@/services/apiClient'
import { useQuery } from '@tanstack/react-query'

async function fetchStatusSummary() {
  const res = await apiClient.get('/reports/tickets/status-summary')
  return res.data.summary
}

export default function StatusSummaryPage() {
  const { data: summary, isLoading } = useQuery(['status-summary'], fetchStatusSummary)

  return (
    <div className="status-summary-page">
      <h2>Status Summary</h2>

      {isLoading ? <div>Loading...</div> : (
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
          <div className="summary-card">
            <div className="count">{summary?.closed ?? 0}</div>
            <div className="label">Closed</div>
          </div>
        </div>
      )}
    </div>
  )
}