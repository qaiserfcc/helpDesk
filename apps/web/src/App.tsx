import React from 'react'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useAuth } from './store/auth'
import LoginPage from './pages/LoginPage'
import LandingPage from './pages/LandingPage'
import TicketsPage from './pages/TicketsPage'
import TicketDetailPage from './pages/TicketDetailPage'
import CreateTicketPage from './pages/CreateTicketPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import UsersPage from './pages/UsersPage'
import ReportsPage from './pages/ReportsPage'
import AgentWorkloadPage from './pages/AgentWorkloadPage'
import AllocationDashboardPage from './pages/AllocationDashboardPage'
import SettingsPage from './pages/SettingsPage'
import StatusSummaryPage from './pages/StatusSummaryPage'
import UserReportPage from './pages/UserReportPage'

export default function App() {
  const { session, signOut } = useAuth()
  const location = useLocation()
  return (
    <div className="app-root">
      <div className="app-bg">
        <div className="blob bl-1" />
        <div className="blob bl-2" />
        <div className="blob bl-3" />
      </div>
      {location.pathname !== '/' && (
        <header>
          <nav>
            <Link to="/dashboard">Dashboard</Link> | <Link to="/tickets">Tickets</Link> | <Link to="/create">Create</Link> | <Link to="/reports">Reports</Link> | <Link to="/users">Users</Link>
            {session?.user?.role === 'agent' && <> | <Link to="/agent-workload">Agent Workload</Link></>}
            {session?.user?.role === 'admin' && <> | <Link to="/allocation-dashboard">Allocation Dashboard</Link> | <Link to="/user-report">User Report</Link></>}
            {session && <> | <Link to="/settings">Settings</Link> | <Link to="/status-summary">Status Summary</Link></>}
            <span className="spacer" />
            <Link to="/login">Login</Link> | <Link to="/register">Register</Link>
          </nav>
        </header>
      )}
      {session && location.pathname !== '/' && (
        <div className="auth">
          <span>Hello {session.user?.name ?? session.user?.email}</span>
          <button onClick={() => { signOut()}}>Logout</button>
        </div>
      )}
      <main>
        <Routes>
          <Route path="/" element={<LandingPage/>} />
          <Route path="/dashboard" element={<DashboardPage/>} />
          <Route path="/login" element={<LoginPage/>} />
          <Route path="/tickets" element={<TicketsPage/>} />
          <Route path="/tickets/:id" element={<TicketDetailPage/>} />
          <Route path="/create" element={<CreateTicketPage/>} />
          <Route path="/register" element={<RegisterPage/>} />
          <Route path="/agent-workload" element={<AgentWorkloadPage/>} />
          <Route path="/allocation-dashboard" element={<AllocationDashboardPage/>} />
          <Route path="/settings" element={<SettingsPage/>} />
          <Route path="/status-summary" element={<StatusSummaryPage/>} />
          <Route path="/user-report" element={<UserReportPage/>} />
        </Routes>
      </main>
    </div>
  )
}
