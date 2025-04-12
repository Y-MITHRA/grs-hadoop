import React, { useState } from 'react';
import { Bell, Menu, X, User, Settings, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import shield from '../assets/shield.png';
import UserInfo from './UserInfo';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './NotificationBell';
import { Dropdown } from 'react-bootstrap';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getDashboardPath = () => {
    if (!user) return '/';

    switch (user.role?.toLowerCase()) {
      case 'admin':
        return '/admin/dashboard';
      case 'official':
        switch (user.department?.toLowerCase()) {
          case 'rto':
            return '/official-dashboard/rto';
          case 'water':
            return '/official-dashboard/water';
          case 'electricity':
            return '/official-dashboard/electricity';
          default:
            return '/official-dashboard';
        }
      case 'petitioner':
        return '/petitioner-dashboard';
      default:
        return '/';
    }
  };

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-primary shadow sticky-top">
      <div className="container">
        {/* Logo */}
        <Link to="/" className="navbar-brand d-flex align-items-center text-white" style={{ textDecoration: 'none' }}>
          <img
            src={shield}
            alt="Logo"
            className="d-inline-block align-top me-2"
            width="40"
            height="40"
            style={{ borderRadius: '4px' }}
          />
          <span className="fw-bold d-none d-md-inline">
            Grievance Portal
          </span>
        </Link>

        {/* Mobile Menu Button */}
        <button
          className="navbar-toggler border-0"
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-controls="navbarContent"
          aria-expanded={isMenuOpen ? 'true' : 'false'}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <X size={24} className="text-white" /> : <Menu size={24} className="text-white" />}
        </button>

        {/* Navigation Links and Buttons */}
        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-md-0">
            {user && (
              <li className="nav-item">
                <Link className="nav-link active" aria-current="page" to={getDashboardPath()}>Dashboard</Link>
              </li>
            )}
            <li className="nav-item">
              <Link className="nav-link" to="/about">About</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/contact">Contact</Link>
            </li>
          </ul>

          <div className="d-flex align-items-center gap-3">
            {/* Notification Bell - Only show for logged-in users */}
            {user && (
              <div className="position-relative cursor-pointer">
                <NotificationBell
                  userId={user.id}
                  userRole={user.role}
                />
              </div>
            )}

            {/* User Profile Dropdown */}
            {user && (
              <Dropdown>
                <Dropdown.Toggle variant="light" id="dropdown-basic" className="d-flex align-items-center">
                  <User size={16} className="me-2" />
                  {user.email}
                  {user.department && (
                    <span className="badge bg-secondary ms-2">{user.department}</span>
                  )}
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item as={Link} to={getDashboardPath()}>
                    <User size={16} className="me-2" />
                    Dashboard
                  </Dropdown.Item>
                  <Dropdown.Item as={Link} to="/settings">
                    <Settings size={16} className="me-2" />
                    Settings
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={handleLogout}>
                    <LogOut size={16} className="me-2" />
                    Logout
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            )}

            {/* Login/Register Buttons for non-logged-in users */}
            {!user && (
              <div className="d-flex gap-2">
                <Link to="/login" className="btn btn-outline-light btn-sm">
                  Login
                </Link>
                <Link to="/register" className="btn btn-light btn-sm">
                  Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
