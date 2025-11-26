import React from 'react'

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="footer-content">
        <div className="footer-left">
          <div className="footer-logo">HelpDesk</div>
          <p className="footer-tagline">Support that feels effortless</p>
        </div>
        <div className="footer-center">
          <div className="footer-links">
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">Terms of Service</a>
            <a href="#" className="footer-link">Help Center</a>
          </div>
        </div>
        <div className="footer-right">
          <p className="footer-copyright">
            © {new Date().getFullYear()} HelpDesk — Built with care
          </p>
        </div>
      </div>
    </footer>
  )
}