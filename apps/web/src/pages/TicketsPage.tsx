import React from 'react'
import { Link } from 'react-router-dom'
import apiClient from '@/services/apiClient'
import { useQuery } from '@tanstack/react-query'
import { env } from '@/services/env'

async function fetchTickets(){
  const res = await apiClient.get(`/tickets`)
  return res.data.tickets
}
export default function TicketsPage(){
  const { data, isLoading } = useQuery(['tickets'], fetchTickets)
  return (
    <div>
      <h2>Tickets</h2>
      {isLoading && <div>Loading...</div>}
      <div className="ticket-list">
        {data?.map((t:any) => (
          <div key={t.id} className="ticket-card">
            <div>
              <div className="title">{t.description}</div>
              <div className="meta">ID: {t.id}</div>
            </div>
            <div>
              <Link to={`/tickets/${t.id}`}>Open</Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
