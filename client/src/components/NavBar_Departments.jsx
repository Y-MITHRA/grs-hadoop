

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
      </div>
    </nav>
  );
};

export default NavBar;
