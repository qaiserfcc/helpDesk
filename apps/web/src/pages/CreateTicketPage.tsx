import React, { useState } from 'react'
import apiClient from '@/services/apiClient'
import { useNavigate } from 'react-router-dom'
import { env } from '@/services/env'

export default function CreateTicketPage(){
  const [description, setDescription] = useState(''), [loading, setLoading] = useState(false)
  const nav = useNavigate()
  async function submit(e: React.FormEvent){
    e.preventDefault()
    setLoading(true)
    try{
      const res = await apiClient.post(`/tickets`, { description })
      nav(`/tickets/${res.data.ticket.id}`)
    } catch (err) {
      console.error(err)
      alert('Failed to create ticket')
    } finally { setLoading(false) }
  }
  return (
    <div className="form-card" style={{maxWidth:520}}>
      <h3>Create ticket</h3>
      <form onSubmit={submit}>
        <label htmlFor="desc">Description</label>
        <textarea id="desc" value={description} onChange={(e)=>setDescription(e.target.value)} rows={6} />
        <div><button type="submit" disabled={loading} >Create</button></div>
      </form>
    </div>
  )
}
