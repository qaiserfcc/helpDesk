import { io, type Socket } from 'socket.io-client'
import { apiClient } from '@/services/apiClient'
import { getAuthSession } from '@/store/authClient'
import { queryClient } from '@/lib/queryClient'

let socket: Socket | null = null

export function initRealtime(){
  const session = getAuthSession()
  if(!session?.accessToken) return
  if(socket && socket.connected) return

  socket = io((import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000') as string, {
    transports: ['websocket','polling'],
    auth: { token: `Bearer ${session.accessToken}` },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 20000,
  })

  socket.on('connect', () => console.info('socket connected', socket?.id))
  socket.on('disconnect', (reason) => {
    console.log('Socket disconnected:', reason)
    if (reason === 'io server disconnect') {
      // Server disconnected, try to reconnect
      socket?.connect()
    }
  })
  socket.on('connect_error', (err) => console.warn('socket error', err))
  socket.on('tickets:created', (payload:any) => {
    console.log('tickets:created received', payload)
    // We can implement global query invalidation later
    queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['ticket', payload?.ticket?.id], exact: false })
  })
  socket.on('tickets:updated', (payload:any) => {
    console.log('tickets:updated', payload)
    queryClient.invalidateQueries({ queryKey: ['tickets'], exact: false })
    queryClient.invalidateQueries({ queryKey: ['ticket', payload?.ticket?.id], exact: false })
  })
  socket.on('tickets:activity', (payload:any) => {
    console.log('tickets:activity', payload)
    queryClient.invalidateQueries({ queryKey: ['ticket-activity', payload?.ticketId], exact: false })
  })
}

export function teardownRealtime(){
  socket?.disconnect()
  socket = null
}
