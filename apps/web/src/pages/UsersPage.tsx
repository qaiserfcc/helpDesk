import React from 'react'
import apiClient from '@/services/apiClient'
import { useQuery } from '@tanstack/react-query'

async function fetchUsers(){
  const res = await apiClient.get('/users')
  return res.data.users
}

export default function UsersPage(){
  const { data, isLoading } = useQuery(['users'], fetchUsers)
  return (
    <div>
      <h2>Users</h2>
      {isLoading && <div>Loading...</div>}
      <div>{data?.map((u:any) => <div key={u.id}>{u.name} ({u.email})</div>)}</div>
    </div>
  )
}
