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
        console.log('Tab clicked:', tab);
        if (onTabChange) {
            onTabChange(tab);
        }
    };

    return (
        <div className={`bg-dark p-2 shadow-sm ${sidebarOpen ? "w-15" : "w-auto"} vh-100`} style={{ minWidth: sidebarOpen ? '200px' : '50px' }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <h6
                    className={sidebarOpen ? "d-block mb-0" : "d-none"}
                    style={{ color: "white" }}
                >Admin Panel</h6>
                <Button variant="light" size="sm" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X size={18} /> : <List size={18} />}
                </Button>
            </div>

            <ul className="nav flex-column gap-2">
                <li className="nav-item">
                    <Button
                        onClick={() => handleTabClick('dashboard')}
                        className={`nav-link d-flex align-items-center w-100 ${activeTab === 'dashboard' ? 'bg-primary text-white' : 'text-white-50'}`}
                        variant={activeTab === 'dashboard' ? 'primary' : 'link'}
                    >
                        <List size={18} className="me-2" />
                        {sidebarOpen && "Dashboard"}
                    </Button>
                </li>
                <li className="nav-item">
                    <Button
                        onClick={() => handleTabClick('escalated')}
                        className={`nav-link d-flex align-items-center w-100 ${activeTab === 'escalated' ? 'bg-primary text-white' : 'text-white-50'}`}
                        variant={activeTab === 'escalated' ? 'primary' : 'link'}
                    >
                        <AlertTriangle size={18} className="me-2" />
                        {sidebarOpen && "Escalated Cases"}
                    </Button>
                </li>
                <li className="nav-item">
                    <Link
                        to="/admin/resource-management"
                        className={`nav-link d-flex align-items-center ${isActive('/admin/resource-management') ? 'text-white' : 'text-white-50'}`}
                    >
                        <Database size={18} className="me-2" />
                        {sidebarOpen && "Resource Management"}
                    </Link>
                </li>
                <li className="nav-item">
                    <Link
                        to="/admin/settings"
                        className={`nav-link d-flex align-items-center ${isActive('/admin/settings') ? 'text-white' : 'text-white-50'}`}
                    >
                        <Bell size={18} className="me-2" />
                        {sidebarOpen && "Settings"}
                    </Link>
                </li>
                <li className="nav-item mt-auto">
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
