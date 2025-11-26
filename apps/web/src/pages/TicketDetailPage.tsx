import React, { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import apiClient from '@/services/apiClient'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { env } from '@/services/env'

async function fetchTicket(id:string){
  const res = await apiClient.get(`/tickets/${id}`)
  return res.data.ticket
}

async function updateTicket({ id, updates }: { id: string, updates: any }) {
  const res = await apiClient.patch(`/tickets/${id}`, updates)
  return res.data.ticket
}

export default function TicketDetailPage(){
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data, isLoading } = useQuery(['ticket', id!], () => fetchTicket(id!))

  const [isEditing, setIsEditing] = useState(false)
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [issueType, setIssueType] = useState('other')
  const [status, setStatus] = useState('open')

  const updateMutation = useMutation(updateTicket, {
    onSuccess: () => {
      queryClient.invalidateQueries(['ticket', id])
      queryClient.invalidateQueries(['tickets'])
      setIsEditing(false)
    },
    onError: (error) => {
      console.error('Failed to update ticket:', error)
      alert('Failed to update ticket')
    }
  })

  const handleEdit = () => {
    if (data) {
      setDescription(data.description || '')
      setPriority(data.priority || 'medium')
      setIssueType(data.issueType || 'other')
      setStatus(data.status || 'open')
      setIsEditing(true)
    }
  }

  const handleSave = () => {
    updateMutation.mutate({
      id: id!,
      updates: { description, priority, issueType, status }
    })
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  return (
    <div className="ticket-detail-page">
      <div className="page-header">
        <h2>Ticket Details</h2>
        {!isEditing && (
          <div className="actions">
            <button onClick={handleEdit} className="cta secondary">Edit</button>
            <button onClick={() => navigate('/tickets')} className="cta">Back to Tickets</button>
          </div>
        )}
      </div>

      {isLoading && <div className="loading">Loading ticket...</div>}

      {data && (
        <div className="ticket-detail-card">
          {!isEditing ? (
            <div className="ticket-info">
              <div className="info-row">
                <strong>ID:</strong> {data.id}
              </div>
              <div className="info-row">
                <strong>Description:</strong> {data.description}
              </div>
              <div className="info-row">
                <strong>Priority:</strong> {data.priority}
              </div>
              <div className="info-row">
                <strong>Issue Type:</strong> {data.issueType}
              </div>
              <div className="info-row">
                <strong>Status:</strong> {data.status}
              </div>
              <div className="info-row">
                <strong>Created:</strong> {new Date(data.createdAt).toLocaleString()}
              </div>
              {data.updatedAt && (
                <div className="info-row">
                  <strong>Updated:</strong> {new Date(data.updatedAt).toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="edit-form">
              <div className="form-group">
                <label htmlFor="description">Description:</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  required
                  placeholder="Enter ticket description"
                />
              </div>

              <div className="form-group">
                <label htmlFor="priority">Priority:</label>
                <select id="priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="issueType">Issue Type:</label>
                <select id="issueType" value={issueType} onChange={(e) => setIssueType(e.target.value)}>
                  <option value="hardware">Hardware</option>
                  <option value="software">Software</option>
                  <option value="network">Network</option>
                  <option value="access">Access</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status:</label>
                <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="open">Open</option>
                  <option value="in-progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              <div className="form-actions">
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isLoading}
                  className="cta"
                >
                  {updateMutation.isLoading ? 'Saving...' : 'Save'}
                </button>
                <button onClick={handleCancel} className="cta secondary">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
