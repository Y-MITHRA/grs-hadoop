

import React, { useState } from 'react';
import { Bell, Menu, X } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import shield from '../assets/shield.png';

const NavBar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <nav className="navbar navbar-expand-md navbar-dark bg-primary shadow">
      <div className="container">
        {/* Logo */}
        <a className="navbar-brand d-flex align-items-center" href="#">
          <img
            src={shield}
            alt="Logo"
            className="d-inline-block align-top me-2"
            width="40"
            height="40"
            style={{ borderRadius: '4px' }}
          />
          <span className="fw-bold d-none d-md-inline">
            <Link to="/" className="text-white" style={{ textDecoration: 'none' }}>
              Grievance Portal
            </Link>
          </span>
        </a>

        {/* Mobile Menu Button */}
        <button
          className="navbar-toggler"
          type="button"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-controls="navbarContent"
          aria-expanded={isMenuOpen ? 'true' : 'false'}
          aria-label="Toggle navigation"
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {/* Navigation Links and Buttons */}
        <div className={`collapse navbar-collapse ${isMenuOpen ? 'show' : ''}`} id="navbarContent">
          <ul className="navbar-nav me-auto mb-2 mb-md-0">
            <li className="nav-item">

              <Link className="nav-link active" aria-current="page" to="/">Home</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/about">About</Link>
            </li>
            <li className="nav-item">
              <Link className="nav-link" to="/contact">Contact</Link>
            </li>
          </ul>

          <div className="d-flex align-items-center">
            {/* Notification Icon */}
            <div className="position-relative me-3 cursor-pointer">
              <Bell size={22} className="text-white" />
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                3<span className="visually-hidden">unread notifications</span>
              </span>
            </div>

            {/* Auth Buttons */}
            <div className="d-flex">
              <button className="btn btn-outline-light me-2" onClick={() => navigate('/login')}>Login</button>
              <button className="btn btn-warning" onClick={() => navigate('/register')}>Register</button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default NavBar;
