import React, { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../store/auth'

export default function Header() {
  const { session, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSignOut = () => {
    signOut()
    navigate('/')
  }

  const isActive = (path: string) => location.pathname === path

  const userMenuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { path: '/tickets', label: 'My Tickets', icon: '🎫' },
    { path: '/tickets/new', label: 'Create Ticket', icon: '➕' },
    { path: '/reports', label: 'Reports', icon: '📊' },
    { path: '/user-report', label: 'My Report', icon: '📈' },
    { path: '/settings', label: 'Settings', icon: '⚙️' },
  ]

  const agentMenuItems = [
    ...userMenuItems,
    { path: '/agent-workload', label: 'Workload', icon: '📋' },
  ]

  const adminMenuItems = [
    ...agentMenuItems,
    { path: '/status-summary', label: 'Org Summary', icon: '🏢' },
    { path: '/allocation-dashboard', label: 'Allocation', icon: '🎯' },
    { path: '/users', label: 'Users', icon: '👥' },
  ]

  const getMenuItems = () => {
    if (!session?.user) return []
    switch (session.user.role) {
      case 'admin': return adminMenuItems
      case 'agent': return agentMenuItems
      default: return userMenuItems
    }
  }

  const menuItems = getMenuItems()

  return (
    <header className="app-header">
      <div className="header-bg">
        <div className="header-blob hb-1" />
        <div className="header-blob hb-2" />
      </div>

      <div className="header-content">
        <div className="header-left">
          <Link to="/dashboard" className="header-logo">
            HelpDesk
          </Link>
        </div>

        <nav className="header-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-link ${isActive(item.path) ? 'nav-link-active' : ''}`}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-text">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="header-right">
          {session?.user && (
            <div className="user-menu">
              <div className="user-info">
                <span className="user-name">{session.user.name.split(' ')[0]}</span>
                <span className="user-role">{session.user.role}</span>
              </div>
              <button className="logout-btn" onClick={handleSignOut}>
                <span className="logout-icon">🚪</span>
                <span className="logout-text">Logout</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="mobile-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          <span className="menu-icon">{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMenuOpen(false)}>
          <div className="mobile-menu-panel" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="mobile-user-info">
                <div className="mobile-user-name">{session?.user?.name}</div>
                <div className="mobile-user-role">{session?.user?.role}</div>
              </div>
            </div>
            <nav className="mobile-nav">
              {menuItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`mobile-nav-link ${isActive(item.path) ? 'mobile-nav-link-active' : ''}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="mobile-nav-icon">{item.icon}</span>
                  <span className="mobile-nav-text">{item.label}</span>
                </Link>
              ))}
              <button className="mobile-logout-btn" onClick={handleSignOut}>
                <span className="mobile-logout-icon">🚪</span>
                <span className="mobile-logout-text">Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}
    </header>
  )
}