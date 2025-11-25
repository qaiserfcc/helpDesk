import React from 'react'
import { Link } from 'react-router-dom'
import '../styles/landing.css'

export default function LandingPage() {
  return (
    <div className="landing-root">
      <div className="landing-bg">
        <div className="blob bl-1" />
        <div className="blob bl-2" />
        <div className="blob bl-3" />
      </div>

      <header className="landing-header">
        <div className="logo">HelpDesk</div>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/tickets">Tickets</Link>
          <Link to="/login" className="cta small">Login</Link>
          <Link to="/register" className="cta">Get Started</Link>
        </nav>
      </header>

      <main className="landing-main">
        <div className="hero">
          <div className="hero-copy">
            <h1 className="hero-title">Support that feels effortless</h1>
            <p className="hero-sub">
              HelpDesk brings effortless ticket management and smart routing with
              a modern, real-time experience for your team and customers.
            </p>
            <div className="hero-ctas">
              <Link to="/register" className="cta large">Get Started — Free</Link>
              <Link to="/login" className="cta alt">Sign in</Link>
            </div>
          </div>

          <div className="hero-card glass">
            <div className="card-header">Live Demo</div>
            <div className="card-body">
              <div className="card-row">
                <div className="metric">
                  <div className="metric-val">2.3k</div>
                  <small>Tickets resolved</small>
                </div>
                <div className="metric">
                  <div className="metric-val">99%</div>
                  <small>SLA compliance</small>
                </div>
              </div>
              <div className="card-row">
                <div className="timeline">
                  <div className="timeline-item">New ticket • 2m ago</div>
                  <div className="timeline-item">Assigned to Jane</div>
                  <div className="timeline-item">Resolved</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="features">
          <div className="feature">
            <div className="feature-title">Real-time updates</div>
            <p>Instant ticket updates across web & mobile using WebSockets.</p>
          </div>
          <div className="feature">
            <div className="feature-title">Smart routing</div>
            <p>Automatically route tickets to the right agent or team.</p>
          </div>
          <div className="feature">
            <div className="feature-title">Analytics</div>
            <p>Rich reports to track SLA and agent productivity.</p>
          </div>
        </section>
      </main>

      <footer className="landing-footer">© {new Date().getFullYear()} HelpDesk — Built with care</footer>
    </div>
  )
}
