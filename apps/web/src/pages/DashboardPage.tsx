import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import apiClient from '@/services/apiClient'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../store/auth'
import { useSocket } from '../hooks/useSocket'

async function fetchTickets(status?: string, assignedToMe?: boolean) {
  const params: any = {}
  if (status) params.status = status
  if (assignedToMe) params.assignedToMe = true
  const res = await apiClient.get('/tickets', { params })
  return res.data.tickets
}

async function fetchStatusSummary() {
  const res = await apiClient.get('/reports/tickets/status-summary')
  return res.data.summary
}

async function fetchRecentActivity() {
  const res = await apiClient.get('/reports/tickets/activity')
  return res.data.activities
}

export default function DashboardPage() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const socket = useSocket()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [assignedOnly, setAssignedOnly] = useState(false)
  const [navDrawerOpen, setNavDrawerOpen] = useState(false)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<any[]>([])

  const { data: tickets, isLoading: ticketsLoading, refetch: refetchTickets } = useQuery(
    ['tickets', statusFilter, assignedOnly],
    () => fetchTickets(statusFilter, assignedOnly)
  )
  const { data: summary, refetch: refetchSummary } = useQuery('status-summary', fetchStatusSummary)
  const { data: activities, refetch: refetchActivities } = useQuery('recent-activity', fetchRecentActivity)

  const canCreate = session?.user?.role === 'user' || session?.user?.role === 'admin'
  const isAdmin = session?.user?.role === 'admin'
  const isAgent = session?.user?.role === 'agent'

  useEffect(() => {
    if (!socket) return

    const handleTicketEvent = (data: any) => {
      // Refresh data when ticket events occur
      refetchTickets()
      refetchSummary()
      refetchActivities()
    }

    socket.on('tickets:created', handleTicketEvent)
    socket.on('tickets:updated', handleTicketEvent)
    socket.on('tickets:activity', handleTicketEvent)

    return () => {
      socket.off('tickets:created', handleTicketEvent)
      socket.off('tickets:updated', handleTicketEvent)
      socket.off('tickets:activity', handleTicketEvent)
    }
  }, [socket, refetchTickets, refetchSummary, refetchActivities])

  const statusOptions = [
    { label: 'All', value: '' },
    { label: 'Open', value: 'open' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Resolved', value: 'resolved' },
  ]

  const summaryTotals = {
    total: summary ? (summary.open + summary.in_progress + summary.resolved) : (tickets?.length || 0),
    open: summary?.open ?? 0,
    inProgress: summary?.in_progress ?? 0,
    resolved: summary?.resolved ?? 0,
  }

  const drawerNavItems = [
    {
      key: 'dashboard',
      title: 'Dashboard overview',
      subtitle: 'Scroll to activity',
      glyph: '🏠',
      onPress: () => {
        setNavDrawerOpen(false)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      },
    },
    {
      key: 'user-report',
      title: 'My report',
      subtitle: 'Personal ticket stats',
      glyph: '🧾',
      onPress: () => {
        setNavDrawerOpen(false)
        navigate('/user-report')
      },
    },
    {
      key: 'reports',
      title: 'Reports table',
      subtitle: 'Filter + export',
      glyph: '📊',
      onPress: () => {
        setNavDrawerOpen(false)
        navigate('/reports')
      },
    },
  ]

  if (isAgent || isAdmin) {
    drawerNavItems.push({
      key: 'agent-workload',
      title: 'Agent workload',
      subtitle: 'Assignments heatmap',
      glyph: '📈',
      onPress: () => {
        setNavDrawerOpen(false)
        navigate('/agent-workload')
      },
    })
  }

  if (isAdmin) {
    drawerNavItems.push(
      {
        key: 'status-summary',
        title: 'Org snapshot',
        subtitle: 'Status & escalations',
        glyph: '🏢',
        onPress: () => {
          setNavDrawerOpen(false)
          navigate('/status-summary')
        },
      },
      {
        key: 'allocation-dashboard',
        title: 'Allocation dashboard',
        subtitle: 'Live workload',
        glyph: '🎯',
        onPress: () => {
          setNavDrawerOpen(false)
          navigate('/allocation-dashboard')
        },
      },
      {
        key: 'user-management',
        title: 'User management',
        subtitle: 'Manage members',
        glyph: '👥',
        onPress: () => {
          setNavDrawerOpen(false)
          navigate('/users')
        },
      }
    )
  }

  const handleNotificationPress = () => {
    setNotificationsOpen(!notificationsOpen)
  }

  const closeNotificationsDrawer = () => {
    setNotificationsOpen(false)
  }

  const toggleNavDrawer = () => {
    setNavDrawerOpen(!navDrawerOpen)
  }

  const closeNavDrawer = () => {
    setNavDrawerOpen(false)
  }

  const onRefresh = () => {
    refetchTickets()
    refetchSummary()
    refetchActivities()
  }

  const formatStatus = (status: string) => {
    return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="dashboard-root">
      <div className="dashboard-bg">
        <div className="bl bl-1"></div>
        <div className="bl bl-2"></div>
        <div className="bl bl-3"></div>
      </div>

      <div className="dashboard-content">
        {/* Hero Card */}
        <div className="hero-card">
          <div className="hero-top-row">
            <button className="menu-button" onClick={toggleNavDrawer}>
              <span className="menu-glyph">☰</span>
            </button>
            <div className="hero-copy">
              <div className="hero-eyebrow">Command center</div>
              <h1 className="title">
                {session?.user ? `Hi, ${session.user.name.split(' ')[0]}` : 'Help Desk'}
              </h1>
            </div>
            <div className="header-actions">
              <button className="icon-button" onClick={handleNotificationPress}>
                <span className="icon-glyph">🔔</span>
                {notifications.length > 0 && (
                  <div className="icon-badge">
                    <span className="icon-badge-text">
                      {notifications.length > 9 ? '9+' : notifications.length}
                    </span>
                  </div>
                )}
              </button>
              <button className="sign-out" onClick={signOut}>
                <span className="sign-out-text">Sign out</span>
              </button>
            </div>
          </div>
          <p className="subtitle">
            Monitor tickets, workload, and signals in one sleek view.
          </p>
          <div className="hero-stats-row">
            {[
              { label: 'Open', value: summaryTotals.open, hint: 'Active queue' },
              { label: 'In progress', value: summaryTotals.inProgress, hint: 'Being handled' },
              { label: 'Resolved', value: summaryTotals.resolved, hint: 'Closed' },
              { label: 'Total', value: summaryTotals.total, hint: 'Tracked' },
            ].map((stat) => (
              <div key={stat.label} className="hero-stat-card">
                <div className="hero-stat-label">{stat.label}</div>
                <div className="hero-stat-value">{stat.value}</div>
                <div className="hero-stat-hint">{stat.hint}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Control Panel */}
        <div className="control-panel">
          <div className="filter-tabs">
            {statusOptions.map((filter) => {
              const isActive = statusFilter === filter.value
              return (
                <button
                  key={filter.label}
                  className={`filter-chip ${isActive ? 'filter-chip-active' : ''}`}
                  onClick={() => setStatusFilter(filter.value)}
                >
                  <span className={`filter-chip-text ${isActive ? 'filter-chip-text-active' : ''}`}>
                    {filter.label}
                  </span>
                </button>
              )
            })}
          </div>
          {(isAgent || isAdmin) && (
            <div className="switch-row">
              <label className="switch-label" htmlFor="assigned-switch">Assigned to me</label>
              <label className="switch">
                <input
                  id="assigned-switch"
                  type="checkbox"
                  checked={assignedOnly}
                  onChange={(e) => setAssignedOnly(e.target.checked)}
                />
                <span className="slider"></span>
              </label>
            </div>
          )}
        </div>

        {/* Snapshot Row */}
        <div className="snapshot-row">
          <div className="snapshot-card">
            <div className="snapshot-header">
              <div>
                <h3 className="section-heading">Status snapshot</h3>
                <div className="snapshot-meta">
                  {isAdmin ? 'Organization' : 'Personal'} view
                </div>
              </div>
              <Link to="/reports/table" className="text-link">
                <span className="text-link-label">Open reports</span>
              </Link>
            </div>
            <div className="snapshot-metrics">
              {[
                { label: 'Total', value: summaryTotals.total },
                { label: 'Open', value: summaryTotals.open },
                { label: 'In progress', value: summaryTotals.inProgress },
                { label: 'Resolved', value: summaryTotals.resolved },
              ].map((metric) => (
                <div key={metric.label} className="summary-chip">
                  <div className="summary-chip-label">{metric.label}</div>
                  <div className="summary-chip-value">{metric.value}</div>
                </div>
              ))}
            </div>
            {isAdmin && summary?.assignments && summary.assignments.length > 0 && (
              <div className="assignment-list">
                {summary.assignments.slice(0, 3).map((assignment: any, index: number) => (
                  <div key={assignment.agent?.id || index} className="assignment-row">
                    <span className="assignment-name">{assignment.agent?.name || 'Unknown'}</span>
                    <span className="assignment-count">{assignment.count}</span>
                  </div>
                ))}
                {summary.assignments.length > 3 && (
                  <div className="assignment-more">
                    +{summary.assignments.length - 3} more agents
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="activity-panel">
            <div className="snapshot-header">
              <div>
                <h3 className="section-heading">Live activity</h3>
                <div className="snapshot-meta">Latest updates</div>
              </div>
              <button className="text-link" onClick={handleNotificationPress}>
                <span className="text-link-label">Inbox</span>
              </button>
            </div>
            {activities && activities.length > 0 ? (
              activities.slice(0, 3).map((entry: any) => (
                <div key={entry.id} className="activity-item">
                  <div className="activity-actor">{entry.actor?.name || 'Unknown'}</div>
                  <div className="activity-copy">{entry.description}</div>
                  <div className="activity-meta">
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </div>
                </div>
              ))
            ) : (
              <div className="activity-empty">
                Real-time updates will appear as tickets evolve.
              </div>
            )}
          </div>
        </div>

        {/* Tickets Section */}
        <h3 className="section-heading">Tickets</h3>
        {ticketsLoading ? (
          <div className="loading">Loading tickets...</div>
        ) : tickets && tickets.length > 0 ? (
          <div className="ticket-list">
            {tickets.map((ticket: any) => (
              <div key={ticket.id} className="ticket-card">
                <div className="ticket-card-header">
                  <span className="ticket-id">#{ticket.id.slice(0, 8)}</span>
                  <div className={`status-pill status-${ticket.status}`}>
                    <span className="status-text">{formatStatus(ticket.status)}</span>
                  </div>
                </div>
                <div className="ticket-description">{ticket.description}</div>
                <div className="ticket-meta-row">
                  <span className="meta-text">Priority: {ticket.priority}</span>
                  <span className="meta-text">Type: {ticket.issueType}</span>
                </div>
                <div className="meta-subtext">
                  {ticket.assignee ? `Assigned to ${ticket.assignee.name}` : 'Unassigned'}
                </div>
                <div className="actions">
                  <Link to={`/tickets/${ticket.id}`} className="cta">View</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-title">No tickets found</div>
            <div className="empty-subtitle">
              {canCreate
                ? 'Try a different filter or create a new ticket below.'
                : 'Try a different filter or request access from an admin.'}
            </div>
          </div>
        )}

        {/* Create Ticket Button */}
        {canCreate && (
          <Link to="/tickets/new" className="primary-cta">
            <span className="primary-text">Create Ticket</span>
          </Link>
        )}
      </div>

      {/* Navigation Drawer */}
      {navDrawerOpen && (
        <>
          <div className="nav-drawer-overlay" onClick={closeNavDrawer}>
            <div className="nav-drawer-panel">
              <div className="nav-drawer-header">
                <button className="nav-drawer-back-button" onClick={closeNavDrawer}>
                  <span className="nav-drawer-back-glyph">←</span>
                </button>
                <div className="nav-drawer-header-copy">
                  <div className="nav-drawer-title">Quick sections</div>
                  <div className="nav-drawer-subtitle">Navigate rapidly</div>
                </div>
              </div>
              {drawerNavItems.map((item) => (
                <button
                  key={item.key}
                  className="nav-drawer-item"
                  onClick={item.onPress}
                >
                  <span className="nav-drawer-glyph">{item.glyph}</span>
                  <div className="nav-drawer-copy">
                    <div className="nav-drawer-item-title">{item.title}</div>
                    <div className="nav-drawer-item-subtitle">{item.subtitle}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Notifications Drawer */}
      {notificationsOpen && (
        <div className="drawer-overlay">
          <div className="drawer-backdrop" onClick={closeNotificationsDrawer}></div>
          <div className="notifications-drawer">
            <div className="drawer-header">
              <div>
                <div className="notifications-title">Notifications</div>
                <div className="notifications-meta">
                  {notifications.length > 0
                    ? `${notifications.length} new notification${notifications.length > 1 ? 's' : ''}`
                    : 'You are all caught up.'}
                </div>
              </div>
              <button className="close-drawer-text" onClick={closeNotificationsDrawer}>
                Close
              </button>
            </div>
            <div className="drawer-scroll">
              <div className="drawer-content">
                {notifications.length === 0 ? (
                  <div className="notifications-empty">
                    Real-time updates will appear here once new activity comes in.
                  </div>
                ) : (
                  notifications.map((entry: any) => (
                    <div key={entry.id} className="notification-row">
                      <div className="notification-copy">
                        <div className="notification-text">{entry.actor}</div>
                        <div className="notification-sub">{entry.summary}</div>
                      </div>
                      <div className="notification-meta">
                        <div className="notification-time">
                          {new Date(entry.createdAt).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
