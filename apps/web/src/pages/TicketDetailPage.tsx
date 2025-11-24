import React from 'react'
import { useParams } from 'react-router-dom'
import apiClient from '@/services/apiClient'
import { useQuery } from '@tanstack/react-query'
import { env } from '@/services/env'

async function fetchTicket(id:string){
  const res = await apiClient.get(`/tickets/${id}`)
  return res.data.ticket
}

export default function TicketDetailPage(){
  const { id } = useParams()
  const { data, isLoading } = useQuery(['ticket', id!], () => fetchTicket(id!))
  return (
    <div>
      <h2>Ticket</h2>
      {isLoading && <div>Loading...</div>}
      {data && (
        <div>
          <h3>{data.description}</h3>
          <p>{data.id}</p>
        </div>
      )}
    </div>
  )
}
