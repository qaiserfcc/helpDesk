import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
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
  return (
    <div className="app-root">
      <div className="app-bg">
        <div className="blob bl-1" />
        <div className="blob bl-2" />
        <div className="blob bl-3" />
      </div>
      <Header />
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
      <Footer />
    </div>
  )
}
