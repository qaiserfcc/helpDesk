import React, { useState } from 'react'
import apiClient from '@/services/apiClient'
import { useNavigate } from 'react-router-dom'
import { env } from '@/services/env'

export default function CreateTicketPage(){
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [issueType, setIssueType] = useState('other')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()
  async function submit(e: React.FormEvent){
    e.preventDefault()
    setLoading(true)
    try{
      const res = await apiClient.post(`/tickets`, { description, priority, issueType })
      nav(`/tickets/${res.data.ticket.id}`)
    } catch (err) {
      console.error(err)
      alert('Failed to create ticket')
    } finally { setLoading(false) }
  }
  return (
    <div className="form-card create-ticket-form">
      <h3>Create ticket</h3>
      <form onSubmit={submit}>
        <label htmlFor="desc">Description</label>
        <textarea id="desc" className="input" value={description} onChange={(e)=>setDescription(e.target.value)} rows={6} required />
        
        <label htmlFor="priority">Priority</label>
        <select id="priority" className="input" value={priority} onChange={(e)=>setPriority(e.target.value)}>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
        </select>
        
        <label htmlFor="issueType">Issue Type</label>
        <select id="issueType" className="input" value={issueType} onChange={(e)=>setIssueType(e.target.value)}>
          <option value="hardware">Hardware</option>
          <option value="software">Software</option>
          <option value="network">Network</option>
          <option value="access">Access</option>
          <option value="other">Other</option>
        </select>
        
        <div><button type="submit" disabled={loading} className="cta">Create</button></div>
      </form>
    </div>
  )
}
