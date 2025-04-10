import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, LogOut, Settings, ChevronDown } from 'lucide-react';
import { Dropdown } from 'react-bootstrap';

const UserInfo = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) {
        return (
            <div className="d-flex">
                <button className="btn btn-outline-light me-2" onClick={() => navigate('/login')}>
                    Login
                </button>
                <button className="btn btn-warning" onClick={() => navigate('/register')}>
                    Register
                </button>
            </div>
        );
    }

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleProfileClick = () => {
        if (!user) return;

        if (user.role === 'petitioner') {
            navigate('/petitioner/dashboard');
        } else if (user.role === 'official') {
            switch (user.department?.toLowerCase()) {
                case 'water':
                    navigate('/official-dashboard/water');
                    break;
                case 'rto':
                    navigate('/official-dashboard/rto');
                    break;
                case 'electricity':
                    navigate('/official-dashboard/electricity');
                    break;
                default:
                    navigate('/profile');
            }
        } else if (user.role === 'admin') {
            navigate('/admin/dashboard');
        } else {
            navigate('/profile');
        }
    };

    const handleSettingsClick = () => {
        if (!user) return;

        if (user.role === 'petitioner') {
            navigate('/petitioner/settings');
        } else if (user.role === 'official') {
            navigate('/official/settings');
        } else if (user.role === 'admin') {
            navigate('/admin/settings');
        }
    };

    const getUserDisplayName = () => {
        if (user.name) return user.name;
        if (user.employeeId) return `Official ${user.employeeId}`;
        if (user.adminId) return `Admin ${user.adminId}`;
        return user.email;
    };

    return (
        <Dropdown>
            <Dropdown.Toggle variant="light" className="d-flex align-items-center">
                <User size={20} className="me-2" />
                <span className="me-1">{getUserDisplayName()}</span>
                <span className="badge bg-secondary me-2">{user.role === 'official' ? user.department : user.role}</span>
                <ChevronDown size={16} />
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <Dropdown.Item href="#" onClick={handleProfileClick}>
                    <User size={16} className="me-2" />
                    Profile
                </Dropdown.Item>
                <Dropdown.Item href="#" onClick={handleSettingsClick}>
                    <Settings size={16} className="me-2" />
                    Settings
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={handleLogout} className="text-danger">
                    <LogOut size={16} className="me-2" />
                    Logout
                </Dropdown.Item>
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default UserInfo;
