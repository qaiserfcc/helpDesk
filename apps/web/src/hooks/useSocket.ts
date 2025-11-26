import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getAuthSession } from '@/store/authClient'

let globalSocket: Socket | null = null

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null)
  const session = getAuthSession()

  useEffect(() => {
    if (!session?.accessToken) {
      setSocket(null)
      return
    }

    if (globalSocket && globalSocket.connected) {
      setSocket(globalSocket)
      return
    }

    globalSocket = io((import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000') as string, {
      transports: ['websocket', 'polling'],
      auth: { token: `Bearer ${session.accessToken}` }
    })

    globalSocket.on('connect', () => console.info('socket connected', globalSocket?.id))
    globalSocket.on('connect_error', (err) => console.warn('socket error', err))

    setSocket(globalSocket)

    return () => {
      // Don't disconnect on unmount, keep global connection
    }
  }, [session?.accessToken])

  return socket
}