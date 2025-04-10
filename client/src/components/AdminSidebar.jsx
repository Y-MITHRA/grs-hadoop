import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from 'react-bootstrap';
import { List, X, Database, User, ChevronDown, Bell, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const AdminSidebar = ({ activeTab, onTabChange }) => {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const location = useLocation();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const isActive = (path) => {
        return location.pathname === path;
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleTabClick = (tab) => {
        onTabChange(tab);
    };

    return (
        <div className={`bg-black p-2 shadow-sm ${sidebarOpen ? "w-15" : "w-auto"} vh-100`} style={{ minWidth: sidebarOpen ? '200px' : '50px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6
                    className={sidebarOpen ? "d-block mb-0" : "d-none"}
                    style={{ color: "white" }}
                >Admin Panel</h6>
                <Button variant="light" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X size={18} /> : <List size={18} />}
                </Button>
            </div>

            <ul className="nav flex-column gap-1">
                <li className="nav-item">
                    <button
                        onClick={() => handleTabClick('dashboard')}
                        className={`nav-link d-flex align-items-center w-100 border-0 bg-transparent ${activeTab === 'dashboard' ? 'active text-white' : 'text-white-50'}`}
                    >
                        <List size={18} className="me-2" />
                        {sidebarOpen && "Dashboard"}
                    </button>
                </li>
                <li className="nav-item">
                    <button
                        onClick={() => handleTabClick('escalated')}
                        className={`nav-link d-flex align-items-center w-100 border-0 bg-transparent ${activeTab === 'escalated' ? 'active text-white' : 'text-white-50'}`}
                    >
                        <AlertTriangle size={18} className="me-2" />
                        {sidebarOpen && "Escalated Cases"}
                    </button>
                </li>
                <li className="nav-item">
                    <Link
                        to="/admin/resource-management"
                        className={`nav-link d-flex align-items-center ${isActive('/admin/resource-management') ? 'active text-white' : 'text-white-50'}`}
                    >
                        <Database size={18} className="me-2" />
                        {sidebarOpen && "Resource Management"}
                    </Link>
                </li>
                <li className="nav-item">
                    <Link
                        to="/admin/settings"
                        className={`nav-link d-flex align-items-center ${isActive('/admin/settings') ? 'active text-white' : 'text-white-50'}`}
                    >
                        <Bell size={18} className="me-2" />
                        {sidebarOpen && "Settings"}
                    </Link>
                </li>
                <li className="nav-item">
                    <Button
                        variant="link"
                        className="nav-link text-danger d-flex align-items-center p-0 ps-2"
                        onClick={handleLogout}
                    >
                        <X size={18} className="me-2" />
                        {sidebarOpen && "Logout"}
                    </Button>
                </li>
            </ul>
        </div>
    );
};

export default AdminSidebar;
