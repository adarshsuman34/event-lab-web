import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../App';
import {
  Calendar, CalendarDays, Plus, Search, LayoutDashboard, Shield, Menu, X,
  LogOut, User, ChevronDown, Sparkles
} from 'lucide-react';
import './Navbar.css';

export default function Navbar() {
  const { user, logout, openAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  // The dropdown unmounts on sign-out but its open flag survived, so the next
  // sign-in rendered the menu already expanded without the user opening it.
  useEffect(() => {
    setProfileOpen(false);
  }, [user?.id]);

  const navLinks = [
    { path: '/', label: 'Explore', icon: <Search size={18} /> },
    { path: '/events', label: 'Events', icon: <CalendarDays size={18} /> },
    { path: '/calendar', label: 'Calendar', icon: <Calendar size={18} /> },
  ];

  if (user) {
    navLinks.push({ path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> });
  }

  if (user && user.role === 'admin') {
    navLinks.push({ path: '/admin', label: 'Admin', icon: <Shield size={18} /> });
  }

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`} id="main-navbar">
      <div className="navbar-inner container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" id="navbar-logo">
          <div className="navbar-logo-icon">
            <Sparkles size={22} />
          </div>
          <span className="navbar-logo-text">
            Event<span className="navbar-logo-accent">Lab</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="navbar-links">
          {navLinks.map(link => (
            <Link
              key={link.path}
              to={link.path}
              className={`navbar-link ${location.pathname === link.path ? 'active' : ''}`}
              id={`nav-link-${link.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {link.icon}
              <span>{link.label}</span>
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="navbar-actions">
          {user && (
            <button
              className="btn btn-primary btn-create"
              onClick={() => navigate('/create')}
              id="btn-create-event"
            >
              <Plus size={18} />
              <span>Post Event</span>
            </button>
          )}

          {user ? (
            <div className="navbar-profile" ref={profileRef}>
              <button
                type="button"
                className="navbar-profile-btn"
                onClick={() => setProfileOpen(!profileOpen)}
                aria-expanded={profileOpen}
                aria-haspopup="menu"
                id="btn-profile"
              >
                <img src={user.avatar} alt={user.name} className="navbar-avatar" />
                <span className="navbar-username">{user.name.split(' ')[0]}</span>
                <ChevronDown size={14} className={`navbar-chevron ${profileOpen ? 'rotated' : ''}`} />
              </button>

              {profileOpen && (
                <div className="navbar-dropdown animate-scale-in" id="profile-dropdown">
                  <div className="navbar-dropdown-header">
                    <img src={user.avatar} alt={user.name} className="navbar-dropdown-avatar" />
                    <div>
                      <p className="navbar-dropdown-name">{user.name}</p>
                      <p className="navbar-dropdown-email">{user.email}</p>
                    </div>
                  </div>
                  <div className="navbar-dropdown-divider" />
                  <Link to="/dashboard" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)} id="dropdown-dashboard">
                    <LayoutDashboard size={16} />
                    <span>My Dashboard</span>
                  </Link>
                  <Link to="/create" className="navbar-dropdown-item" onClick={() => setProfileOpen(false)} id="dropdown-create">
                    <Plus size={16} />
                    <span>Post Event</span>
                  </Link>
                  <div className="navbar-dropdown-divider" />
                  <button className="navbar-dropdown-item navbar-dropdown-logout" onClick={logout} id="btn-logout">
                    <LogOut size={16} />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="navbar-auth-buttons">
              <button className="btn btn-ghost" onClick={() => openAuth('login')} id="btn-login">
                Sign In
              </button>
              <button className="btn btn-primary" onClick={() => openAuth('signup')} id="btn-signup">
                Sign Up
              </button>
            </div>
          )}

          {/* Mobile Toggle */}
          <button
            type="button"
            className="navbar-mobile-toggle"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            id="btn-mobile-menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div className="navbar-mobile animate-fade-in" id="mobile-menu">
          <div className="navbar-mobile-links">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`navbar-mobile-link ${location.pathname === link.path ? 'active' : ''}`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            ))}
            {user && (
              <Link to="/create" className="navbar-mobile-link">
                <Plus size={18} />
                <span>Post Event</span>
              </Link>
            )}
          </div>

          {!user && (
            <div className="navbar-mobile-auth">
              <button
                type="button"
                className="btn btn-secondary btn-lg"
                onClick={() => { setMobileOpen(false); openAuth('login'); }}
                id="btn-mobile-login"
              >
                Sign In
              </button>
              <button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={() => { setMobileOpen(false); openAuth('signup'); }}
                id="btn-mobile-signup"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
