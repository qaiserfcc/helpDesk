import React from 'react'
import { Routes, Route, Link } from 'react-router-dom'
import { useAuth } from './store/auth'
import LoginPage from './pages/LoginPage'
import TicketsPage from './pages/TicketsPage'
import TicketDetailPage from './pages/TicketDetailPage'
import CreateTicketPage from './pages/CreateTicketPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'

export default function App() {
  const { session, signOut } = useAuth()
  return (
    <div>
      <header style={{padding: 10, borderBottom: '1px solid #eee'}}>
        <nav>
          <Link to="/dashboard">Dashboard</Link> | <Link to="/tickets">Tickets</Link> | <Link to="/create">Create</Link> | <Link to="/reports">Reports</Link> | <Link to="/users">Users</Link>
          <span style={{marginLeft: 12}} />
          <Link to="/login">Login</Link> | <Link to="/register">Register</Link>
        </nav>
        {session && (
          <div className="auth">
            <span>Hello {session.user?.name ?? session.user?.email}</span>
            <button onClick={() => { signOut()}}>Logout</button>
          </div>
        )}
      </header>
      <main style={{padding: 20}}>
        <Routes>
          <Route path="/" element={<DashboardPage/>} />
          <Route path="/dashboard" element={<DashboardPage/>} />
          <Route path="/login" element={<LoginPage/>} />
          <Route path="/tickets" element={<TicketsPage/>} />
          <Route path="/tickets/:id" element={<TicketDetailPage/>} />
          <Route path="/create" element={<CreateTicketPage/>} />
          <Route path="/register" element={<RegisterPage/>} />
        </Routes>
      </main>
    </div>
  )
}
